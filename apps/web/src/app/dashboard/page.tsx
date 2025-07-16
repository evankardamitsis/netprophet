'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MatchDetail } from '@/components/dashboard/MatchDetail';
import { PredictionSlip } from '@/components/dashboard/PredictionSlip';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { TopNavigation } from '@/components/dashboard/TopNavigation';
import { MatchesGrid } from '@/components/dashboard/MatchesGrid';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import { RewardShop } from '@/components/dashboard/RewardShop';
import { Match, PredictionItem, UserStats } from '@/types/dashboard';

export default function DashboardPage() {
    const router = useRouter();
    const { user, signOut, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'leaderboard' | 'rewards'>('dashboard');
    const [predictionSlip, setPredictionSlip] = useState<PredictionItem[]>([]);

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

    const handleMatchSelect = (match: Match) => {
        setSelectedMatch(match);
        // Close sidebar on mobile after selection
        setSidebarOpen(false);
    };

    const addToPredictionSlip = (match: Match, prediction: string) => {
        const existingIndex = predictionSlip.findIndex(item => item.matchId === match.id);

        if (existingIndex >= 0) {
            // Update existing prediction
            const updatedSlip = [...predictionSlip];
            updatedSlip[existingIndex] = { ...updatedSlip[existingIndex], prediction };
            setPredictionSlip(updatedSlip);
        } else {
            // Add new prediction
            setPredictionSlip([...predictionSlip, {
                matchId: match.id,
                match,
                prediction,
                points: match.points
            }]);
        }
    };

    const removeFromPredictionSlip = (matchId: number) => {
        setPredictionSlip(predictionSlip.filter(item => item.matchId !== matchId));
    };

    const handleSubmitPredictions = () => {
        console.log('Submitting predictions:', predictionSlip);
        // TODO: Implement prediction submission
        alert(`Submitted ${predictionSlip.length} predictions!`);
    };

    const handleBackToMatches = () => {
        setSelectedMatch(null);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative">
            <div className="relative z-10 flex min-h-screen">
                {/* Sidebar */}
                <div className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white/90 backdrop-blur-md border-r border-white/20 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    <div className="h-full overflow-y-auto">
                        <Sidebar
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            onMatchSelect={handleMatchSelect}
                            selectedMatchId={selectedMatch?.id}
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Navigation */}
                    <TopNavigation
                        userEmail={user.email}
                        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                        onSignOut={handleSignOut}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />

                    {/* Content Area */}
                    <div className="flex-1 flex">
                        {/* Central Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {currentPage === 'dashboard' ? (
                                <>
                                    {/* Stats Cards */}
                                    <div className="p-6 pb-4">
                                        <StatsCards stats={userStats} />
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 flex overflow-hidden">
                                        {selectedMatch ? (
                                            <div className="flex-1 overflow-y-auto p-6">
                                                <MatchDetail
                                                    match={selectedMatch}
                                                    onAddToPredictionSlip={addToPredictionSlip}
                                                    onBack={handleBackToMatches}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto p-6">
                                                <MatchesGrid onAddToPredictionSlip={addToPredictionSlip} />
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : currentPage === 'rewards' ? (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <RewardShop
                                        userPoints={userStats.totalPoints}
                                        onRedeem={(reward) => {
                                            console.log('Redeeming reward:', reward);
                                            // TODO: Implement reward redemption logic
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Leaderboard />
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar - Prediction Slip */}
                        {currentPage === 'dashboard' && (
                            <div className="w-96 bg-white/90 backdrop-blur-md border-l border-white/20 hidden xl:block">
                                <div className="h-full overflow-y-auto">
                                    <PredictionSlip
                                        predictions={predictionSlip}
                                        onRemovePrediction={removeFromPredictionSlip}
                                        onSubmitPredictions={handleSubmitPredictions}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
} 