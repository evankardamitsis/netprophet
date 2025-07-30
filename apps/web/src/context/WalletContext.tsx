'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadFromSessionStorage, saveToSessionStorage, SESSION_KEYS } from '@/lib/sessionStorage';
import { BetsService } from '@netprophet/lib';

export interface Transaction {
    id: string;
    type: 'bet' | 'win' | 'loss' | 'welcome_bonus' | 'daily_login' | 'referral' | 'leaderboard' | 'purchase' | 'tournament_entry' | 'insight_unlock';
    amount: number;
    description: string;
    timestamp: Date;
}

export interface UserWallet {
    balance: number;
    totalWinnings: number;
    totalLosses: number;
    netProfit: number;
    winRate: number;
    totalBets: number;
    wonBets: number;
    lostBets: number;
    recentTransactions: Transaction[];
    // Coin system specific fields
    dailyLoginStreak: number;
    totalCoinsEarned: number;
    totalCoinsSpent: number;
    referralBonusEarned: number;
    leaderboardPrizesEarned: number;
    hasReceivedWelcomeBonus: boolean;
}

interface WalletContextType {
    wallet: UserWallet;
    placeBet: (amount: number, matchId: number, description: string) => Promise<void>;
    recordWin: (stake: number, odds: number, description: string) => void;
    recordLoss: (stake: number, description: string) => void;
    updateBalance: (amount: number, type: Transaction['type'], description: string) => void;
    // Coin system functions
    checkDailyLogin: () => Promise<number>;
    claimWelcomeBonus: () => Promise<number>;
    addReferralBonus: (amount: number) => void;
    addLeaderboardPrize: (amount: number) => void;
    purchaseItem: (cost: number, itemName: string) => void;
    enterTournament: (cost: number, tournamentName: string) => void;
    unlockInsight: (cost: number, insightName: string) => void;
    loadBetStats: () => Promise<void>;
}

const defaultWallet: UserWallet = {
    balance: 1000, // Starting balance
    totalWinnings: 0,
    totalLosses: 0,
    netProfit: 0,
    winRate: 0,
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    recentTransactions: [],
    dailyLoginStreak: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    referralBonusEarned: 0,
    leaderboardPrizesEarned: 0,
    hasReceivedWelcomeBonus: false,
};

export const COIN_CONSTANTS = {
    WELCOME_BONUS: 250,
    DAILY_LOGIN_BASE: 25,
    DAILY_LOGIN_STREAK_BONUS: 5,
    MIN_BET: 10,
    MAX_BET: 1000,
    REFERRAL_BONUS: 250,
    LEADERBOARD_PRIZE_MIN: 300,
    LEADERBOARD_PRIZE_MAX: 1000,
} as const;

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [wallet, setWallet] = useState<UserWallet>(() => {
        const storedWallet = loadFromSessionStorage(SESSION_KEYS.WALLET, defaultWallet);

        // Ensure all required fields are present and properly initialized
        const walletWithDefaults = {
            ...defaultWallet,
            ...storedWallet,
            // Ensure these fields are always numbers
            totalCoinsEarned: storedWallet.totalCoinsEarned ?? 0,
            totalCoinsSpent: storedWallet.totalCoinsSpent ?? 0,
            referralBonusEarned: storedWallet.referralBonusEarned ?? 0,
            leaderboardPrizesEarned: storedWallet.leaderboardPrizesEarned ?? 0,
            dailyLoginStreak: storedWallet.dailyLoginStreak ?? 0,
            hasReceivedWelcomeBonus: storedWallet.hasReceivedWelcomeBonus ?? false,
        };

        // Convert timestamp strings back to Date objects
        if (walletWithDefaults.recentTransactions) {
            walletWithDefaults.recentTransactions = walletWithDefaults.recentTransactions.map(transaction => ({
                ...transaction,
                timestamp: new Date(transaction.timestamp)
            }));
        }

        return walletWithDefaults;
    });

    // Load bet statistics from database on mount
    useEffect(() => {
        loadBetStats();
    }, []);

    const loadBetStats = async () => {
        try {
            const betStats = await BetsService.getUserBetStats();
            if (betStats) {
                setWallet(prev => ({
                    ...prev,
                    totalBets: betStats.total_bets,
                    wonBets: betStats.won_bets,
                    lostBets: betStats.lost_bets,
                    totalWinnings: betStats.total_winnings,
                    totalLosses: betStats.total_losses,
                    netProfit: betStats.total_winnings - betStats.total_losses,
                    winRate: betStats.win_rate,
                }));
            }
        } catch (error) {
            console.error('Failed to load bet stats:', error);
        }
    };

    const updateBalance = (amount: number, type: Transaction['type'], description: string) => {
        setWallet(prev => {
            const newBalance = prev.balance + amount;
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type,
                amount,
                description,
                timestamp: new Date(),
            };

            const updatedTransactions = [newTransaction, ...prev.recentTransactions.slice(0, 9)]; // Keep last 10

            let newTotalCoinsEarned = prev.totalCoinsEarned;
            let newTotalCoinsSpent = prev.totalCoinsSpent;

            // Track coin flows
            if (amount > 0) {
                newTotalCoinsEarned += amount;
            } else {
                newTotalCoinsSpent += Math.abs(amount);
            }

            return {
                ...prev,
                balance: newBalance,
                recentTransactions: updatedTransactions,
                totalCoinsEarned: newTotalCoinsEarned,
                totalCoinsSpent: newTotalCoinsSpent,
            };
        });
    };

    const placeBet = async (amount: number, matchId: number, description: string) => {
        if (amount > wallet.balance) {
            throw new Error(`Insufficient balance. You have ${wallet.balance} 🌕 but trying to bet ${amount} 🌕`);
        }

        if (amount < COIN_CONSTANTS.MIN_BET) {
            throw new Error(`Minimum bet amount is ${COIN_CONSTANTS.MIN_BET} 🌕`);
        }

        if (amount > COIN_CONSTANTS.MAX_BET) {
            throw new Error(`Maximum bet amount is ${COIN_CONSTANTS.MAX_BET} 🌕`);
        }

        // Deduct from balance
        updateBalance(-amount, 'bet', description);
    };

    const recordWin = (stake: number, odds: number, description: string) => {
        const winnings = Math.round(stake * odds);
        updateBalance(winnings, 'win', description);

        setWallet(prev => ({
            ...prev,
            totalWinnings: prev.totalWinnings + winnings,
            wonBets: prev.wonBets + 1,
            netProfit: prev.netProfit + winnings,
        }));
    };

    const recordLoss = (stake: number, description: string) => {
        updateBalance(-stake, 'loss', description);

        setWallet(prev => ({
            ...prev,
            totalLosses: prev.totalLosses + stake,
            lostBets: prev.lostBets + 1,
            netProfit: prev.netProfit - stake,
        }));
    };

    const checkDailyLogin = async (): Promise<number> => {
        const today = new Date().toDateString();
        const lastLoginKey = 'last_daily_login';
        const lastLogin = localStorage.getItem(lastLoginKey);

        if (lastLogin === today) {
            return 0; // Already claimed today
        }

        const bonus = COIN_CONSTANTS.DAILY_LOGIN_BASE + (wallet.dailyLoginStreak * COIN_CONSTANTS.DAILY_LOGIN_STREAK_BONUS);

        setWallet(prev => ({
            ...prev,
            dailyLoginStreak: prev.dailyLoginStreak + 1,
        }));

        updateBalance(bonus, 'daily_login', `Daily login bonus (${wallet.dailyLoginStreak + 1} day streak)`);
        localStorage.setItem(lastLoginKey, today);

        return bonus;
    };

    const claimWelcomeBonus = async (): Promise<number> => {
        if (wallet.hasReceivedWelcomeBonus) {
            return 0; // Already claimed
        }

        setWallet(prev => ({
            ...prev,
            hasReceivedWelcomeBonus: true,
        }));

        updateBalance(COIN_CONSTANTS.WELCOME_BONUS, 'welcome_bonus', 'Welcome bonus');
        return COIN_CONSTANTS.WELCOME_BONUS;
    };

    const addReferralBonus = (amount: number) => {
        updateBalance(amount, 'referral', 'Referral bonus');
        setWallet(prev => ({
            ...prev,
            referralBonusEarned: prev.referralBonusEarned + amount,
        }));
    };

    const addLeaderboardPrize = (amount: number) => {
        updateBalance(amount, 'leaderboard', 'Leaderboard prize');
        setWallet(prev => ({
            ...prev,
            leaderboardPrizesEarned: prev.leaderboardPrizesEarned + amount,
        }));
    };

    const purchaseItem = (cost: number, itemName: string) => {
        updateBalance(-cost, 'purchase', `Purchased ${itemName}`);
    };

    const enterTournament = (cost: number, tournamentName: string) => {
        updateBalance(-cost, 'tournament_entry', `Tournament entry: ${tournamentName}`);
    };

    const unlockInsight = (cost: number, insightName: string) => {
        updateBalance(-cost, 'insight_unlock', `Unlocked insight: ${insightName}`);
    };

    // Save wallet to session storage whenever it changes
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.WALLET, wallet);
    }, [wallet]);

    const value: WalletContextType = {
        wallet,
        placeBet,
        recordWin,
        recordLoss,
        updateBalance,
        checkDailyLogin,
        claimWelcomeBonus,
        addReferralBonus,
        addLeaderboardPrize,
        purchaseItem,
        enterTournament,
        unlockInsight,
        loadBetStats,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
} 