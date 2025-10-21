'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { BetsService, TransactionsService } from '@netprophet/lib';
import { loadFromSessionStorage, saveToSessionStorage, SESSION_KEYS } from '@/lib/sessionStorage';
import { DailyRewardsService, WalletOperationsService, supabase, DAILY_REWARDS_CONSTANTS } from '@netprophet/lib';
import { toast } from 'sonner';
import { useDictionary } from '@/context/DictionaryContext';
import { useAuth } from '@/hooks/useAuth';
import { useEmail } from '@/hooks/useEmail';

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
    hasTournamentPass: boolean;
    tournamentPassUsed: boolean;
}

interface WalletContextType {
    wallet: UserWallet;
    isWalletSyncing: boolean;
    placeBet: (amount: number, matchId: number, description: string) => Promise<void>;
    recordWin: (stake: number, odds: number, description: string) => void;
    recordLoss: (stake: number, description: string) => void;
    updateBalance: (amount: number, type: Transaction['type'], description: string) => void;
    // Coin system functions
    checkDailyLogin: () => Promise<number>;
    claimDailyLogin: (showToasts?: boolean) => Promise<number>;
    claimWelcomeBonus: (showToasts?: boolean) => Promise<number>;
    addReferralBonus: (amount: number) => void;
    addLeaderboardPrize: (amount: number) => void;
    purchaseItem: (cost: number, itemName: string) => void;
    enterTournament: (cost: number, tournamentName: string) => void;
    unlockInsight: (cost: number, insightName: string) => void;
    // Lazy loading methods
    loadBetStats: () => Promise<void>;
    loadTransactions: () => Promise<void>;
    syncWalletWithDatabase: () => Promise<void>;
    // Lazy load all data when needed
    loadAllData: () => Promise<void>;
}

const defaultWallet: UserWallet = {
    balance: 0, // Starting balance - users get welcome bonus instead
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
    hasTournamentPass: false,
    tournamentPassUsed: false,
};

export const COIN_CONSTANTS = {
    WELCOME_BONUS: DAILY_REWARDS_CONSTANTS.WELCOME_BONUS, // Use centralized constants
    DAILY_LOGIN_BASE: DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD, // Use centralized constants
    DAILY_LOGIN_STREAK_BONUS: DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS, // Use centralized constants
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
    const { dict, lang } = useDictionary();
    const { user } = useAuth();
    const { sendWinningsEmail } = useEmail();
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
            hasTournamentPass: storedWallet.hasTournamentPass ?? false,
            tournamentPassUsed: storedWallet.tournamentPassUsed ?? false,
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

    // Add a loading state to track when wallet is being synced
    const [isWalletSyncing, setIsWalletSyncing] = useState(false);

    const syncWalletWithDatabase = useCallback(async () => {
        try {
            setIsWalletSyncing(true);
            if (!user) {
                setIsWalletSyncing(false);
                return;
            }

            // Get only essential profile data
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('balance, daily_login_streak, has_received_welcome_bonus, has_tournament_pass, tournament_pass_used')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                console.error('Profile not found - user should have a profile after signup');
                return;
            } else if (error) {
                console.error('Failed to load profile:', error);
                return;
            } else if (profile) {
                // Update local wallet state with database values
                setWallet(prevWallet => {
                    const updatedWallet = {
                        ...prevWallet,
                        balance: profile.balance || 0,
                        dailyLoginStreak: profile.daily_login_streak || 0,
                        hasReceivedWelcomeBonus: profile.has_received_welcome_bonus || false,
                        hasTournamentPass: profile.has_tournament_pass || false,
                        tournamentPassUsed: profile.tournament_pass_used || false,
                    };

                    saveToSessionStorage(SESSION_KEYS.WALLET, updatedWallet);
                    return updatedWallet;
                });
            }
        } catch (error) {
            console.error('Failed to sync wallet with database:', error);
        } finally {
            setIsWalletSyncing(false);
        }
    }, [user]);

    const loadBetStats = useCallback(async () => {
        try {
            const betStats = await BetsService.getUserBetStats();
            if (betStats) {
                setWallet(prev => {
                    const updatedWallet = {
                        ...prev,
                        totalBets: betStats.total_bets || 0,
                        wonBets: betStats.won_bets || 0,
                        lostBets: betStats.lost_bets || 0,
                        totalWinnings: betStats.total_winnings || 0,
                        totalLosses: betStats.total_losses || 0,
                        netProfit: (betStats.total_winnings || 0) - (betStats.total_losses || 0),
                        winRate: betStats.win_rate || 0,
                    };
                    saveToSessionStorage(SESSION_KEYS.WALLET, updatedWallet);
                    return updatedWallet;
                });
            }
        } catch (error) {
            console.error('Failed to load bet stats:', error);
            // Don't show toast for background loading
        }
    }, []);

    const loadTransactions = useCallback(async () => {
        try {
            // Ensure user is authenticated before fetching transactions
            if (!user) {
                return;
            }

            const transactions = await TransactionsService.getRecentTransactions(3); // CRITICAL: Reduce to 3

            if (transactions && transactions.length > 0) {
                // Convert database transactions to local Transaction format
                const localTransactions: Transaction[] = transactions.map(dbTransaction => ({
                    id: dbTransaction.id,
                    type: dbTransaction.type as Transaction['type'],
                    amount: dbTransaction.amount,
                    description: dbTransaction.description || '',
                    timestamp: new Date(dbTransaction.created_at || new Date()),
                }));

                setWallet(prev => {
                    const updatedWallet = {
                        ...prev,
                        recentTransactions: localTransactions,
                    };
                    saveToSessionStorage(SESSION_KEYS.WALLET, updatedWallet);
                    return updatedWallet;
                });
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            // Don't show toast for background loading
        }
    }, [user]);


    // Use ref to track if we're currently loading
    const isLoadingRef = useRef(false);

    // Reset loaded state when user logs out
    useEffect(() => {
        if (!user?.id) {
            setWallet(defaultWallet);
        }
    }, [user?.id]);

    // Only load essential wallet data on user change - lazy load the rest
    useEffect(() => {
        if (!user?.id) {
            return;
        }

        // Load only critical wallet data immediately
        const loadEssentialData = async () => {
            if (isLoadingRef.current) {
                return;
            }

            isLoadingRef.current = true;

            try {
                // Only sync balance and basic profile data
                await syncWalletWithDatabase();
            } catch (error) {
                console.error('❌ Error loading essential wallet data:', error);
                // Log error to console
                console.error('Wallet context error:', error);
            } finally {
                isLoadingRef.current = false;
            }
        };

        loadEssentialData();
    }, [user?.id, syncWalletWithDatabase]);

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

            const updatedTransactions = [newTransaction, ...prev.recentTransactions.slice(0, 4)]; // CRITICAL: Keep only last 5

            let newTotalCoinsEarned = prev.totalCoinsEarned;
            let newTotalCoinsSpent = prev.totalCoinsSpent;

            // Track coin flows
            if (amount > 0) {
                newTotalCoinsEarned += amount;
            } else {
                newTotalCoinsSpent += Math.abs(amount);
            }

            // Save transaction to database
            TransactionsService.createTransaction({
                type,
                amount,
                description,
            }).catch(error => {
                console.error('Failed to save transaction to database:', error);
            });

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
            const loadingToast = toast.loading(dict?.toast?.placingPrediction || 'Placing your prediction...');

            const result = await WalletOperationsService.placeBet(amount, matchId.toString(), description);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success((dict?.toast?.predictionPlaced || '🎯 Prediction placed successfully! New balance: {balance} 🌕').replace('{balance}', result.data.newBalance.toString()), {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to place bet: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error placing prediction:', error);
            toast.error(dict?.toast?.failedToPlacePrediction || 'Failed to place prediction. Please try again.');
        }
    };

    const recordWin = async (stake: number, odds: number, description: string) => {
        try {
            const loadingToast = toast.loading(dict?.toast?.recordingWin || 'Recording win...');

            const result = await WalletOperationsService.recordWin(stake, odds, description);

            if (result.success) {
                const winnings = result.data.winnings;

                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                // Send winnings notification email
                if (user?.email) {
                    try {
                        await sendWinningsEmail(
                            user.email,
                            description,
                            `${stake} 🌕 bet with ${odds.toFixed(2)}x odds`,
                            winnings,
                            lang as 'en' | 'el'
                        );
                    } catch (emailError) {
                        console.error('Failed to send winnings email:', emailError);
                        // Don't show error to user, just log it
                    }
                }

                toast.success((dict?.toast?.congratulationsWon || '🎉 Congratulations! You won {amount} 🌕!').replace('{amount}', winnings.toString()), {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to record win: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error recording win:', error);
            toast.error(dict?.toast?.failedToRecordWin || 'Failed to record win. Please try again.');
        }
    };

    const recordLoss = async (stake: number, description: string) => {
        try {
            const loadingToast = toast.loading(dict?.toast?.recordingLoss || 'Recording loss...');

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
            toast.error(dict?.toast?.failedToRecordLoss || 'Failed to record loss. Please try again.');
        }
    };

    const checkDailyLogin = async (): Promise<number> => {
        try {
            const status = await DailyRewardsService.checkDailyReward();

            // Safety check to ensure status is defined
            if (!status) {
                console.error('Daily reward status is undefined');
                return 0;
            }

            return status.can_claim ? status.next_reward_amount : 0;
        } catch (error) {
            console.error('Failed to check daily reward:', error);
            return 0;
        }
    };

    const claimDailyLogin = async (showToasts: boolean = true): Promise<number> => {
        let loadingToast: string | number | undefined;
        try {
            if (showToasts) {
                loadingToast = toast.loading(dict?.toast?.claimingDailyReward || 'Claiming daily reward...');
            }

            const result = await DailyRewardsService.claimDailyReward();

            if (result.success) {
                const rewardAmount = result.reward_amount;

                // Update local wallet state (balance only changes if reward was given)
                setWallet(prev => ({
                    ...prev,
                    balance: prev.balance + rewardAmount,
                    dailyLoginStreak: result.new_streak,
                }));

                if (showToasts) {
                    // Translate message key from database
                    let translatedMessage: string;
                    const messageKey = result.message || '';

                    if (messageKey === 'FIRST_LOGIN') {
                        translatedMessage = dict?.toast?.firstDailyLogin || 'First daily login! Come back tomorrow to start your streak and earn 30 🌕';
                    } else if (messageKey === 'STREAK_ACTIVATED') {
                        translatedMessage = dict?.toast?.streakActivated || 'Streak activated! Daily login reward claimed (+30 🌕)';
                    } else if (messageKey === 'STREAK_BONUS') {
                        translatedMessage = dict?.toast?.streakBonus || 'Daily login reward claimed with 7-day streak bonus! (+130 🌕)';
                    } else if (messageKey.startsWith('STREAK_CONTINUED:')) {
                        const streak = messageKey.split(':')[1];
                        translatedMessage = (dict?.toast?.streakContinued || 'Daily login reward claimed! (+30 🌕, {streak} day streak)').replace('{streak}', streak);
                    } else if (messageKey === 'STREAK_BROKEN') {
                        translatedMessage = dict?.toast?.streakBroken || 'Streak broken. Come back tomorrow to reactivate your streak and earn 30 🌕';
                    } else {
                        translatedMessage = messageKey; // Fallback to raw message
                    }

                    // Show appropriate toast based on whether reward was given
                    if (rewardAmount > 0) {
                        toast.success(translatedMessage, {
                            id: loadingToast,
                        });
                    } else {
                        // Show info message when no reward (streak not active yet or broken)
                        toast(translatedMessage, {
                            id: loadingToast,
                            icon: '📅',
                            duration: 5000,
                        });
                    }
                }

                return rewardAmount;
            } else {
                if (showToasts) {
                    // Check if it's "Already claimed today" - if so, dismiss silently
                    if (result.message === 'Already claimed today') {
                        toast.dismiss(loadingToast);
                        return 0;
                    }

                    // For other errors, show error toast
                    toast.error(`Failed to claim daily reward: ${result.message}`, {
                        id: loadingToast,
                    });
                }
                return 0;
            }
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            if (showToasts) {
                toast.error(dict?.toast?.failedToClaimDailyReward || 'Failed to claim daily reward. Please try again.');
            }
            return 0;
        } finally {
            if (loadingToast !== undefined) {
                toast.dismiss(loadingToast);
            }
        }
    };

    const claimWelcomeBonus = async (showToasts: boolean = true): Promise<number> => {
        let loadingToast: string | number | undefined;
        try {
            if (showToasts) {
                loadingToast = toast.loading(dict?.toast?.claimingWelcomeBonus || 'Claiming welcome bonus...');
            }

            const result = await WalletOperationsService.claimWelcomeBonus();

            if (result.success) {
                const bonusAmount = COIN_CONSTANTS.WELCOME_BONUS; // Use constant

                // Update local wallet state
                setWallet(prev => {
                    const newState = {
                        ...prev,
                        balance: result.data.newBalance,
                        hasReceivedWelcomeBonus: true,
                        hasTournamentPass: true, // Grant tournament pass with welcome bonus
                    };
                    return newState;
                });

                // The database is already updated by the wallet operations service
                // No need for duplicate updates

                if (showToasts) {
                    toast.success((dict?.toast?.welcomeBonusClaimed || '🎉 Welcome bonus claimed! +{amount} 🌕').replace('{amount}', bonusAmount.toString()), {
                        id: loadingToast,
                    });
                }

                return bonusAmount;
            } else {
                if (showToasts) {
                    toast.error((dict?.toast?.failedToClaimWelcomeBonus || 'Failed to claim welcome bonus: {error}').replace('{error}', result.error || 'Unknown error'), {
                        id: loadingToast,
                    });
                }
                return 0;
            }
        } catch (error) {
            console.error('Error claiming welcome bonus:', error);

            if (showToasts) {
                // Handle specific JSON parsing errors
                if (error instanceof Error && error.message.includes('Unexpected end of JSON input')) {
                    toast.error(dict?.toast?.serverEmptyResponse || 'Server returned an empty response. Please try again.', {
                        id: loadingToast,
                    });
                } else {
                    toast.error(`Failed to claim welcome bonus: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                        id: loadingToast,
                    });
                }
            }
            return 0;
        } finally {
            if (loadingToast !== undefined) {
                toast.dismiss(loadingToast);
            }
        }
    };

    const addReferralBonus = async (amount: number) => {
        try {
            const loadingToast = toast.loading(dict?.toast?.addingReferralBonus || 'Adding referral bonus...');

            const result = await WalletOperationsService.addReferralBonus(amount);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success((dict?.toast?.referralBonusAdded || '👥 Referral bonus added! +{amount} 🌕').replace('{amount}', amount.toString()), {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to add referral bonus: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error adding referral bonus:', error);
            toast.error(dict?.toast?.failedToAddReferralBonus || 'Failed to add referral bonus. Please try again.');
        }
    };

    const addLeaderboardPrize = async (amount: number) => {
        try {
            const loadingToast = toast.loading(dict?.toast?.addingLeaderboardPrize || 'Adding leaderboard prize...');

            const result = await WalletOperationsService.addLeaderboardPrize(amount);

            if (result.success) {
                // Update local wallet state
                setWallet(prev => ({
                    ...prev,
                    balance: result.data.newBalance,
                }));

                toast.success((dict?.toast?.leaderboardPrizeAdded || '🏆 Leaderboard prize added! +{amount} 🌕').replace('{amount}', amount.toString()), {
                    id: loadingToast,
                });
            } else {
                toast.error(`Failed to add leaderboard prize: ${result.error}`, {
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Error adding leaderboard prize:', error);
            toast.error(dict?.toast?.failedToAddLeaderboardPrize || 'Failed to add leaderboard prize. Please try again.');
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

    // Lazy load all data when needed (for pages that need complete wallet data)
    const loadAllData = useCallback(async () => {
        try {
            await Promise.all([
                loadBetStats(),
                loadTransactions()
            ]);
        } catch (error) {
            console.error('Failed to load all wallet data:', error);
        }
    }, [loadBetStats, loadTransactions]);

    // Save wallet to session storage whenever it changes
    useEffect(() => {
        saveToSessionStorage(SESSION_KEYS.WALLET, wallet);
    }, [wallet]);

    const value: WalletContextType = {
        wallet,
        isWalletSyncing,
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
        loadTransactions,
        syncWalletWithDatabase,
        loadAllData,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
} 