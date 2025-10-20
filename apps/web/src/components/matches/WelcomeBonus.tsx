'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle, Button, Badge } from '@netprophet/ui';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { useTheme } from '../Providers';
import { useAuth } from '@/hooks/useAuth';
import { useDictionary } from '@/context/DictionaryContext';
import { supabase, WelcomeBonusNotificationService } from '@netprophet/lib';
import { motion, AnimatePresence } from 'framer-motion';
import { gradients, shadows, borders, transitions, animations, typography, cx } from '@/styles/design-system';
import CoinIcon from '@/components/CoinIcon';

// Icon components
function GiftIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
}

function FireIcon({ className = "h-3 w-3" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
}

interface WelcomeBonusProps {
    onClose?: () => void;
    onDismiss?: () => void;
}

export function WelcomeBonus({ onClose, onDismiss }: WelcomeBonusProps) {
    const { user, loading: authLoading } = useAuth();
    const { wallet, isWalletSyncing, claimWelcomeBonus, checkDailyLogin, claimDailyLogin, syncWalletWithDatabase } = useWallet();
    const { theme } = useTheme();
    const { dict, lang } = useDictionary();
    const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
    const [showDailyLogin, setShowDailyLogin] = useState(false);
    const [dailyReward, setDailyReward] = useState(0);
    const [hasCheckedWelcomeBonus, setHasCheckedWelcomeBonus] = useState(false);
    const [hasCheckedDailyLogin, setHasCheckedDailyLogin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; rotation: number; delay: number }>>([]);

    useEffect(() => {
        // Sync wallet with database first, then check welcome bonus
        const initializeWallet = async () => {
            try {
                await syncWalletWithDatabase();
                setHasCheckedWelcomeBonus(true);
            } catch (error) {
                console.error('Error syncing wallet:', error);
                setHasCheckedWelcomeBonus(true);
            }
        };

        if (!hasCheckedWelcomeBonus) {
            initializeWallet();
        }
    }, [syncWalletWithDatabase, hasCheckedWelcomeBonus]);

    useEffect(() => {
        // Check for daily login reward on component mount, but only if user has already received welcome bonus
        const checkDailyReward = async () => {
            // Check session storage to see if we've already processed today
            const today = new Date().toDateString();
            const lastChecked = sessionStorage.getItem('dailyRewardChecked');

            if (lastChecked === today) {
                // Already checked today in this session
                return;
            }

            try {
                // Only check daily login if user has already received welcome bonus AND we haven't checked yet
                if (wallet.hasReceivedWelcomeBonus && !hasCheckedDailyLogin && user) {
                    setHasCheckedDailyLogin(true); // Mark as checked to prevent multiple calls

                    // Mark in session storage that we've checked today
                    sessionStorage.setItem('dailyRewardChecked', today);

                    const reward = await checkDailyLogin();

                    if (reward > 0) {
                        // Show modal if there's a reward to claim
                        setDailyReward(reward);
                        setShowDailyLogin(true);
                    } else {
                        // Automatically claim in background (day 1 or streak broken)
                        // This records the login in the database without showing modal
                        await claimDailyLogin(false); // Don't show toasts on first login
                        // Note: claimDailyLogin already shows a toast with the appropriate message
                    }
                }
            } catch (error) {
                console.error('Error checking daily login:', error);
            }
        };
        checkDailyReward();
        // Only run when welcome bonus status changes or user logs in - NOT when streak changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet.hasReceivedWelcomeBonus, hasCheckedDailyLogin, user]); // Intentionally excluding checkDailyLogin and claimDailyLogin to prevent re-runs

    // Check welcome bonus status after wallet sync is complete
    useEffect(() => {
        if (hasCheckedWelcomeBonus && !isWalletSyncing) {
            setShowWelcomeBonus(!wallet.hasReceivedWelcomeBonus);
            setIsLoading(false);
        }
    }, [hasCheckedWelcomeBonus, isWalletSyncing, wallet.hasReceivedWelcomeBonus]);

    const handleClaimWelcomeBonus = async () => {
        try {
            // Generate confetti pieces
            const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: -10 - Math.random() * 20,
                color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
                rotation: Math.random() * 360,
                delay: Math.random() * 0.5
            }));
            setConfetti(confettiPieces);

            const bonus = await claimWelcomeBonus(false); // Don't show toasts on first login
            setShowWelcomeBonus(false);
            // Don't show daily login immediately after claiming welcome bonus
            setShowDailyLogin(false);
            if (onClose) onClose();

            // Clear confetti after animation completes
            setTimeout(() => {
                setConfetti([]);
            }, 5000);
        } catch (error) {
            console.error('Error claiming welcome bonus:', error);
            setConfetti([]);
        }
    };

    const handleClaimDailyLogin = async () => {
        try {
            const bonus = await claimDailyLogin();
            setShowDailyLogin(false);
            if (onClose) onClose();
        } catch (error) {
            console.error('Error claiming daily login:', error);
        }
    };

    const handleDismiss = async () => {
        try {
            // Only create a notification if user hasn't already received welcome bonus
            if (user && !wallet.hasReceivedWelcomeBonus) {
                await WelcomeBonusNotificationService.createWelcomeBonusNotification(
                    user.id,
                    COIN_CONSTANTS.WELCOME_BONUS,
                    true, // Include tournament pass
                    lang // Pass the current language
                );

                // Refresh notifications to show the new one
                if ((window as any).refreshNotifications) {
                    (window as any).refreshNotifications();
                }
            } else {
                console.log('Not creating notification - user has already received welcome bonus:', wallet.hasReceivedWelcomeBonus);
            }
        } catch (error) {
            console.error('Error creating welcome bonus notification:', error);
        }

        setShowWelcomeBonus(false);
        if (onDismiss) onDismiss();
    };



    // Don't render anything if user is not authenticated, auth is loading, wallet is syncing, or we haven't checked welcome bonus yet
    if (!user || authLoading || isLoading || isWalletSyncing || !hasCheckedWelcomeBonus) {
        return null;
    }

    // Don't render anything if there's nothing to show
    if (!showWelcomeBonus && !showDailyLogin) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className={cx(
                    "w-full",
                    theme === 'dark' ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-purple-500/30' : 'bg-white border-gray-200',
                    shadows.cardHover,
                    borders.rounded.lg
                )}>
                    <CardContent className="p-6">
                        {showWelcomeBonus && (
                            <div className="text-center space-y-6">
                                {/* Header with icon and title */}
                                <div className="space-y-3">
                                    <motion.div
                                        className={cx(
                                            "mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                                            gradients.yellow,
                                            shadows.glow.yellow
                                        )}
                                        animate={{
                                            y: [0, -10, 0],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        <GiftIcon className="text-white h-8 w-8 animate-pulse" />
                                    </motion.div>
                                    <CardTitle className={cx(
                                        typography.heading.lg,
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    )}>
                                        {dict?.welcomeBonus?.title || 'Welcome to NetProphet! 🎉'}
                                    </CardTitle>
                                    <p className={cx(
                                        typography.body.md,
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600',
                                        'leading-relaxed'
                                    )}>
                                        {dict?.welcomeBonus?.description || 'Start your prediction journey with a welcome bonus!'}
                                    </p>
                                </div>

                                {/* Rewards section - side by side */}
                                <div className="flex gap-3">
                                    {/* Coins reward */}
                                    <div className="flex-1 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <CoinIcon size={20} />
                                            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                                +{COIN_CONSTANTS.WELCOME_BONUS}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tournament pass reward */}
                                    <div className="flex-1 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="text-2xl">🎫</div>
                                            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                {dict?.welcomeBonus?.freeTournamentPass || 'Free Tournament Pass'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={handleClaimWelcomeBonus}
                                        className={cx(
                                            "flex-1 text-white font-semibold py-3 text-base shadow-lg",
                                            gradients.yellow,
                                            transitions.default,
                                            animations.hover.scaleSmall
                                        )}
                                    >
                                        {dict?.welcomeBonus?.claimWelcomeBonus || 'Πάρε το Μπόνους'}
                                    </Button>
                                    <Button
                                        onClick={handleDismiss}
                                        variant="outline"
                                        className="px-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 border-gray-300 dark:border-gray-600"
                                    >
                                        {dict?.welcomeBonus?.later || 'Later'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {showDailyLogin && (
                            <div className="text-center space-y-6">
                                {/* Header with icon and title */}
                                <div className="space-y-3">
                                    <motion.div
                                        className={cx(
                                            "mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                                            gradients.blue,
                                            shadows.glow.blue
                                        )}
                                        animate={{
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        <CalendarIcon className="text-white h-8 w-8" />
                                    </motion.div>
                                    <CardTitle className={cx(
                                        typography.heading.lg,
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    )}>
                                        {dict?.dailyLogin?.title || 'Daily Login Reward! 🔥'}
                                    </CardTitle>
                                    <p className={`text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                                        {dailyReward > 0
                                            ? (wallet.dailyLoginStreak > 1
                                                ? (dict?.dailyLogin?.streakMessage || 'You\'re on a {streak} day streak!').replace('{streak}', wallet.dailyLoginStreak.toString())
                                                : (dict?.dailyLogin?.comeBackTomorrow || 'Come back tomorrow for more rewards!')
                                            )
                                            : (dict?.dailyLogin?.streakBroken || 'Streak broken! Come back tomorrow to start a new streak.')
                                        }
                                    </p>
                                </div>

                                {/* Reward section */}
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700/30">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <CoinIcon size={24} />
                                        <div className={`text-3xl font-bold ${dailyReward > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                                            {dailyReward > 0 ? `+${dailyReward}` : (dict?.dailyLogin?.noReward || 'No Reward')}
                                        </div>
                                    </div>
                                </div>

                                {/* Action button */}
                                <Button
                                    onClick={handleClaimDailyLogin}
                                    className={cx(
                                        "w-full text-white font-semibold py-3 text-base shadow-lg",
                                        gradients.blue,
                                        transitions.default,
                                        animations.hover.scaleSmall
                                    )}
                                >
                                    {dict?.dailyLogin?.claimDailyReward || 'Claim Daily Reward'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Confetti Effect */}
            <AnimatePresence>
                {confetti.length > 0 && (
                    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                        {confetti.map((piece) => (
                            <motion.div
                                key={piece.id}
                                className="absolute w-2 h-2 rounded-sm pointer-events-none"
                                style={{
                                    left: `${piece.x}%`,
                                    backgroundColor: piece.color,
                                    zIndex: 40
                                }}
                                initial={{
                                    y: piece.y,
                                    x: piece.x,
                                    rotate: piece.rotation,
                                    opacity: 1
                                }}
                                animate={{
                                    y: '100vh',
                                    x: piece.x + (Math.random() - 0.5) * 20,
                                    rotate: piece.rotation + 360,
                                    opacity: [1, 1, 0]
                                }}
                                transition={{
                                    duration: 3 + Math.random() * 2,
                                    delay: piece.delay,
                                    ease: "easeOut"
                                }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
} 