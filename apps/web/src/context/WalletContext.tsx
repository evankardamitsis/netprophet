'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { BetsService } from '@netprophet/lib';
import { loadFromSessionStorage, saveToSessionStorage, SESSION_KEYS } from '@/lib/sessionStorage';
import { DailyRewardsService } from '@netprophet/lib';
import { WalletOperationsService } from '@netprophet/lib';

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
    claimDailyLogin: () => Promise<number>;
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

        // Call server-side bet placement
        const result = await WalletOperationsService.placeBet(amount, matchId.toString(), description);

        if (result.success) {
            // Update local wallet state with server response
            setWallet(prev => ({
                ...prev,
                balance: result.data.newBalance,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'bet',
                amount: -amount,
                description,
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsSpent: prev.totalCoinsSpent + amount,
            }));
        }
    };

    const recordWin = async (stake: number, odds: number, description: string) => {
        const winnings = Math.round(stake * odds);

        // Call server-side win recording
        const result = await WalletOperationsService.recordWin(stake, odds, description);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                totalWinnings: prev.totalWinnings + winnings,
                wonBets: prev.wonBets + 1,
                netProfit: prev.netProfit + winnings,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'win',
                amount: winnings,
                description,
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsEarned: prev.totalCoinsEarned + winnings,
            }));
        }
    };

    const recordLoss = async (stake: number, description: string) => {
        // Call server-side loss recording
        const result = await WalletOperationsService.recordLoss(stake, description);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                totalLosses: prev.totalLosses + stake,
                lostBets: prev.lostBets + 1,
                netProfit: prev.netProfit - stake,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'loss',
                amount: -stake,
                description,
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsSpent: prev.totalCoinsSpent + stake,
            }));
        }
    };

    const checkDailyLogin = async (): Promise<number> => {
        try {
            const status = await DailyRewardsService.checkDailyReward();
            return status.can_claim ? status.next_reward_amount : 0;
        } catch (error) {
            console.error('Failed to check daily reward:', error);
            return 0;
        }
    };

    const claimDailyLogin = async (): Promise<number> => {
        try {
            const result = await DailyRewardsService.claimDailyReward();

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: prev.balance + result.reward_amount,
                    dailyLoginStreak: result.new_streak,
                }));

                // Add transaction to local state
                const newTransaction: Transaction = {
                    id: Date.now().toString(),
                    type: 'daily_login',
                    amount: result.reward_amount,
                    description: `Daily login bonus (${result.new_streak} day streak)`,
                    timestamp: new Date(),
                };

                setWallet(prev => ({
                    ...prev,
                    recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                    totalCoinsEarned: prev.totalCoinsEarned + result.reward_amount,
                }));

                return result.reward_amount;
            }

            return 0;
        } catch (error) {
            console.error('Failed to claim daily reward:', error);
            throw error;
        }
    };

    const claimWelcomeBonus = async (): Promise<number> => {
        if (wallet.hasReceivedWelcomeBonus) {
            return 0; // Already claimed
        }

        // Call server-side welcome bonus claim
        const result = await WalletOperationsService.claimWelcomeBonus();

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                hasReceivedWelcomeBonus: true,
                balance: prev.balance + result.data.bonus,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'welcome_bonus',
                amount: result.data.bonus,
                description: 'Welcome bonus',
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsEarned: prev.totalCoinsEarned + result.data.bonus,
            }));

            return result.data.bonus;
        }

        return 0;
    };

    const addReferralBonus = async (amount: number) => {
        // Call server-side referral bonus
        const result = await WalletOperationsService.addReferralBonus(amount);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                balance: prev.balance + amount,
                referralBonusEarned: prev.referralBonusEarned + amount,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'referral',
                amount: amount,
                description: 'Referral bonus',
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsEarned: prev.totalCoinsEarned + amount,
            }));
        }
    };

    const addLeaderboardPrize = async (amount: number) => {
        // Call server-side leaderboard prize
        const result = await WalletOperationsService.addLeaderboardPrize(amount);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                balance: prev.balance + amount,
                leaderboardPrizesEarned: prev.leaderboardPrizesEarned + amount,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'leaderboard',
                amount: amount,
                description: 'Leaderboard prize',
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsEarned: prev.totalCoinsEarned + amount,
            }));
        }
    };

    const purchaseItem = async (cost: number, itemName: string) => {
        // Call server-side purchase
        const result = await WalletOperationsService.purchaseItem(cost, itemName);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                balance: result.data.newBalance,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'purchase',
                amount: -cost,
                description: `Purchased ${itemName}`,
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsSpent: prev.totalCoinsSpent + cost,
            }));
        }
    };

    const enterTournament = async (cost: number, tournamentName: string) => {
        // Call server-side tournament entry
        const result = await WalletOperationsService.enterTournament(cost, tournamentName);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                balance: result.data.newBalance,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'tournament_entry',
                amount: -cost,
                description: `Tournament entry: ${tournamentName}`,
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsSpent: prev.totalCoinsSpent + cost,
            }));
        }
    };

    const unlockInsight = async (cost: number, insightName: string) => {
        // Call server-side insight unlock
        const result = await WalletOperationsService.unlockInsight(cost, insightName);

        if (result.success) {
            // Update local wallet state
            setWallet(prev => ({
                ...prev,
                balance: result.data.newBalance,
            }));

            // Add transaction to local state
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: 'insight_unlock',
                amount: -cost,
                description: `Unlocked insight: ${insightName}`,
                timestamp: new Date(),
            };

            setWallet(prev => ({
                ...prev,
                recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)],
                totalCoinsSpent: prev.totalCoinsSpent + cost,
            }));
        }
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
        claimDailyLogin,
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