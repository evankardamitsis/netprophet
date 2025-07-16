'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MatchDetail } from '@/components/dashboard/MatchDetail';
import { PredictionSlip, FloatingPredictionButton } from '@/components/dashboard/PredictionSlip';
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
    const [isPredictionSlipCollapsed, setIsPredictionSlipCollapsed] = useState(false);
    const [showFloatingButton, setShowFloatingButton] = useState(false);

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

    // Handle floating button visibility
    useEffect(() => {
        setShowFloatingButton(isPredictionSlipCollapsed && predictionSlip.length > 0);
    }, [isPredictionSlipCollapsed, predictionSlip.length]);

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

        // Automatically expand the prediction slip when predictions are added
        if (isPredictionSlipCollapsed) {
            setIsPredictionSlipCollapsed(false);
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

    const handleExpandPredictionSlip = () => {
        // Add a small delay to make the animation feel more natural
        setTimeout(() => {
            setIsPredictionSlipCollapsed(false);
        }, 100);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative overflow-hidden">
            <div className="relative z-10 flex h-full">
                {/* Sidebar */}
                <div className={`fixed lg:static inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        onMatchSelect={handleMatchSelect}
                        selectedMatchId={selectedMatch?.id}
                    />
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
                    <div className="flex-1 flex min-h-0">
                        {/* Central Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {currentPage === 'dashboard' ? (
                                <>
                                    {/* Stats Cards */}
                                    <div className="flex-shrink-0 p-6 pb-4">
                                        <StatsCards stats={userStats} />
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 min-h-0 overflow-hidden">
                                        {selectedMatch ? (
                                            <div className="h-full overflow-y-auto p-6">
                                                <MatchDetail
                                                    match={selectedMatch}
                                                    onAddToPredictionSlip={addToPredictionSlip}
                                                    onBack={handleBackToMatches}
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-full overflow-y-auto p-6">
                                                <MatchesGrid onSelectMatch={handleMatchSelect} />
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
                            <div className={`bg-white/90 backdrop-blur-md border-l border-white/20 hidden xl:block transition-all duration-300 ease-in-out ${isPredictionSlipCollapsed ? 'w-0' : 'w-96'}`}>
                                <div className="h-full overflow-y-auto">
                                    <PredictionSlip
                                        predictions={predictionSlip}
                                        onRemovePrediction={removeFromPredictionSlip}
                                        onSubmitPredictions={handleSubmitPredictions}
                                        isCollapsed={isPredictionSlipCollapsed}
                                        onToggleCollapse={() => setIsPredictionSlipCollapsed(!isPredictionSlipCollapsed)}
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

            {/* Floating Prediction Button - shows when slip is collapsed */}
            <AnimatePresence>
                {currentPage === 'dashboard' && showFloatingButton && (
                    <FloatingPredictionButton
                        predictions={predictionSlip}
                        onClick={handleExpandPredictionSlip}
                    />
                )}
            </AnimatePresence>
        </div>
    );
} 