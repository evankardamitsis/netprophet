'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { Card as UiCard } from '@/components/ui/card';
import { MatchesList } from '@/components/MatchesList';
import { supabase, MATCH_STATUSES } from '@netprophet/lib';
import { motion } from 'framer-motion';
import { gradients, shadows, borders, transitions, animations, typography, cx } from '@/styles/design-system';

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
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cx(
                "mb-4 p-4 border border-dashed border-red-700/50 backdrop-blur-sm",
                "bg-gradient-to-r from-red-900/30 to-orange-900/30",
                borders.rounded.md,
                shadows.glow.orange
            )}
        >
            <div className="flex items-center space-x-2 mb-3">
                <motion.span
                    className="text-lg"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    🔥
                </motion.span>
                <span className="font-semibold text-red-300 tracking-wide">{dict?.sidebar?.liveMatches || 'Live Matches'}</span>
                <Badge variant="destructive" className="text-xs bg-red-900/50 text-red-300 border border-red-500 animate-pulse">
                    {liveMatches.length}
                </Badge>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
                {liveMatches.map((match, index) => (
                    <motion.div
                        key={match.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cx(
                            "flex items-center justify-between p-3 bg-slate-900/90 border-2 border-red-500/50",
                            borders.rounded.sm,
                            transitions.default,
                            "hover:bg-slate-800/90 hover:border-red-400/70",
                            shadows.card
                        )}
                    >
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-white truncate">
                                {match.player1.name.split(' ')[1] || match.player1.name} {dict?.sidebar?.versus || 'v'} {match.player2.name.split(' ')[1] || match.player2.name}
                            </div>

                        </div>
                        <div className="text-right">
                            <CountdownTimer lockTime={match.lockTime} dict={dict} />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// Import the fetchSyncedMatches function from MatchesList to ensure consistency
import { fetchSyncedMatches } from '@/components/MatchesList';

export function Sidebar({ onClose, sidebarOpen, setSidebarOpen, onMatchSelect: onMatchSelectProp, dict, lang = 'en' }: SidebarProps) {
    const matchSelectFromContext = useMatchSelect();
    const onMatchSelect = onMatchSelectProp || matchSelectFromContext;
    const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set(["1"])); // Default expand first tournament
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    // Fetch synced matches
    const { data: allMatches = [], isLoading } = useQuery<Match[]>({
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
            className={cx(
                "h-full flex flex-col relative overflow-hidden",
                gradients.gameBackground,
                transitions.default,
                sidebarOpen
                    ? 'w-full max-w-[320px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[460px] xl:w-[400px] rounded-r-3xl'
                    : 'w-48 rounded-r-3xl'
            )}
            style={{
                minHeight: '100vh'
            }}
        >
            {/* Decorative elements for sidebar - Game-like aesthetic */}
            <div className="absolute top-10 right-5 w-24 h-24 bg-purple-400 rounded-full opacity-10 blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-20 left-5 w-32 h-32 bg-blue-400 rounded-full opacity-10 blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/3 left-10 w-20 h-20 bg-pink-400 rounded-full opacity-10 blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

            {sidebarOpen ? (
                // Expanded view
                <div className="flex flex-col h-full pt-2 px-2 pb-2 min-w-0 relative z-10">
                    <div className="flex-1 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500 custom-scrollbar">
                        <MatchesList onSelectMatch={onMatchSelect} dict={dict} lang={lang} />
                    </div>
                </div>
            ) : (
                // Compact view - clickable to expand
                <div
                    className={cx(
                        "flex flex-col h-full p-2 sm:p-3 min-w-0 cursor-pointer hover:bg-blue-800/20 rounded-3xl relative z-10",
                        transitions.default
                    )}
                    onClick={(e) => {
                        // Only expand if clicking on the container itself, not on match buttons
                        if (e.target === e.currentTarget) {
                            setSidebarOpen(true);
                        }
                    }}
                    title={dict?.sidebar?.expandSidebar || 'Click to expand sidebar'}
                >
                    <div className="flex-1 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500 custom-scrollbar">
                        <div className="flex flex-col gap-1 sm:gap-2 min-w-0">

                            {/* Live matches */}
                            {allMatches.filter(m => m.status_display === 'live').length > 0 && (
                                <div className={cx(typography.body.sm, "font-bold text-red-300 uppercase tracking-wide mb-1 px-1 bg-red-900/20 py-1 rounded")}>
                                    🔴 {dict?.sidebar?.live || 'Live'}
                                </div>
                            )}
                            {allMatches.filter(m => m.status_display === 'live').map((match, index) => (
                                <motion.button
                                    key={match.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent sidebar expansion
                                        onMatchSelect && onMatchSelect(match);
                                    }}
                                    className={cx(
                                        "w-full p-1.5 sm:p-2 cursor-pointer border-l-3 border-red-400 bg-red-950/40 min-w-0",
                                        borders.rounded.sm,
                                        transitions.default,
                                        "hover:bg-red-900/50 hover:scale-[1.02] hover:border-red-300",
                                        "shadow-md hover:shadow-lg"
                                    )}
                                    title={`${match.player1.name} vs ${match.player2.name}`}
                                >
                                    <div className="text-xs sm:text-sm font-semibold text-left leading-tight truncate text-white">
                                        {match.player1.name.split(' ')[1] || match.player1.name} {dict?.sidebar?.versus || 'v'} {match.player2.name.split(' ')[1] || match.player2.name}
                                    </div>
                                    <div className="text-xs text-yellow-300 truncate font-medium">
                                        {match.player1.odds.toFixed(2)} | {match.player2.odds.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">
                                        {match.time} • {new Date(match.startTime).toLocaleDateString('en-GB')}
                                    </div>
                                </motion.button>
                            ))}

                            {/* Upcoming matches */}
                            {allMatches.filter(m => m.status_display === 'upcoming' && !m.isLocked).length > 0 && (
                                <div className={cx(typography.body.sm, "font-bold text-blue-300 uppercase tracking-wide mb-1 mt-2 sm:mt-3 px-1 bg-blue-900/20 py-1 rounded")}>
                                    ⏰ {dict?.sidebar?.upcoming || 'Upcoming'}
                                </div>
                            )}
                            {allMatches.filter(m => m.status_display === 'upcoming' && !m.isLocked).map((match, index) => (
                                <motion.button
                                    key={match.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent sidebar expansion
                                        onMatchSelect && onMatchSelect(match);
                                    }}
                                    className={cx(
                                        "w-full p-1.5 sm:p-2 cursor-pointer border-l-3 border-blue-400 bg-blue-950/40 min-w-0",
                                        borders.rounded.sm,
                                        transitions.default,
                                        "hover:bg-blue-900/50 hover:scale-[1.02] hover:border-blue-300",
                                        "shadow-md hover:shadow-lg"
                                    )}
                                    title={`${match.player1.name} vs ${match.player2.name} - ${match.time}`}
                                >
                                    <div className="text-xs sm:text-sm font-semibold text-left leading-tight truncate text-white">
                                        {match.player1.name.split(' ')[1] || match.player1.name} {dict?.sidebar?.versus || 'v'} {match.player2.name.split(' ')[1] || match.player2.name}
                                    </div>
                                    <div className="text-xs text-blue-300 truncate font-medium">
                                        {match.player1.odds.toFixed(2)} | {match.player2.odds.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">
                                        {match.time} • {new Date(match.startTime).toLocaleDateString('en-GB')}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Expand indicator - fixed at bottom */}
                    <div className="flex-shrink-0 pt-2 px-2">
                        <motion.div
                            className={cx(
                                "w-full p-2 flex items-center justify-center text-white",
                                borders.rounded.sm,
                                transitions.default,
                                gradients.purple,
                                shadows.card,
                                "hover:opacity-90"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ChevronRightIcon />
                            <span className="ml-1 text-xs font-medium">Expand</span>
                        </motion.div>
                    </div>
                </div>
            )}
        </aside>
    );
} 