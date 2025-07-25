'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { MatchDetail } from '@/components/dashboard/MatchDetail';
import { PredictionSlip, FloatingPredictionButton } from '@/components/dashboard/PredictionSlip';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { MatchesGrid } from '@/components/dashboard/MatchesGrid';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import { RewardShop } from '@/components/dashboard/RewardShop';
import { Match, PredictionItem, UserStats } from '@/types/dashboard';

export default function DashboardPage({ onMatchSelect }: any) {
    const router = useRouter();
    const { user, signOut, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'leaderboard' | 'rewards'>('dashboard');
    // Removed local prediction slip state

    // Mock stats data
    const userStats: UserStats = {
        totalPoints: 1250,
        correctPicks: 23,
        activeStreak: 7,
        ranking: 12
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/signin');
        }
    }, [user, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (!user) {
        return null;
    }

    return (
        <div className={`h-full bg-[#181A20] relative overflow-hidden flex flex-col ${sidebarOpen ? '' : 'w-full'}`}>
            <div className={`flex-1 flex min-h-0 ${sidebarOpen ? '' : 'w-full'}`}>
                {/* Central Content */}
                <div className={`flex-1 flex flex-col min-h-0 ${sidebarOpen ? '' : 'w-full'}`}>
                    {currentPage === 'dashboard' ? (
                        <>
                            {/* Stats Cards */}
                            <div className={`flex-shrink-0 p-6 pb-4 ${sidebarOpen ? '' : 'w-full'}`}>
                                <StatsCards stats={userStats} />
                            </div>

                            {/* Main Content */}
                            <div className={`flex-1 min-h-0 overflow-hidden ${sidebarOpen ? '' : 'w-full'}`}>
                                <div className={`h-full overflow-y-auto p-6 ${sidebarOpen ? '' : 'w-full'}`}>
                                    <MatchesGrid onSelectMatch={onMatchSelect} sidebarOpen={sidebarOpen} />
                                </div>
                            </div>
                        </>
                    ) : currentPage === 'rewards' ? (
                        <div className={`flex-1 overflow-y-auto p-6 ${sidebarOpen ? '' : 'w-full'}`}>
                            <RewardShop
                                userPoints={userStats.totalPoints}
                                onRedeem={(reward) => {
                                    console.log('Redeeming reward:', reward);
                                    // TODO: Implement reward redemption logic
                                }}
                            />
                        </div>
                    ) : (
                        <div className={`flex-1 overflow-y-auto p-6 ${sidebarOpen ? '' : 'w-full'}`}>
                            <Leaderboard />
                        </div>
                    )}
                </div>
                {/* Removed right sidebar PredictionSlip */}
            </div>
            {/* Removed FloatingPredictionButton */}
        </div>
    );
} 