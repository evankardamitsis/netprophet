'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle, Button, Badge } from '@netprophet/ui';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { useTheme } from '../Providers';

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
}

export function WelcomeBonus({ onClose }: WelcomeBonusProps) {
    const { wallet, claimWelcomeBonus, checkDailyLogin, claimDailyLogin, syncWalletWithDatabase } = useWallet();
    const { theme } = useTheme();
    const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
    const [showDailyLogin, setShowDailyLogin] = useState(false);
    const [dailyReward, setDailyReward] = useState(0);
    const [hasCheckedWelcomeBonus, setHasCheckedWelcomeBonus] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Sync wallet with database first, then check welcome bonus
        const initializeWallet = async () => {
            try {
                await syncWalletWithDatabase();
                // Wait a bit for the wallet state to update
                setTimeout(() => {
                    setShowWelcomeBonus(!wallet.hasReceivedWelcomeBonus);
                    setHasCheckedWelcomeBonus(true);
                    setIsLoading(false);
                }, 100);
            } catch (error) {
                console.error('Error syncing wallet:', error);
                setIsLoading(false);
            }
        };

        if (!hasCheckedWelcomeBonus) {
            initializeWallet();
        }
    }, [syncWalletWithDatabase, wallet.hasReceivedWelcomeBonus, hasCheckedWelcomeBonus]);

    useEffect(() => {
        // Check for daily login reward on component mount
        const checkDailyReward = async () => {
            try {
                const reward = await checkDailyLogin();
                if (reward > 0) {
                    setDailyReward(reward);
                    setShowDailyLogin(true);
                }
            } catch (error) {
                console.error('Error checking daily login:', error);
            }
        };
        checkDailyReward();
    }, []); // Empty dependency array to run only once on mount

    const handleClaimWelcomeBonus = async () => {
        try {
            const bonus = await claimWelcomeBonus();
            setShowWelcomeBonus(false);
            if (onClose) onClose();
        } catch (error) {
            console.error('Error claiming welcome bonus:', error);
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

    // Don't render anything while loading
    if (isLoading) {
        return null;
    }

    if (!showWelcomeBonus && !showDailyLogin) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-sm ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-4">
                    {showWelcomeBonus && (
                        <div className="text-center">
                            <div className="mb-3">
                                <GiftIcon className="mx-auto text-yellow-500 h-4 w-4" />
                            </div>
                            <CardTitle className={`mb-2 text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Welcome to NetProphet! 🎉
                            </CardTitle>
                            <p className={`mb-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                Start your prediction journey with a welcome bonus!
                            </p>
                            <div className="mb-4">
                                <div className={`text-2xl font-bold text-yellow-500 mb-1`}>
                                    +{COIN_CONSTANTS.WELCOME_BONUS} 🪙
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    One-time bonus
                                </Badge>
                            </div>
                            <Button
                                onClick={handleClaimWelcomeBonus}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-2"
                            >
                                Claim Welcome Bonus
                            </Button>
                        </div>
                    )}

                    {showDailyLogin && (
                        <div className="text-center">
                            <div className="mb-3">
                                <CalendarIcon className="mx-auto text-blue-500 h-4 w-4" />
                            </div>
                            <CardTitle className={`mb-2 text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Daily Login Reward! 🔥
                            </CardTitle>
                            <p className={`mb-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {wallet.dailyLoginStreak > 1
                                    ? `You're on a ${wallet.dailyLoginStreak} day streak!`
                                    : 'Come back tomorrow for more rewards!'
                                }
                            </p>
                            <div className="mb-4">
                                <div className={`text-2xl font-bold text-blue-500 mb-1`}>
                                    +{dailyReward} 🪙
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                    <FireIcon className="text-orange-500 h-3 w-3" />
                                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {wallet.dailyLoginStreak} day streak
                                    </span>
                                </div>
                            </div>
                            <Button
                                onClick={handleClaimDailyLogin}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2"
                            >
                                Claim Daily Reward
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 