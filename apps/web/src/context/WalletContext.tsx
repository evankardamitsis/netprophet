'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BetsService } from '@netprophet/lib';
import { loadFromSessionStorage, saveToSessionStorage, SESSION_KEYS } from '@/lib/sessionStorage';
import { DailyRewardsService, WalletOperationsService, supabase } from '@netprophet/lib';
import toast from 'react-hot-toast';

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
    syncWalletWithDatabase: () => Promise<void>;
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

    const syncWalletWithDatabase = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user profile from database
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('balance, daily_login_streak, has_received_welcome_bonus')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist, create one with default values
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        balance: 1000,
                        daily_login_streak: 0,
                        has_received_welcome_bonus: false,
                        total_winnings: 0,
                        total_losses: 0,
                        won_bets: 0,
                        lost_bets: 0,
                        total_bets: 0,
                        referral_bonus_earned: 0,
                        leaderboard_prizes_earned: 0
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Failed to create profile:', createError);
                    return;
                }

                // Update local wallet state with new profile
                setWallet(prevWallet => {
                    const updatedWallet = {
                        ...prevWallet,
                        balance: newProfile.balance,
                        dailyLoginStreak: newProfile.daily_login_streak,
                        hasReceivedWelcomeBonus: newProfile.has_received_welcome_bonus,
                    };
                    saveToSessionStorage(SESSION_KEYS.WALLET, updatedWallet);
                    return updatedWallet;
                });

                toast.success('Wallet initialized with $1000 starting balance!');
            } else if (error) {
                console.error('Failed to load profile:', error);
                return;
            } else if (profile) {
                // Update local wallet state with database values
                setWallet(prevWallet => {
                    const updatedWallet = {
                        ...prevWallet,
                        balance: profile.balance || 1000, // Default to 1000 if null
                        dailyLoginStreak: profile.daily_login_streak || 0,
                        hasReceivedWelcomeBonus: profile.has_received_welcome_bonus || false,
                    };
                    saveToSessionStorage(SESSION_KEYS.WALLET, updatedWallet);
                    return updatedWallet;
                });
            }
        } catch (error) {
            console.error('Failed to sync wallet with database:', error);
            toast.error('Failed to sync wallet with database');
        }
    }, []);

    // Load bet statistics from database on mount
    useEffect(() => {
        loadBetStats();
        syncWalletWithDatabase();
    }, []); // Add empty dependency array to run only on mount

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
        try {
            const loadingToast = toast.loading('Placing your bet...');

            const result = await WalletOperationsService.placeBet(amount, matchId.toString(), description);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`Bet placed successfully! New balance: $${result.data.newBalance}`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to place bet: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error placing bet:', error);
            toast.error('Failed to place bet. Please try again.');
        }
    };

    const recordWin = async (stake: number, odds: number, description: string) => {
        try {
            const loadingToast = toast.loading('Recording win...');

            const result = await WalletOperationsService.recordWin(stake, odds, description);

            if (result.success) {
                const winnings = result.data.winnings;

                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`Congratulations! You won $${winnings}!`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to record win: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error recording win:', error);
            toast.error('Failed to record win. Please try again.');
        }
    };

    const recordLoss = async (stake: number, description: string) => {
        try {
            const loadingToast = toast.loading('Recording loss...');

            const result = await WalletOperationsService.recordLoss(stake, description);

            if (result.success) {
                toast.success(`Loss recorded. Better luck next time!`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to record loss: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error recording loss:', error);
            toast.error('Failed to record loss. Please try again.');
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
            const loadingToast = toast.loading('Claiming daily reward...');

            const result = await DailyRewardsService.claimDailyReward();

            if (result.success) {
                const rewardAmount = result.reward_amount;

                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: prev.balance + rewardAmount,
                    dailyLoginStreak: result.new_streak,
                }));

                toast.success(`Daily reward claimed! +$${rewardAmount} (${result.new_streak} day streak)`, {
                    id: loadingToast,
                });

                return rewardAmount;
            } else {
                toast.error(`Failed to claim daily reward: ${result.message}`, {
                    id: loadingToast,
                });
                return 0;
            }
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            toast.error('Failed to claim daily reward. Please try again.');
            return 0;
        }
    };

    const claimWelcomeBonus = async (): Promise<number> => {
        let loadingToast: string | undefined;
        try {
            loadingToast = toast.loading('Claiming welcome bonus...');

            const result = await WalletOperationsService.claimWelcomeBonus();

            if (result.success) {
                const bonusAmount = 250; // Welcome bonus amount

                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                    hasReceivedWelcomeBonus: true,
                }));

                toast.success(`Welcome bonus claimed! +$${bonusAmount}`, {
                    id: loadingToast,
                });

                return bonusAmount;
            } else {
                toast.error(`Failed to claim welcome bonus: ${result.error}`, {
                    id: loadingToast,
                });
                return 0;
            }
        } catch (error) {
            console.error('Error claiming welcome bonus:', error);

            // Handle specific JSON parsing errors
            if (error instanceof Error && error.message.includes('Unexpected end of JSON input')) {
                toast.error('Server returned an empty response. Please try again.', {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to claim welcome bonus: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                    id: loadingToast,
                });
            }
            return 0;
        }
    };

    const addReferralBonus = async (amount: number) => {
        try {
            const loadingToast = toast.loading('Adding referral bonus...');

            const result = await WalletOperationsService.addReferralBonus(amount);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`Referral bonus added! +$${amount}`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to add referral bonus: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error adding referral bonus:', error);
            toast.error('Failed to add referral bonus. Please try again.');
        }
    };

    const addLeaderboardPrize = async (amount: number) => {
        try {
            const loadingToast = toast.loading('Adding leaderboard prize...');

            const result = await WalletOperationsService.addLeaderboardPrize(amount);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`Leaderboard prize added! +$${amount}`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to add leaderboard prize: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error adding leaderboard prize:', error);
            toast.error('Failed to add leaderboard prize. Please try again.');
        }
    };

    const purchaseItem = async (cost: number, itemName: string) => {
        try {
            const loadingToast = toast.loading(`Purchasing ${itemName}...`);

            const result = await WalletOperationsService.purchaseItem(cost, itemName);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`${itemName} purchased successfully!`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to purchase ${itemName}: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error purchasing item:', error);
            toast.error(`Failed to purchase ${itemName}. Please try again.`);
        }
    };

    const enterTournament = async (cost: number, tournamentName: string) => {
        try {
            const loadingToast = toast.loading(`Entering ${tournamentName}...`);

            const result = await WalletOperationsService.enterTournament(cost, tournamentName);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`Successfully entered ${tournamentName}!`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to enter ${tournamentName}: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error entering tournament:', error);
            toast.error(`Failed to enter ${tournamentName}. Please try again.`);
        }
    };

    const unlockInsight = async (cost: number, insightName: string) => {
        try {
            const loadingToast = toast.loading(`Unlocking ${insightName}...`);

            const result = await WalletOperationsService.unlockInsight(cost, insightName);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success(`${insightName} unlocked successfully!`, {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to unlock ${insightName}: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error unlocking insight:', error);
            toast.error(`Failed to unlock ${insightName}. Please try again.`);
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
        syncWalletWithDatabase,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
} 