'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle, Button, Badge } from '@netprophet/ui';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { useTheme } from '../Providers';

// Icon components
function GiftIcon({ className = "h-6 w-6" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
}

function CalendarIcon({ className = "h-6 w-6" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
}

function FireIcon({ className = "h-6 w-6" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
}

interface WelcomeBonusProps {
    onClose?: () => void;
}

export function WelcomeBonus({ onClose }: WelcomeBonusProps) {
    const { wallet, claimWelcomeBonus, checkDailyLogin, getDailyLoginReward } = useWallet();
    const { theme } = useTheme();
    const [showWelcomeBonus, setShowWelcomeBonus] = useState(!wallet.hasReceivedWelcomeBonus);
    const [showDailyLogin, setShowDailyLogin] = useState(false);
    const [dailyReward, setDailyReward] = useState(0);

    useEffect(() => {
        // Check for daily login reward on component mount
        const reward = checkDailyLogin();
        if (reward > 0) {
            setDailyReward(reward);
            setShowDailyLogin(true);
        }
    }, []);

    const handleClaimWelcomeBonus = () => {
        const bonus = claimWelcomeBonus();
        setShowWelcomeBonus(false);
        if (onClose) onClose();
    };

    const handleClaimDailyLogin = () => {
        setShowDailyLogin(false);
        if (onClose) onClose();
    };

    if (!showWelcomeBonus && !showDailyLogin) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-md ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                    {showWelcomeBonus && (
                        <div className="text-center">
                            <div className="mb-4">
                                <GiftIcon className="mx-auto text-yellow-500" />
                            </div>
                            <CardTitle className={`mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Welcome to NetProphet! 🎉
                            </CardTitle>
                            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                Start your prediction journey with a welcome bonus!
                            </p>
                            <div className="mb-6">
                                <div className={`text-3xl font-bold text-yellow-500 mb-2`}>
                                    +{COIN_CONSTANTS.WELCOME_BONUS} 🪙
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    One-time bonus
                                </Badge>
                            </div>
                            <Button
                                onClick={handleClaimWelcomeBonus}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                                Claim Welcome Bonus
                            </Button>
                        </div>
                    )}

                    {showDailyLogin && (
                        <div className="text-center">
                            <div className="mb-4">
                                <CalendarIcon className="mx-auto text-blue-500" />
                            </div>
                            <CardTitle className={`mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Daily Login Reward! 🔥
                            </CardTitle>
                            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {wallet.dailyLoginStreak > 1
                                    ? `You're on a ${wallet.dailyLoginStreak} day streak!`
                                    : 'Come back tomorrow for more rewards!'
                                }
                            </p>
                            <div className="mb-6">
                                <div className={`text-3xl font-bold text-blue-500 mb-2`}>
                                    +{dailyReward} 🪙
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <FireIcon className="text-orange-500" />
                                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {wallet.dailyLoginStreak} day streak
                                    </span>
                                </div>
                            </div>
                            <Button
                                onClick={handleClaimDailyLogin}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
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