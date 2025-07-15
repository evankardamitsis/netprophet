'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MatchDetail } from '@/components/dashboard/MatchDetail';
import { MatchesGrid } from '@/components/dashboard/MatchesGrid';
import { PredictionSlip } from '@/components/dashboard/PredictionSlip';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { TopNavigation } from '@/components/dashboard/TopNavigation';
import { Match, PredictionItem, UserStats } from '@/types/dashboard';

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [predictionSlip, setPredictionSlip] = useState<PredictionItem[]>([]);

    // Mock stats data
    const userStats: UserStats = {
        totalPoints: 1250,
        correctPicks: 23,
        activeStreak: 7,
        ranking: 12
    };

    useEffect(() => {
        const checkAuth = async () => {
            console.log('🔍 Checking authentication status...');

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ Auth error:', error);
                router.push('/auth/signin');
                return;
            }

            if (!session) {
                console.log('❌ No session found, redirecting to signin');
                router.push('/auth/signin');
                return;
            }

            console.log('✅ Authenticated user:', session.user.email);
            setUser(session.user);
            setLoading(false);
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔄 Auth state changed:', event);

                if (event === 'SIGNED_OUT') {
                    console.log('👋 User signed out, redirecting to signin');
                    router.push('/auth/signin');
                } else if (event === 'SIGNED_IN' && session) {
                    console.log('✅ User signed in:', session.user.email);
                    setUser(session.user);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router]);

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
                points: 200 // Default points, could be dynamic based on match
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

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onMatchSelect={handleMatchSelect}
                selectedMatchId={selectedMatch?.id}
            />

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-0">
                {/* Top Navigation */}
                <TopNavigation
                    userEmail={user?.email}
                    onMenuClick={() => setSidebarOpen(true)}
                    onSignOut={handleSignOut}
                />

                {/* Content Grid */}
                <div className="flex">
                    {/* Central Content */}
                    <div className="flex-1">
                        {selectedMatch ? (
                            <MatchDetail
                                match={selectedMatch}
                                onAddToPredictionSlip={addToPredictionSlip}
                                onBack={() => setSelectedMatch(null)}
                            />
                        ) : (
                            <div className="p-6">
                                <div className="space-y-6">
                                    {/* Stats Cards */}
                                    <StatsCards stats={userStats} />

                                    {/* Matches Grid */}
                                    <MatchesGrid onAddToPredictionSlip={addToPredictionSlip} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Prediction Slip */}
                    <PredictionSlip
                        predictions={predictionSlip}
                        onRemovePrediction={removeFromPredictionSlip}
                        onSubmitPredictions={handleSubmitPredictions}
                    />
                </div>
            </div>
        </div>
    );
} 