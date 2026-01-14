'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@netprophet/lib';
import { MatchDetail } from '@/components/matches/MatchDetail';
import { Match } from '@/types/dashboard';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

// Function to fetch a specific match
async function fetchMatch(id: string): Promise<Match | null> {
    const { data, error } = await supabase
        .from('matches')
        .select(`
            id,
            match_type,
            tournament_id,
            category_id,
            player_a_id,
            player_b_id,
            player_a1_id,
            player_a2_id,
            player_b1_id,
            player_b2_id,
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
                matches_type,
                is_team_tournament
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
            player_a1:players!matches_player_a1_id_fkey (
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
            player_a2:players!matches_player_a2_id_fkey (
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
            ),
            player_b1:players!matches_player_b1_id_fkey (
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
            player_b2:players!matches_player_b2_id_fkey (
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

    const isDoubles = (rawMatch.match_type || 'singles') === 'doubles';
    const isTeamTournament = rawMatch.tournaments?.is_team_tournament === true;

    // Helper function to get team name for a player
    const getTeamNameForPlayer = async (tournamentId: string | null, playerId: string | null): Promise<string | null> => {
        if (!tournamentId || !playerId || !isTeamTournament) return null;

        try {
            // First get the team_id from team_members
            const { data: teamMember } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('player_id', playerId)
                .single();

            if (!teamMember?.team_id) return null;

            // Then get the team name from tournament_teams
            const { data: team } = await supabase
                .from('tournament_teams')
                .select('name')
                .eq('id', teamMember.team_id)
                .eq('tournament_id', tournamentId)
                .single();

            return team?.name || null;
        } catch (error) {
            return null;
        }
    };

    // For team tournaments, get team names instead of player names
    let teamAName: string;
    let teamBName: string;

    if (isTeamTournament && !isDoubles) {
        // For singles team tournaments, get team name for each player
        const teamANameResult = await getTeamNameForPlayer(rawMatch.tournament_id, rawMatch.player_a_id);
        const teamBNameResult = await getTeamNameForPlayer(rawMatch.tournament_id, rawMatch.player_b_id);
        teamAName = teamANameResult || getPlayerName(rawMatch.player_a);
        teamBName = teamBNameResult || getPlayerName(rawMatch.player_b);
    } else {
        // Regular tournament or doubles - use player names
        teamAName = isDoubles && rawMatch.player_a1 && rawMatch.player_a2
            ? `${getPlayerName(rawMatch.player_a1)} & ${getPlayerName(rawMatch.player_a2)}`
            : getPlayerName(rawMatch.player_a);
        teamBName = isDoubles && rawMatch.player_b1 && rawMatch.player_b2
            ? `${getPlayerName(rawMatch.player_b1)} & ${getPlayerName(rawMatch.player_b2)}`
            : getPlayerName(rawMatch.player_b);
    }

    const transformedMatch = {
        id: rawMatch.id,
        match_type: rawMatch.match_type || 'singles',
        tournament_id: rawMatch.tournament_id,
        category_id: rawMatch.category_id,
        player_a_id: rawMatch.player_a_id,
        player_b_id: rawMatch.player_b_id,
        player_a1_id: rawMatch.player_a1_id || null,
        player_a2_id: rawMatch.player_a2_id || null,
        player_b1_id: rawMatch.player_b1_id || null,
        player_b2_id: rawMatch.player_b2_id || null,
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
        player_a1: rawMatch.player_a1,
        player_a2: rawMatch.player_a2,
        player_b1: rawMatch.player_b1,
        player_b2: rawMatch.player_b2,
        // Computed properties for web app compatibility
        tournament: (Array.isArray(rawMatch.tournaments) ? rawMatch.tournaments[0]?.name : rawMatch.tournaments?.name) || 'Unknown Tournament',
        player1: {
            name: teamAName,
            odds: rawMatch.odds_a || 1.0
        },
        player2: {
            name: teamBName,
            odds: rawMatch.odds_b || 1.0
        },
        team1: isDoubles ? { name: teamAName, odds: rawMatch.odds_a || 1.0, players: [rawMatch.player_a1, rawMatch.player_a2].filter(Boolean) } : undefined,
        team2: isDoubles ? { name: teamBName, odds: rawMatch.odds_b || 1.0, players: [rawMatch.player_b1, rawMatch.player_b2].filter(Boolean) } : undefined,
        time: rawMatch.start_time ? new Date(rawMatch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBD',
        status_display,
        points: 0, // Points are calculated dynamically
        locked: rawMatch.locked || false,
        updated_at: rawMatch.updated_at,
        startTime,
        lockTime,
        isLocked: rawMatch.locked || lockTime <= now
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