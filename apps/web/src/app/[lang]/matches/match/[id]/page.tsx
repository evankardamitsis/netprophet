'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@netprophet/lib';
import { MatchDetail } from '@/components/matches/MatchDetail';
import { Match } from '@/types/dashboard';

// Function to fetch a specific match
async function fetchMatch(id: string): Promise<Match | null> {
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
            start_time,
            lock_time,
            odds_a,
            odds_b,
            a_score,
            b_score,
            points_value,
            web_synced,
            tournaments (
                id,
                name,
                surface,
                location
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
                surface_preference
            ),
            player_b:players!matches_player_b_id_fkey (
                id,
                first_name,
                last_name,
                ntrp_rating,
                surface_preference
            )
        `)
        .eq('id', id)
        .eq('web_synced', true)
        .single();

    if (error || !data) return null;

    // Transform raw database match to web app format
    const rawMatch: any = data;

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
    if (rawMatch.status === 'live') {
        status_display = 'live';
    } else if (rawMatch.status === 'finished') {
        status_display = 'finished';
    } else if (startTime <= now) {
        status_display = 'live';
    }

    const transformedMatch = {
        id: rawMatch.id,
        tournament_id: rawMatch.tournament_id,
        category_id: rawMatch.category_id,
        player_a_id: rawMatch.player_a_id,
        player_b_id: rawMatch.player_b_id,
        winner_id: rawMatch.winner_id,
        status: rawMatch.status,
        start_time: rawMatch.start_time,
        lock_time: rawMatch.lock_time,
        odds_a: rawMatch.odds_a,
        odds_b: rawMatch.odds_b,
        a_score: rawMatch.a_score,
        b_score: rawMatch.b_score,
        points_value: rawMatch.points_value,
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
        points: rawMatch.points_value,
        startTime,
        lockTime,
        isLocked: lockTime <= now
    };

    return transformedMatch;
}

export default function MatchDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const lang = params?.lang as string;

    const { data: match, isLoading, error } = useQuery({
        queryKey: ['match', id],
        queryFn: () => fetchMatch(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col min-h-0 h-full p-6">
                <div className="flex items-center justify-center h-full">
                    <div className="text-white text-center">
                        <div className="text-2xl mb-4">🎾</div>
                        <div>Loading match...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col min-h-0 h-full p-6">
                <div className="flex items-center justify-center h-full">
                    <div className="text-white text-center">
                        <div className="text-2xl mb-4">❌</div>
                        <div>Error loading match: {error.message}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="flex-1 flex flex-col min-h-0 h-full p-6">
                <div className="flex items-center justify-center h-full">
                    <div className="text-white text-center">
                        <div className="text-2xl mb-4">❌</div>
                        <div>Match not found</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full p-6">
            <MatchDetail
                match={match}
                onAddToPredictionSlip={() => { }}
                onBack={() => router.push(`/${lang}/matches`)}
            />
        </div>
    );
} 