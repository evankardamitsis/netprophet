'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
    SESSION_KEYS,
    loadFromSessionStorage,
    saveToSessionStorage
} from '@/lib/sessionStorage';

// User wallet data interface
export interface UserWallet {
    balance: number; // Coins balance
    totalBet: number;
    totalWinnings: number;
    totalLosses: number;
    netProfit: number;
    winRate: number;
    totalPredictions: number;
    successfulPredictions: number;
    recentTransactions: Transaction[];
    // New coin system fields
    dailyLoginStreak: number;
    lastLoginDate: string | null;
    hasReceivedWelcomeBonus: boolean;
    totalCoinsEarned: number;
    totalCoinsSpent: number;
    referralBonusEarned: number;
    leaderboardPrizesEarned: number;
}

export interface Transaction {
    id: string;
    type: 'bet' | 'win' | 'loss' | 'welcome_bonus' | 'daily_login' | 'referral' | 'leaderboard' | 'purchase' | 'tournament_entry' | 'insight_unlock';
    amount: number;
    description: string;
    timestamp: Date;
    matchId?: number;
    odds?: number; // For win calculations
}

interface WalletContextType {
    wallet: UserWallet;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
    updateBalance: (amount: number) => void;
    placeBet: (amount: number, matchId: number, description: string) => void;
    recordWin: (amount: number, matchId: number, description: string, odds?: number) => void;
    recordLoss: (amount: number, matchId: number, description: string) => void;
    calculateStats: () => void;
    resetWallet: () => void;
    // New coin system functions
    checkDailyLogin: () => number; // Returns coins earned
    claimWelcomeBonus: () => number; // Returns coins earned
    addReferralBonus: (referrerId: string) => number; // Returns coins earned
    addLeaderboardPrize: (amount: number, description: string) => void;
    purchaseItem: (amount: number, itemName: string) => void;
    enterTournament: (amount: number, tournamentName: string) => void;
    unlockInsight: (amount: number, insightType: string) => void;
    getDailyLoginReward: () => number; // Calculate daily login reward based on streak
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within WalletProvider');
    return ctx;
}

// Coin system constants
export const COIN_CONSTANTS = {
    WELCOME_BONUS: 250,
    DAILY_LOGIN_BASE: 25,
    DAILY_LOGIN_MAX: 50,
    DAILY_LOGIN_STREAK_BONUS: 5, // +5 coins per day in streak
    REFERRAL_BONUS: 250,
    MIN_BET: 10,
    MAX_BET: 500,
    TOURNAMENT_ENTRY_MIN: 500,
    INSIGHT_UNLOCK_MIN: 100,
} as const;

// Default wallet state
const defaultWallet: UserWallet = {
    balance: 0, // Start with 0, user gets welcome bonus on first login
    totalBet: 0,
    totalWinnings: 0,
    totalLosses: 0,
    netProfit: 0,
    winRate: 0,
    totalPredictions: 0,
    successfulPredictions: 0,
    recentTransactions: [],
    dailyLoginStreak: 0,
    lastLoginDate: null,
    hasReceivedWelcomeBonus: false,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    referralBonusEarned: 0,
    leaderboardPrizesEarned: 0,
};

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

    // Save wallet to session storage whenever it changes
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.WALLET, wallet);
    }, [wallet]);

    const calculateStats = () => {
        setWallet(prev => {
            const netProfit = prev.totalWinnings - prev.totalLosses;
            const winRate = prev.totalPredictions > 0
                ? Math.round((prev.successfulPredictions / prev.totalPredictions) * 100)
                : 0;

            return {
                ...prev,
                netProfit,
                winRate
            };
        });
    };

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: Date.now().toString(),
            timestamp: new Date()
        };

        setWallet(prev => ({
            ...prev,
            recentTransactions: [newTransaction, ...prev.recentTransactions.slice(0, 9)] // Keep only 10 most recent
        }));

        // Recalculate stats after adding transaction
        setTimeout(calculateStats, 0);
    };

    const updateBalance = (amount: number) => {
        setWallet(prev => ({
            ...prev,
            balance: Math.max(0, prev.balance + amount), // Prevent negative balance
            totalCoinsEarned: amount > 0 ? prev.totalCoinsEarned + amount : prev.totalCoinsEarned,
            totalCoinsSpent: amount < 0 ? prev.totalCoinsSpent + Math.abs(amount) : prev.totalCoinsSpent,
        }));
    };

    const placeBet = (amount: number, matchId: number, description: string) => {
        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }

        if (amount < COIN_CONSTANTS.MIN_BET || amount > COIN_CONSTANTS.MAX_BET) {
            throw new Error(`Bet amount must be between ${COIN_CONSTANTS.MIN_BET} and ${COIN_CONSTANTS.MAX_BET} coins`);
        }

        updateBalance(-amount);
        addTransaction({
            type: 'bet',
            amount: -amount,
            description,
            matchId
        });

        setWallet(prev => ({
            ...prev,
            totalBet: prev.totalBet + amount,
            totalPredictions: prev.totalPredictions + 1
        }));
    };

    const recordWin = (amount: number, matchId: number, description: string, odds: number = 1.5) => {
        // Calculate winnings based on stake and odds
        const winnings = Math.round(amount * odds);

        updateBalance(winnings);
        addTransaction({
            type: 'win',
            amount: winnings,
            description,
            matchId,
            odds
        });

        setWallet(prev => ({
            ...prev,
            totalWinnings: prev.totalWinnings + winnings,
            successfulPredictions: prev.successfulPredictions + 1
        }));
    };

    const recordLoss = (amount: number, matchId: number, description: string) => {
        addTransaction({
            type: 'loss',
            amount: -amount,
            description,
            matchId
        });

        setWallet(prev => ({
            ...prev,
            totalLosses: prev.totalLosses + amount
        }));
    };

    const checkDailyLogin = (): number => {
        const today = new Date().toDateString();
        const lastLogin = wallet.lastLoginDate;

        if (lastLogin === today) {
            return 0; // Already claimed today
        }

        const isConsecutive = lastLogin === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        const newStreak = isConsecutive ? wallet.dailyLoginStreak + 1 : 1;
        const reward = getDailyLoginReward(newStreak);

        setWallet(prev => ({
            ...prev,
            dailyLoginStreak: newStreak,
            lastLoginDate: today
        }));

        updateBalance(reward);
        addTransaction({
            type: 'daily_login',
            amount: reward,
            description: `Daily login reward (${newStreak} day streak)`
        });

        return reward;
    };

    const getDailyLoginReward = (streak?: number): number => {
        const currentStreak = streak || wallet.dailyLoginStreak;
        const baseReward = COIN_CONSTANTS.DAILY_LOGIN_BASE;
        const streakBonus = currentStreak * COIN_CONSTANTS.DAILY_LOGIN_STREAK_BONUS;
        return Math.min(COIN_CONSTANTS.DAILY_LOGIN_MAX, baseReward + streakBonus);
    };

    const claimWelcomeBonus = (): number => {
        if (wallet.hasReceivedWelcomeBonus) {
            return 0; // Already claimed
        }

        setWallet(prev => ({
            ...prev,
            hasReceivedWelcomeBonus: true
        }));

        updateBalance(COIN_CONSTANTS.WELCOME_BONUS);
        addTransaction({
            type: 'welcome_bonus',
            amount: COIN_CONSTANTS.WELCOME_BONUS,
            description: 'Welcome bonus - Welcome to NetProphet!'
        });

        return COIN_CONSTANTS.WELCOME_BONUS;
    };

    const addReferralBonus = (referrerId: string): number => {
        updateBalance(COIN_CONSTANTS.REFERRAL_BONUS);
        addTransaction({
            type: 'referral',
            amount: COIN_CONSTANTS.REFERRAL_BONUS,
            description: `Referral bonus - Invited by ${referrerId}`
        });

        setWallet(prev => ({
            ...prev,
            referralBonusEarned: prev.referralBonusEarned + COIN_CONSTANTS.REFERRAL_BONUS
        }));

        return COIN_CONSTANTS.REFERRAL_BONUS;
    };

    const addLeaderboardPrize = (amount: number, description: string) => {
        updateBalance(amount);
        addTransaction({
            type: 'leaderboard',
            amount,
            description
        });

        setWallet(prev => ({
            ...prev,
            leaderboardPrizesEarned: prev.leaderboardPrizesEarned + amount
        }));
    };

    const purchaseItem = (amount: number, itemName: string) => {
        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }

        updateBalance(-amount);
        addTransaction({
            type: 'purchase',
            amount: -amount,
            description: `Purchased ${itemName}`
        });
    };

    const enterTournament = (amount: number, tournamentName: string) => {
        if (amount < COIN_CONSTANTS.TOURNAMENT_ENTRY_MIN) {
            throw new Error(`Tournament entry must be at least ${COIN_CONSTANTS.TOURNAMENT_ENTRY_MIN} coins`);
        }

        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }

        updateBalance(-amount);
        addTransaction({
            type: 'tournament_entry',
            amount: -amount,
            description: `Tournament entry: ${tournamentName}`
        });
    };

    const unlockInsight = (amount: number, insightType: string) => {
        if (amount < COIN_CONSTANTS.INSIGHT_UNLOCK_MIN) {
            throw new Error(`Insight unlock must be at least ${COIN_CONSTANTS.INSIGHT_UNLOCK_MIN} coins`);
        }

        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }

        updateBalance(-amount);
        addTransaction({
            type: 'insight_unlock',
            amount: -amount,
            description: `Unlocked ${insightType} insight`
        });
    };

    const resetWallet = () => {
        setWallet(defaultWallet);
    };

    return (
        <WalletContext.Provider value={{
            wallet,
            addTransaction,
            updateBalance,
            placeBet,
            recordWin,
            recordLoss,
            calculateStats,
            resetWallet,
            checkDailyLogin,
            claimWelcomeBonus,
            addReferralBonus,
            addLeaderboardPrize,
            purchaseItem,
            enterTournament,
            unlockInsight,
            getDailyLoginReward
        }}>
            {children}
        </WalletContext.Provider>
    );
} 