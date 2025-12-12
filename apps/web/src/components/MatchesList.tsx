'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, MATCH_STATUSES } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
import { useTheme } from './Providers';
import { Dictionary } from '@/types/dictionary';
import { Match } from '@/types/dashboard';

// Use database types directly
import type { Database } from '@netprophet/lib/src/types/database';
type RawMatch = Database['public']['Tables']['matches']['Row'] & {
    tournaments?: any;
    tournament_categories?: any;
    player_a?: any;
    player_b?: any;
    player_a1?: any;
    player_a2?: any;
    player_b1?: any;
    player_b2?: any;
};

// Transform raw database match to web app format
function transformMatch(rawMatch: RawMatch): Match {
    const getPlayerName = (player: RawMatch['player_a']) => {
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

    const isDoubles = (rawMatch.match_type || 'singles') === 'doubles';

    const teamAName = isDoubles && rawMatch.player_a1 && rawMatch.player_a2
        ? `${getPlayerName(rawMatch.player_a1)} & ${getPlayerName(rawMatch.player_a2)}`
        : getPlayerName(rawMatch.player_a);

    const teamBName = isDoubles && rawMatch.player_b1 && rawMatch.player_b2
        ? `${getPlayerName(rawMatch.player_b1)} & ${getPlayerName(rawMatch.player_b2)}`
        : getPlayerName(rawMatch.player_b);

    return {
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
        web_synced: rawMatch.web_synced || false,
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
        locked: rawMatch.locked || (lockTime <= now),
        updated_at: rawMatch.updated_at,
        startTime,
        lockTime,
        isLocked: rawMatch.locked || lockTime <= now
    };
}

export async function fetchSyncedMatches(): Promise<Match[]> {
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
            tournaments!inner (
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
        .eq('web_synced', true)
        .order('start_time', { ascending: true })
        .limit(100); // Restore reasonable limit

    if (error) throw error;

    return (data || []).map((rawMatch: any) => transformMatch(rawMatch));
}



interface MatchesListProps {
    onSelectMatch?: (match: any) => void;
    dict?: Dictionary;
    lang?: 'en' | 'el';
}

function Countdown({ targetTime, label, dict, isLocked }: { targetTime: Date; label: string; dict?: Dictionary; isLocked?: boolean }) {
    const [timeLeft, setTimeLeft] = useState<number>(targetTime.getTime() - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(targetTime.getTime() - Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetTime]);

    if (isLocked || timeLeft <= 0) return <span className="text-xs text-red-500 font-bold">{dict?.sidebar?.locked || 'LOCKED'}</span>;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // If more than 1 day, show only days
    if (days > 1) {
        return (
            <span className="text-xs text-gray-500">
                {label}: {days} {dict?.sidebar?.days || 'days'}
            </span>
        );
    }

    // If 1 day or less, show hours, minutes, seconds
    return (
        <span className="text-xs text-gray-500">
            {label}: {days > 0 ? `${days}${dict?.sidebar?.days?.charAt(0) || 'd'} ` : ''}{hours > 0 ? `${hours}${dict?.sidebar?.hours || 'h'} ` : ''}{minutes}${dict?.sidebar?.minutes || 'm'} {seconds}${dict?.sidebar?.seconds || 's'}
        </span>
    );
}

export function MatchesList({ onSelectMatch, dict, lang = 'en' }: MatchesListProps) {
    const { data: matches = [], isLoading, error } = useQuery({
        queryKey: ['syncedMatches'],
        queryFn: fetchSyncedMatches,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: false, // Don't refetch on mount if data exists
        retry: 2, // Retry failed requests twice
        retryDelay: 1000, // Wait 1 second between retries
        gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    });

    const { theme } = useTheme();

    if (isLoading) return <div>{dict?.common?.loading || 'Loading matches...'}</div>;
    if (error) return <div>{dict?.common?.error || 'Error loading matches.'}</div>;

    const liveMatches = matches.filter(m => m.status_display === 'live');
    const upcomingMatches = matches.filter(m => m.status_display === 'upcoming');

    return (
        <div className="h-full flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 md:space-y-4 px-1 sm:px-2 md:px-3 lg:px-4 pb-16 min-w-0">
                {liveMatches.length > 0 && (
                    <div>
                        <div className={`text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wide uppercase ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                            {dict?.sidebar?.liveMatches || 'Live Matches'}
                        </div>
                        <div className="space-y-2 sm:space-y-3 min-w-0">
                            {liveMatches.map(match => (
                                <div
                                    key={match.id}
                                    className={`border rounded-lg sm:rounded-xl pt-5 pb-1 px-1 sm:pt-5 sm:pb-1.5 sm:px-1.5 md:pt-5 md:pb-2 md:px-2 flex flex-col justify-between transition-all duration-150 min-w-0 h-24 sm:h-28 md:h-32 relative ${match.locked
                                        ? `${theme === 'dark' ? 'border-gray-500 bg-slate-800/50' : 'border-gray-400 bg-gray-100'} cursor-not-allowed opacity-75`
                                        : `${theme === 'dark' ? 'border-red-400 bg-slate-800/50 backdrop-blur-sm hover:bg-red-900/10' : 'border-red-200 bg-white hover:bg-red-50'} cursor-pointer`
                                        }`}
                                    onClick={() => !match.locked && onSelectMatch?.(match)}
                                >
                                    <span className={`absolute top-0.5 right-0.5 text-[9px] font-bold px-1 py-0.5 rounded ${match.locked
                                        ? `${theme === 'dark' ? 'bg-gray-600/20 text-gray-400' : 'bg-gray-200 text-gray-600'}`
                                        : `${theme === 'dark' ? 'bg-red-400/20 text-red-300' : 'bg-red-100 text-red-600'}`
                                        }`}>
                                        {dict?.sidebar?.live || 'LIVE'}
                                    </span>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0 sm:gap-0.5">
                                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-0 sm:gap-0.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-0 sm:gap-0.5 min-w-0">
                                                <span className={`font-semibold text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {match.player1.name}
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 flex-shrink-0">{dict?.matches?.vs || dict?.sidebar?.versus || 'vs'}</span>
                                                <span className={`font-semibold text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {match.player2.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-0 sm:gap-0.5">
                                        <span className="truncate">{match.player1.odds.toFixed(2)} | {match.player2.odds.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-500 gap-0 sm:gap-0.5">
                                        <div className="flex flex-col">
                                            <span className="truncate font-bold">{match.tournament}</span>
                                            {match.round && (
                                                <span className="text-xs text-gray-400">{match.round}</span>
                                            )}
                                        </div>
                                        <span>{match.time} • {new Date(match.startTime).toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-0 sm:gap-0.5">
                                        <Countdown targetTime={match.lockTime} label={dict?.sidebar?.lockIn || 'Lock in'} dict={dict} isLocked={match.locked || false} />
                                        <span className={`text-gray-400`}>{dict?.sidebar?.startedAgo || 'Started'} {Math.floor((Date.now() - match.startTime.getTime()) / 60000)} {dict?.sidebar?.minutes || 'min'} {dict?.common?.ago || 'ago'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {upcomingMatches.length > 0 && (
                    <div>
                        <div className={`text-xs sm:text-sm font-bold mb-2 sm:mb-3 tracking-wide uppercase ${theme === 'dark' ? 'text-blue-400' : 'text-gray-700'}`}>
                            {dict?.sidebar?.upcoming || 'Upcoming Matches'}
                        </div>
                        <div className="space-y-2 sm:space-y-3 min-w-0">
                            {upcomingMatches.map(match => (
                                <div
                                    key={match.id}
                                    className={`border rounded-lg sm:rounded-xl pt-5 pb-1 px-1 sm:pt-5 sm:pb-1.5 sm:px-1.5 md:pt-5 md:pb-2 md:px-2 flex flex-col justify-between transition-all duration-150 min-w-0 h-24 sm:h-28 md:h-32 relative ${match.locked
                                        ? `${theme === 'dark' ? 'border-gray-600 bg-slate-800/30' : 'border-gray-300 bg-gray-50'} cursor-not-allowed opacity-60`
                                        : `${theme === 'dark' ? 'border-blue-400 bg-slate-800/50 backdrop-blur-sm hover:bg-blue-900/10' : 'border-blue-200 bg-white hover:bg-blue-50'} cursor-pointer`
                                        }`}
                                    onClick={() => !match.locked && onSelectMatch?.(match)}
                                >
                                    <span className={`absolute top-0.5 right-0.5 text-[9px] font-bold px-1 py-0.5 rounded ${match.locked
                                        ? `${theme === 'dark' ? 'bg-gray-600/20 text-gray-400' : 'bg-gray-200 text-gray-600'}`
                                        : `${theme === 'dark' ? 'bg-blue-400/20 text-blue-300' : 'bg-blue-100 text-blue-600'}`
                                        }`}>
                                        {match.locked ? 'LOCKED' : (dict?.sidebar?.upcoming || 'UPCOMING')}
                                    </span>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0 sm:gap-0.5">
                                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-0 sm:gap-0.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-0 sm:gap-0.5 min-w-0">
                                                <span className={`font-semibold text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {match.player1.name}
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 flex-shrink-0">{dict?.matches?.vs || dict?.sidebar?.versus || 'vs'}</span>
                                                <span className={`font-semibold text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {match.player2.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-0 sm:gap-0.5">
                                        <span className="truncate">{match.player1.odds.toFixed(2)} | {match.player2.odds.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-500 gap-0 sm:gap-0.5">
                                        <div className="flex flex-col">
                                            <span className="truncate font-bold">{match.tournament}</span>
                                            {match.round && (
                                                <span className="text-xs text-gray-400">{match.round}</span>
                                            )}
                                        </div>
                                        <span>{match.time} • {new Date(match.startTime).toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-0 sm:gap-0.5">
                                        <Countdown targetTime={match.startTime} label={dict?.sidebar?.startsIn || 'Starts in'} dict={dict} isLocked={match.locked || false} />
                                        <span className={`text-gray-400`}>{new Date(match.startTime).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {matches.length === 0 && (
                    <div className={`text-center py-8 sm:py-12 text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {dict?.matches?.noMatches || 'No matches available'}
                    </div>
                )}
            </div>
        </div>
    );
} 