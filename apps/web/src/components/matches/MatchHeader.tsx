'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { useTheme } from '../Providers';
import { useDictionary } from '@/context/DictionaryContext';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface MatchDetails {
    tournament: string;
    round: string;
    surface: string;
    player1: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number };
    player2: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number };
    headToHead: string;
    headToHeadData?: {
        player_a_wins: number;
        player_b_wins: number;
        total_matches: number;
        last_match_date?: string;
        last_match_result?: string;
    } | null;
    format: string;
    matchType?: 'singles' | 'doubles';
}

interface Match {
    id: string;
    status: string;
}

interface MatchHeaderProps {
    match: Match;
    details: MatchDetails;
    player1Id?: string | null;
    player2Id?: string | null;
}

export function MatchHeader({ match, details, player1Id, player2Id }: MatchHeaderProps) {
    const { theme } = useTheme();
    const { dict, lang } = useDictionary();
    const router = useRouter();
    const params = useParams();
    const [isExpanded, setIsExpanded] = useState(true); // Default expanded on large screens

    const isDoubles = details.matchType === 'doubles';

    // Helper to format player/team name for display
    const formatName = (name: string, isCompact: boolean = false) => {
        if (isDoubles) {
            // For doubles, show full team name or truncate if too long
            if (isCompact && name.length > 20) {
                return name.substring(0, 17) + '...';
            }
            return name;
        }
        // For singles, show last name on compact view
        if (isCompact) {
            const parts = name.split(' ');
            return parts.length > 1 ? parts[parts.length - 1] : name;
        }
        return name;
    };

    // Auto-expand on large screens, collapse on small screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) { // lg breakpoint
                setIsExpanded(true);
            } else {
                setIsExpanded(false);
            }
        };

        // Set initial state
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getStatusColor = (status: string) => {
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

    const isBestOf5 = details.format === 'best-of-5';

    // Function to translate head-to-head string
    const translateHeadToHead = (headToHead: string) => {
        // Check if the string contains "leads"
        if (headToHead.includes('leads')) {
            return headToHead.replace('leads', dict?.matches?.leads || 'leads');
        }
        return headToHead;
    };

    // Function to navigate to player page
    const navigateToPlayer = (playerId: string | null | undefined) => {
        if (playerId && params?.lang) {
            router.push(`/${params.lang}/players/${playerId}`);
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border-2 border-purple-500/30 shadow-lg shadow-purple-500/10 overflow-hidden">
            {/* Compact View - Always visible */}
            <div className="p-2 sm:p-3 lg:p-4 min-h-[60px] lg:min-h-[70px]">
                {/* Small screens: Stacked layout */}
                <div className="lg:hidden">
                    {/* Top row - Tournament info and controls */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-semibold text-white truncate mb-0.5">{details.tournament}</h3>
                            <p className="text-xs text-gray-400 truncate">{details.round ? `${details.round} • ${details.surface}` : details.surface}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-slate-700/50"
                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                                <svg
                                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Bottom row - Players and odds */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-left min-w-0">
                            <button
                                onClick={() => navigateToPlayer(player1Id)}
                                disabled={!player1Id || isDoubles}
                                className={`text-xs font-medium truncate mb-0.5 transition-colors ${player1Id && !isDoubles
                                    ? 'text-white hover:text-purple-300 cursor-pointer'
                                    : 'text-white cursor-default'
                                    }`}
                            >
                                {formatName(details.player1.name, true)}{details.player1.ntrpRating ? ` (${details.player1.ntrpRating.toFixed(1)})` : ''}
                            </button>
                            <div className="text-xs text-purple-400 font-bold">{details.player1.odds.toFixed(2)}x</div>
                        </div>

                        <div className="text-xs text-gray-400 font-bold px-1">{dict?.matches?.vs || 'VS'}</div>

                        <div className="text-right min-w-0">
                            <button
                                onClick={() => navigateToPlayer(player2Id)}
                                disabled={!player2Id || isDoubles}
                                className={`text-xs font-medium truncate mb-0.5 transition-colors ${player2Id && !isDoubles
                                    ? 'text-white hover:text-purple-300 cursor-pointer'
                                    : 'text-white cursor-default'
                                    }`}
                            >
                                {formatName(details.player2.name, true)}{details.player2.ntrpRating ? ` (${details.player2.ntrpRating.toFixed(1)})` : ''}
                            </button>
                            <div className="text-xs text-purple-400 font-bold">{details.player2.odds.toFixed(2)}x</div>
                        </div>
                    </div>
                </div>

                {/* Large screens: Vertical layout */}
                <div className="hidden lg:flex lg:flex-col lg:gap-3">
                    {/* Top section - Tournament info and controls */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white mb-1 leading-tight">{details.tournament}</h3>
                            <p className="text-xs text-gray-400 leading-tight">{details.round ? `${details.round} • ${details.surface}` : details.surface}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-slate-700/50"
                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                                <svg
                                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Bottom section - Players and odds */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-4">
                            <div className="text-left">
                                <button
                                    onClick={() => navigateToPlayer(player1Id)}
                                    disabled={!player1Id || isDoubles}
                                    className={`text-xs font-medium leading-tight text-left transition-colors ${player1Id && !isDoubles
                                        ? 'text-white hover:text-purple-300 cursor-pointer'
                                        : 'text-white cursor-default'
                                        }`}
                                >
                                    {formatName(details.player1.name)}{details.player1.ntrpRating ? ` (${details.player1.ntrpRating.toFixed(1)})` : ''}
                                </button>
                                <div className="text-xs text-purple-400 font-bold">{details.player1.odds.toFixed(2)}x</div>
                            </div>
                            <div className="text-xs text-gray-400 font-bold text-center flex-shrink-0">{dict?.matches?.vs || 'VS'}</div>
                            <div className="text-left">
                                <button
                                    onClick={() => navigateToPlayer(player2Id)}
                                    disabled={!player2Id || isDoubles}
                                    className={`text-xs font-medium leading-tight text-left transition-colors ${player2Id && !isDoubles
                                        ? 'text-white hover:text-purple-300 cursor-pointer'
                                        : 'text-white cursor-default'
                                        }`}
                                >
                                    {formatName(details.player2.name)}{details.player2.ntrpRating ? ` (${details.player2.ntrpRating.toFixed(1)})` : ''}
                                </button>
                                <div className="text-xs text-purple-400 font-bold">{details.player2.odds.toFixed(2)}x</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Details - Hidden by default */}
            {isExpanded && (
                <div className="border-t-2 border-purple-500/30 p-2 sm:p-3 lg:p-4 bg-slate-700/20">
                    <div className="space-y-2 lg:space-y-3">
                        <div className="text-xs text-gray-400">
                            {isBestOf5 ? dict?.matches?.bestOf5 || 'Best of 5' : dict?.matches?.bestOf3 || 'Best of 3'}
                        </div>
                        <div className="text-xs text-gray-400">
                            <span className="font-semibold text-purple-300">{dict?.matches?.headToHead || 'H2H'}:</span> {translateHeadToHead(details.headToHead)}
                        </div>
                        {details.headToHeadData && details.headToHeadData.total_matches > 0 && (
                            <div className="text-xs text-gray-400 bg-slate-700/30 rounded px-2 py-1">
                                <span className="font-medium">{dict?.athletes?.totalMatches || 'Total matches'}: {details.headToHeadData.total_matches}</span>
                                {details.headToHeadData.last_match_date && (
                                    <span className="ml-2 text-gray-300">
                                        • Last match: {new Date(details.headToHeadData.last_match_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="text-xs text-gray-400 bg-slate-600/30 rounded px-2 py-1">
                            <span className="font-semibold text-purple-300">Head-to-Head Record:</span> {details.headToHeadData && details.headToHeadData.total_matches > 0
                                ? `${details.headToHeadData.player_a_wins}-${details.headToHeadData.player_b_wins}`
                                : 'No H2H details'
                            }
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-xs">
                            <div className="text-left p-2 rounded-lg bg-slate-800/50 border border-purple-500/20 shadow-md shadow-purple-500/5">
                                <button
                                    onClick={() => navigateToPlayer(player1Id)}
                                    disabled={!player1Id || isDoubles}
                                    className={`text-white font-medium text-left transition-colors ${player1Id && !isDoubles
                                        ? 'hover:text-purple-300 cursor-pointer'
                                        : 'cursor-default'
                                        }`}
                                >
                                    {formatName(details.player1.name)}{details.player1.ntrpRating ? ` (${details.player1.ntrpRating.toFixed(1)})` : ''}
                                </button>
                                <div className="text-gray-400">
                                    {dict?.matches?.wins || 'W'}: {details.player1.wins} {dict?.matches?.losses || 'L'}: {details.player1.losses}
                                </div>
                            </div>
                            <div className="text-left p-2 rounded-lg bg-slate-800/50 border border-purple-500/20 shadow-md shadow-purple-500/5">
                                <button
                                    onClick={() => navigateToPlayer(player2Id)}
                                    disabled={!player2Id || isDoubles}
                                    className={`text-white text-left font-medium transition-colors ${player2Id && !isDoubles
                                        ? 'hover:text-purple-300 cursor-pointer'
                                        : 'cursor-default'
                                        }`}
                                >
                                    {formatName(details.player2.name)}{details.player2.ntrpRating ? ` (${details.player2.ntrpRating.toFixed(1)})` : ''}
                                </button>
                                <div className="text-gray-400">
                                    {dict?.matches?.wins || 'W'}: {details.player2.wins} {dict?.matches?.losses || 'L'}: {details.player2.losses}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
} 