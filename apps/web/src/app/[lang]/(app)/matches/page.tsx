'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, MATCH_STATUSES } from '@netprophet/lib';
import { MatchesGrid } from '@/components/matches/MatchesGrid';
import { MatchDetail } from '@/components/matches/MatchDetail';
import { PromotionalHero } from '@/components/matches/PromotionalHero';
import { Match } from '@/types/dashboard';
import { WelcomeBonus } from '@/components/matches/WelcomeBonus';

import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { LowBalanceNotification } from '@/components/matches/LowBalanceNotification';
import { useAuth } from '@/hooks/useAuth';
import { useProfileClaim } from '@/hooks/useProfileClaim';
import { useProfileSetupModal } from '@/context/ProfileSetupModalContext';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';


// Function to fetch synced matches
async function fetchSyncedMatches(): Promise<Match[]> {
    const { data, error } = await supabase
        .from('matches')
        .select(`
            id,
            tournament_id,
            category_id,
            player_a_id,
            player_b_id,
            winner_id,
            status,
            round,
            start_time,
            lock_time,
            odds_a,
            odds_b,
            web_synced,
            locked,
            updated_at,
            tournaments (
                id,
                name,
                surface,
                location,
                matches_type
            ),
            tournament_categories (
                id,
                name
            ),
            player_a:players!matches_player_a_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            ),
            player_b:players!matches_player_b_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference,
                wins,
                losses,
                last5,
                current_streak,
                streak_type
            )
        `)
        .eq('web_synced', true)
        .order('start_time', { ascending: true });

    if (error) throw error;

    // Transform raw database match to web app format
    return (data || []).map((rawMatch: any) => {
        const getPlayerName = (player: any) => {
            if (player?.first_name && player?.last_name) {
                return `${player.first_name} ${player.last_name}`;
            }
            return 'TBD';
        };

        const startTime = rawMatch.start_time ? new Date(rawMatch.start_time) : new Date();
        const lockTime = rawMatch.lock_time ? new Date(rawMatch.lock_time) : new Date();
        const now = new Date();

        let status_display: 'live' | 'upcoming' | 'finished' = 'upcoming';
        if (rawMatch.status === MATCH_STATUSES.LIVE) {
            status_display = 'live';
        } else if (rawMatch.status === MATCH_STATUSES.FINISHED) {
            status_display = 'finished';
        } else if (startTime <= now) {
            status_display = 'live';
        }

        return {
            id: rawMatch.id,
            tournament_id: rawMatch.tournament_id,
            category_id: rawMatch.category_id,
            player_a_id: rawMatch.player_a_id,
            player_b_id: rawMatch.player_b_id,
            winner_id: rawMatch.winner_id,
            status: rawMatch.status,
            round: rawMatch.round,
            start_time: rawMatch.start_time,
            lock_time: rawMatch.lock_time,
            odds_a: rawMatch.odds_a,
            odds_b: rawMatch.odds_b,
            web_synced: rawMatch.web_synced,
            tournaments: Array.isArray(rawMatch.tournaments) ? rawMatch.tournaments[0] : rawMatch.tournaments,
            tournament_categories: Array.isArray(rawMatch.tournament_categories) ? rawMatch.tournament_categories[0] : rawMatch.tournament_categories,
            player_a: rawMatch.player_a,
            player_b: rawMatch.player_b,
            // Computed properties for web app compatibility
            tournament: (Array.isArray(rawMatch.tournaments) ? rawMatch.tournaments[0]?.name : rawMatch.tournaments?.name) || 'Unknown Tournament',
            player1: {
                name: getPlayerName(rawMatch.player_a),
                odds: rawMatch.odds_a || 1.0
            },
            player2: {
                name: getPlayerName(rawMatch.player_b),
                odds: rawMatch.odds_b || 1.0
            },
            time: rawMatch.start_time ? new Date(rawMatch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBD',
            status_display,
            points: 0, // Points are calculated dynamically
            locked: rawMatch.locked || (lockTime <= now),
            updated_at: rawMatch.updated_at,
            startTime,
            lockTime,
            isLocked: rawMatch.locked || lockTime <= now
        };
    });
}

export default function DashboardPage() {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { showProfileSetup, setShowProfileSetup } = useProfileSetupModal();
    const { slipCollapsed, resetSlipState } = usePredictionSlip();
    const { user } = useAuth();
    const { needsProfileSetup, loading: profileLoading } = useProfileClaim(user?.id || null);

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

    // Fetch synced matches
    const { data: matches = [], isLoading, error } = useQuery({
        queryKey: ['syncedMatches'],
        queryFn: fetchSyncedMatches,
        refetchInterval: 30000, // Refetch every 30 seconds
    });




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

                    {/* Regular Matches Grid */}
                    <MatchesGrid
                        matches={matches}
                        onSelectMatch={handleSelectMatch}
                        sidebarOpen={sidebarOpen}
                        slipCollapsed={slipCollapsed}
                    />
                </>
            )}
        </div>
    );
} 