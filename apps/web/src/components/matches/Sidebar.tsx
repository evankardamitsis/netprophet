'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { Card as UiCard } from '@/components/ui/card';
import { MatchesList } from '@/components/MatchesList';
import { supabase, MATCH_STATUSES } from '@netprophet/lib';

import { Match } from '@/types/dashboard';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { Dictionary } from '@/types/dictionary';

// Icon components
function ChevronDownIcon() {
    return <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
}

function ChevronRightIcon() {
    return <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
}

function XIcon() {
    return <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
}

interface Tournament {
    id: string;
    name: string;
    status: 'active' | 'upcoming' | 'finished';
    matches: Match[];
}

interface SidebarProps {
    onClose: () => void;
    onMatchSelect?: (match: Match) => void;
    selectedMatchId?: string;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    dict?: Dictionary;
    lang?: 'en' | 'el';
}



// Countdown component
function CountdownTimer({ lockTime, dict }: { lockTime: Date; dict?: Dictionary }) {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = lockTime.getTime() - Date.now();
            return Math.max(0, difference);
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            if (newTimeLeft <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [lockTime]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return dict?.sidebar?.locked || 'LOCKED';

        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}${dict?.sidebar?.hours || 'h'} ${minutes}${dict?.sidebar?.minutes || 'm'}`;
        } if (minutes > 0) {
            return `${minutes}${dict?.sidebar?.minutes || 'm'} ${seconds}${dict?.sidebar?.seconds || 's'}`;
        }
        return `${seconds}${dict?.sidebar?.seconds || 's'}`;

    };

    const isUrgent = timeLeft < 5 * 60 * 1000; // Less than 5 minutes
    const isVeryUrgent = timeLeft < 60 * 1000; // Less than 1 minute

    return (
        <div className={`text-xs font-mono ${isVeryUrgent ? 'text-red-400 animate-pulse' : isUrgent ? 'text-orange-400' : 'text-gray-400'}`}>
            {formatTime(timeLeft)}
        </div>
    );
}

// Live Match Banner component
function LiveMatchBanner({ matches, dict }: { matches: Match[]; dict?: Dictionary }) {
    const liveMatches = matches.filter(match => match.status_display === 'live' && !match.isLocked);

    if (liveMatches.length === 0) return null;

    return (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-dashed border-red-700/50 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">🔥</span>
                <span className="font-semibold text-red-300 tracking-wide">{dict?.sidebar?.liveMatches || 'Live Matches'}</span>
                <Badge variant="destructive" className="text-xs bg-red-900/50 text-red-300 border border-red-500">
                    {liveMatches.length}
                </Badge>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
                {liveMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-red-700/40">
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-yellow-200">
                                {match.player1.name.split(' ')[1] || match.player1.name} {dict?.sidebar?.versus || 'v'} {match.player2.name.split(' ')[1] || match.player2.name}
                            </div>

                        </div>
                        <div className="text-right">
                            <CountdownTimer lockTime={match.lockTime} dict={dict} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Function to fetch synced matches (same as in MatchesList)
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
        .eq('web_synced', true)
        .order('start_time', { ascending: true });

    if (error) throw error;

    // Transform raw database match to web app format (same logic as in MatchesList)
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
    });
}

export function Sidebar({ onClose, sidebarOpen, setSidebarOpen, onMatchSelect: onMatchSelectProp, dict, lang = 'en' }: SidebarProps) {
    const matchSelectFromContext = useMatchSelect();
    const onMatchSelect = onMatchSelectProp || matchSelectFromContext;
    const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set(["1"])); // Default expand first tournament
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    // Fetch synced matches
    const { data: allMatches = [], isLoading } = useQuery({
        queryKey: ['syncedMatches'],
        queryFn: fetchSyncedMatches,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const toggleTournament = (tournamentId: string) => {
        const newExpanded = new Set(expandedTournaments);
        if (newExpanded.has(tournamentId)) {
            newExpanded.delete(tournamentId);
        } else {
            newExpanded.add(tournamentId);
        }
        setExpandedTournaments(newExpanded);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getMatchStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    return (
        <aside
            className={`h-full flex flex-col transition-all duration-300 ease-in-out
                bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
                ${sidebarOpen
                    ? 'w-full max-w-[320px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[460px] xl:w-[400px]'
                    : 'w-48'
                }
            `}
            style={{
                minHeight: '100vh'
            }}
        >
            {sidebarOpen ? (
                // Expanded view
                <div className="flex flex-col h-full pt-4 p-1.5 sm:p-2 md:p-3 lg:p-4 min-w-0">
                    <Card className="flex-1 overflow-hidden bg-gradient-to-br from-slate-950/50 via-slate-900/30 to-slate-950/50 min-w-0 shadow-none border-0">
                        <div className="h-full overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500 custom-scrollbar">
                            <MatchesList onSelectMatch={onMatchSelect} dict={dict} lang={lang} />
                        </div>
                    </Card>
                </div>
            ) : (
                // Compact view - clickable to expand
                <div
                    className="flex flex-col h-full p-2 sm:p-3 min-w-0 cursor-pointer hover:bg-slate-800/20 transition-colors"
                    onClick={() => setSidebarOpen(true)}
                    title={dict?.sidebar?.expandSidebar || 'Click to expand sidebar'}
                >
                    <div className="flex-1 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500 custom-scrollbar">
                        <div className="flex flex-col gap-1 sm:gap-2 min-w-0">
                            {/* Live matches */}
                            {allMatches.filter(m => m.status_display === 'live' && !m.isLocked).length > 0 && (
                                <div className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1 px-1">
                                    {dict?.sidebar?.live || 'Live'}
                                </div>
                            )}
                            {allMatches.filter(m => m.status_display === 'live' && !m.isLocked).map((match) => (
                                <button
                                    key={match.id}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent sidebar expansion
                                        onMatchSelect && onMatchSelect(match);
                                    }}
                                    className="w-full p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer hover:bg-accent/10 border-l-2 border-red-500 bg-red-900/20 min-w-0"
                                    title={`${match.player1.name} vs ${match.player2.name}`}
                                >
                                    <div className="text-xs sm:text-sm font-semibold text-left leading-tight truncate">
                                        {match.player1.name.split(' ')[1] || match.player1.name} {dict?.sidebar?.versus || 'v'} {match.player2.name.split(' ')[1] || match.player2.name}
                                    </div>

                                </button>
                            ))}

                            {/* Upcoming matches */}
                            {allMatches.filter(m => m.status_display === 'upcoming' && !m.isLocked).length > 0 && (
                                <div className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1 mt-2 sm:mt-3 px-1">
                                    {dict?.sidebar?.upcoming || 'Upcoming'}
                                </div>
                            )}
                            {allMatches.filter(m => m.status_display === 'upcoming' && !m.isLocked).map((match) => (
                                <button
                                    key={match.id}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent sidebar expansion
                                        onMatchSelect && onMatchSelect(match);
                                    }}
                                    className="w-full p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer hover:bg-accent/10 border-l-2 border-blue-500 bg-blue-900/20 min-w-0"
                                    title={`${match.player1.name} vs ${match.player2.name} - ${match.time}`}
                                >
                                    <div className="text-xs sm:text-sm font-semibold text-left leading-tight truncate">
                                        {match.player1.name.split(' ')[1] || match.player1.name} {dict?.sidebar?.versus || 'v'} {match.player2.name.split(' ')[1] || match.player2.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{match.time}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Expand indicator - fixed at bottom */}
                    <div className="flex-shrink-0 pt-2">
                        <div className="w-full p-2 rounded-lg flex items-center justify-center transition-colors bg-gradient-to-r from-slate-950 to-slate-900 text-gray-300">
                            <ChevronRightIcon />
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
} 