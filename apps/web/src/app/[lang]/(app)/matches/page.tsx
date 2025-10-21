'use client';

import { useState, useEffect } from 'react';
import { AllMatches } from '@/components/matches/AllMatches';
import { MatchDetail } from '@/components/matches/MatchDetail';
import { PromotionalHero } from '@/components/matches/PromotionalHero';
import { TournamentFilter } from '@/components/matches/TournamentFilter';
import { Match } from '@/types/dashboard';
import { WelcomeBonus } from '@/components/matches/WelcomeBonus';
import { useMatches } from '@/hooks/useMatches';
import { useDictionary } from '@/context/DictionaryContext';
import { gradients, shadows, borders, transitions, animations, cx, typography } from '@/styles/design-system';

import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { LowBalanceNotification } from '@/components/matches/LowBalanceNotification';
import { useAuth } from '@/hooks/useAuth';
import { useProfileClaim } from '@/hooks/useProfileClaim';
import { useProfileSetupModal } from '@/context/ProfileSetupModalContext';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';



export default function DashboardPage() {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { showProfileSetup, setShowProfileSetup } = useProfileSetupModal();
    const { slipCollapsed, resetSlipState } = usePredictionSlip();
    const { user } = useAuth();
    const { needsProfileSetup, loading: profileLoading } = useProfileClaim(user?.id || null);
    const { dict } = useDictionary();

    // Use the shared matches hook
    const {
        matches,
        liveMatches,
        upcomingMatches,
        selectedTournament,
        setSelectedTournament,
        loading: isLoading,
        error
    } = useMatches();

    // Show profile setup modal if needed
    useEffect(() => {
        if (!profileLoading && needsProfileSetup && user) {
            setShowProfileSetup(true);
        }
    }, [needsProfileSetup, profileLoading, user, setShowProfileSetup]);

    // Get featured matches (top 3 upcoming matches with highest odds)
    const getFeaturedMatches = (matches: Match[]): Match[] => {
        return matches
            .filter(match => match.status === 'upcoming' && !match.isLocked)
            .sort((a, b) => {
                // Sort by highest combined odds
                const aOdds = (a.player1.odds + a.player2.odds) / 2;
                const bOdds = (b.player1.odds + b.player2.odds) / 2;
                return bOdds - aOdds;
            })
            .slice(0, 3);
    };

    // Get language from URL path
    const lang = typeof window !== 'undefined'
        ? window.location.pathname.startsWith('/el') ? 'el' : 'en'
        : 'en';

    // Note: Removed resetSlipState() call as it was clearing predictions on every page navigation
    // The slip state should persist across page navigations




    const handleSelectMatch = (match: Match) => {
        setSelectedMatch(match);
    };

    const handleBackToMatches = () => {
        setSelectedMatch(null);
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                <WelcomeBonus />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="text-2xl mb-4">🎾</div>
                        <div>Loading matches...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                <WelcomeBonus />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="text-2xl mb-4">❌</div>
                        <div>Error loading matches</div>
                    </div>
                </div>
            </div>
        );
    }

    const featuredMatches = getFeaturedMatches(matches);

    return (
        <div className="min-h-full">
            <WelcomeBonus />


            {selectedMatch ? (
                <MatchDetail
                    match={selectedMatch}
                    onAddToPredictionSlip={() => { }}
                    onBack={handleBackToMatches}
                    sidebarOpen={sidebarOpen}
                />
            ) : (
                <>
                    {/* Promotional Hero Section */}
                    {featuredMatches.length > 0 && (
                        <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-6">
                            <PromotionalHero
                                featuredMatches={featuredMatches}
                                onSelectMatch={handleSelectMatch}
                                lang={lang}
                            />
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex flex-col w-full text-white relative">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400 rounded-full opacity-10 blur-3xl pointer-events-none animate-pulse"></div>
                        <div className="absolute bottom-40 left-10 w-48 h-48 bg-yellow-400 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ animationDelay: '1.5s' }}></div>

                        {/* Header Section */}
                        <div className="p-3 xs:p-4 sm:p-5 md:p-6 pb-2 xs:pb-3 sm:pb-4 relative z-10">
                            <h1 className={cx(typography.heading.lg, " mb-1 xs:mb-2")}>
                                🎾 {dict?.matches?.title || 'Tennis Matches'}
                            </h1>
                            <p className={cx(typography.body.md, "text-gray-300")}>{dict?.matches?.loading || 'Monitor tennis games and place your predictions'}</p>
                        </div>

                        {/* Tournament Filter */}
                        <TournamentFilter
                            matches={matches}
                            onTournamentSelect={setSelectedTournament}
                            selectedTournament={selectedTournament}
                        />

                        {/* Content Section */}
                        <div className="px-3 xs:px-4 sm:px-5 md:px-6 relative z-10">
                            {/* All Matches - Grid for Live, Table for Upcoming */}
                            <AllMatches
                                liveMatches={liveMatches}
                                upcomingMatches={upcomingMatches}
                                onSelectMatch={handleSelectMatch}
                                sidebarOpen={sidebarOpen}
                                slipCollapsed={slipCollapsed}
                            />

                            {/* No Matches State */}
                            {matches.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🎾</div>
                                    <h2 className="text-2xl font-semibold mb-2 text-white">{dict?.matches?.noMatches || 'No Tennis Matches Available'}</h2>
                                    <p className="text-gray-400">{dict?.matches?.loading || 'Check back later for upcoming tennis matches'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
} 