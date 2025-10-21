'use client';

import { Card, CardContent, Badge, Button } from '@netprophet/ui';
import { Match } from '@/types/dashboard';
import { CardTitle } from '@/components/ui/card';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useDictionary } from '@/context/DictionaryContext';
import { useMatches } from '@/hooks/useMatches';
import { TournamentFilter } from './TournamentFilter';
import { gradients, shadows, borders, transitions, animations, cx, typography } from '@/styles/design-system';
import { motion } from 'framer-motion';

interface MatchesGridProps {
    matches?: Match[];
    onSelectMatch?: (match: Match) => void;
    sidebarOpen?: boolean;
    slipCollapsed?: boolean;
}

export function MatchesGrid({ matches: propMatches = [], sidebarOpen = true, slipCollapsed }: MatchesGridProps) {
    const onSelectMatch = useMatchSelect();
    const { slipCollapsed: contextSlipCollapsed } = usePredictionSlip();
    const { dict, lang } = useDictionary();
    const isSlipCollapsed = slipCollapsed ?? contextSlipCollapsed;

    // Use shared matches hook
    const {
        matches: hookMatches,
        filteredMatches,
        liveMatches,
        upcomingMatches,
        selectedTournament,
        setSelectedTournament,
        loading,
        error
    } = useMatches();

    // Use prop matches if provided, otherwise use hook matches
    const matches = propMatches.length > 0 ? propMatches : hookMatches;

    return (
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

            {/* Content Section - Natural Flow */}
            <div className="px-3 xs:px-4 sm:px-5 md:px-6 relative z-10">
                {/* Live Matches Section */}
                {liveMatches.length > 0 && (
                    <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6 mt-4 lg:mt-6">
                        <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                            <h2 className={cx(typography.heading.md, "text-white flex items-center text-sm xs:text-base sm:text-lg")}>
                                <span className="w-1.5 xs:w-2 h-1.5 xs:h-2 rounded-full bg-red-500 animate-pulse mr-1.5 xs:mr-2 sm:mr-3"></span>
                                {dict?.sidebar?.liveMatches || 'Live Matches'}
                                <span className={cx(typography.body.sm, "ml-2 text-gray-400 text-xs xs:text-sm")}>({liveMatches.length})</span>
                            </h2>
                            {/* Navigation arrows for live matches - only visible on large screens */}
                            <div className="hidden lg:flex gap-2">
                                <motion.button
                                    onClick={() => {
                                        const container = document.querySelector('.live-matches-container');
                                        if (container) {
                                            container.scrollBy({ left: -200, behavior: 'smooth' });
                                        }
                                    }}
                                    className={cx(
                                        "w-8 h-8 text-white flex items-center justify-center",
                                        borders.rounded.full,
                                        transitions.default,
                                        "hover:text-yellow-400 hover:bg-slate-700/50"
                                    )}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    aria-label="Scroll left"
                                >
                                    ←
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        const container = document.querySelector('.live-matches-container');
                                        if (container) {
                                            container.scrollBy({ left: 200, behavior: 'smooth' });
                                        }
                                    }}
                                    className={cx(
                                        "w-8 h-8 text-white flex items-center justify-center",
                                        borders.rounded.full,
                                        transitions.default,
                                        "hover:text-yellow-400 hover:bg-slate-700/50"
                                    )}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    aria-label="Scroll right"
                                >
                                    →
                                </motion.button>
                            </div>
                        </div>
                        <div className={`live-matches-container ${
                            // Locked matches on small screens: horizontal carousel with peek
                            liveMatches.some(m => m.locked)
                                ? 'flex gap-2 xs:gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 xs:pb-3 pr-4 xs:pr-6 snap-x snap-mandatory'
                                : // Grid layout for active matches
                                'grid gap-2 xs:gap-3 sm:gap-4 md:gap-5 ' + (
                                    // When both sidebar and prediction slip are open, max 2 columns
                                    sidebarOpen && !isSlipCollapsed
                                        ? 'grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'
                                        : // All other states: max 3 columns
                                        'grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3'
                                )
                            }`}>
                            {liveMatches.map((match) => (
                                <div
                                    key={match.id}
                                    className={cx(
                                        "rounded-lg xs:rounded-xl flex flex-col relative",
                                        transitions.default,
                                        // Check for high odds difference (underdog alert)
                                        !match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5
                                            ? cx(borders.thick, shadows.glow.orange, 'border-orange-500 bg-slate-900/90 cursor-pointer backdrop-blur-sm', animations.hover.scale)
                                            : match.locked
                                                ? 'border border-slate-600 bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 backdrop-blur-sm cursor-not-allowed'
                                                : cx('border bg-slate-900/80 border-blue-600 hover:border-blue-500/50 cursor-pointer', animations.hover.lift),
                                        // Locked matches are much smaller and compact
                                        match.locked
                                            ? 'p-2 xs:p-2.5 sm:p-3 h-[90px] xs:h-[100px] sm:h-[110px] md:h-[120px] min-w-[280px] xs:min-w-[300px] sm:min-w-[320px] snap-start flex-shrink-0'
                                            : // Active matches - adjust padding and height based on available space
                                            sidebarOpen && !isSlipCollapsed
                                                ? 'p-1.5 xs:p-2 sm:p-2.5 md:p-3 h-[200px] xs:h-[220px] sm:h-[240px] md:h-[260px]'
                                                : 'p-2 xs:p-2.5 sm:p-3 md:p-4 h-[220px] xs:h-[240px] sm:h-[260px] md:h-[280px]'
                                    )}
                                    onClick={() => !match.locked && onSelectMatch(match)}
                                    style={!match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5 ? {
                                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
                                        borderImage: 'linear-gradient(45deg, #fbbf24, #f97316, #ef4444) 1',
                                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(251, 191, 36, 0.1)'
                                    } : undefined}
                                >
                                    {/* Underdog Alert Banner */}
                                    {!match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5 && (
                                        <div className="absolute -top-2 -right-2 z-10 animate-pulse">
                                            <div className={cx(
                                                "text-black text-xs font-bold px-2 py-1 shadow-md",
                                                gradients.orange,
                                                borders.rounded.full,
                                                shadows.glow.orange
                                            )}>
                                                🔥 UNDERDOG ALERT
                                            </div>
                                        </div>
                                    )}

                                    {/* Content Area - Takes up available space */}
                                    <div className="flex-1 flex flex-col">
                                        {match.locked ? (
                                            // Professional compact layout for locked matches
                                            <>
                                                {/* Header with tournament info */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                                                            <div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                                                                {match.tournament}
                                                            </div>
                                                        </div>
                                                        {match.round && (
                                                            <div className="text-xs text-slate-400 font-medium ml-4">
                                                                {match.round}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-medium">{match.time}</div>
                                                </div>

                                                {/* Player names with NTRP ratings */}
                                                <div className="flex items-center justify-between mb-2 xs:mb-3">
                                                    <div className="text-white font-semibold text-xs xs:text-sm truncate flex-1 min-w-0">
                                                        <div className="truncate">
                                                            {match.player1.name.split(' ').length > 1
                                                                ? `${match.player1.name.split(' ')[0][0]}. ${match.player1.name.split(' ').slice(1).join(' ')}`
                                                                : match.player1.name
                                                            }
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_a?.ntrp_rating ? match.player_a.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-500 text-xs font-bold mx-1 xs:mx-2 flex-shrink-0">VS</div>
                                                    <div className="text-white font-semibold text-xs xs:text-sm truncate flex-1 text-right min-w-0">
                                                        <div className="truncate">
                                                            {match.player2.name.split(' ').length > 1
                                                                ? `${match.player2.name.split(' ')[0][0]}. ${match.player2.name.split(' ').slice(1).join(' ')}`
                                                                : match.player2.name
                                                            }
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_b?.ntrp_rating ? match.player_b.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Odds with better styling */}
                                                <div className="flex justify-between items-center">
                                                    <div className="text-center flex-1">
                                                        <div className="text-xs xs:text-sm font-bold text-white">{match.player1.odds.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-center flex-1">
                                                        <div className="text-xs xs:text-sm font-bold text-white">{match.player2.odds.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            // Full layout for active matches
                                            <>
                                                {/* Match Header */}
                                                <div className="mb-2 xs:mb-3 sm:mb-4">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <div className="flex items-center space-x-1 xs:space-x-1.5 sm:space-x-2 min-w-0 flex-1">
                                                            <div className={`text-xs font-bold px-1 xs:px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border flex-shrink-0 ${match.locked
                                                                ? 'bg-gray-600/20 text-gray-400 border-gray-600/30'
                                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                                                }`}>
                                                                {dict?.sidebar?.live || 'LIVE'}
                                                            </div>
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span className="text-gray-400 text-xs xs:text-sm font-bold truncate">{match.tournament}</span>
                                                                {match.round && (
                                                                    <span className="text-gray-500 text-xs font-medium truncate">
                                                                        {match.round}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-2">
                                                            <div className="text-white text-xs xs:text-sm font-medium">{match.time}</div>
                                                            <div className="text-gray-400 text-xs">{new Date(match.startTime).toLocaleDateString('en-GB')}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Teams */}
                                                <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                                                    {/* Team 1 */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white font-semibold text-xs xs:text-sm sm:text-base break-words leading-tight truncate">{match.player1.name}</div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_a?.ntrp_rating ? match.player_a.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>

                                                    {/* VS */}
                                                    <div className="text-center mx-1 xs:mx-2 sm:mx-3 md:mx-4 flex-shrink-0">
                                                        <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-gray-400">{dict?.sidebar?.versus || 'VS'}</div>
                                                    </div>

                                                    {/* Team 2 */}
                                                    <div className="flex-1 text-right min-w-0">
                                                        <div className="text-white font-semibold text-xs xs:text-sm sm:text-base break-words leading-tight truncate">{match.player2.name}</div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_b?.ntrp_rating ? match.player_b.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Betting Odds */}
                                                <div className="flex justify-between items-center px-1 xs:px-2">
                                                    <div className="text-center flex-1 min-w-0">
                                                        <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white">{match.player1.odds.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-center flex-1 min-w-0">
                                                        <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white">{match.player2.odds.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action Button - Only for active matches */}
                                    {!match.locked && (
                                        <motion.button
                                            className={cx(
                                                "w-full font-semibold py-2 xs:py-2.5 sm:py-3 md:py-3.5 px-3 xs:px-4 text-xs xs:text-sm mt-2 xs:mt-3 text-white",
                                                gradients.purple,
                                                borders.rounded.sm,
                                                transitions.default,
                                                shadows.glow.purple,
                                                "hover:scale-105 active:scale-95"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectMatch(match);
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {dict?.sidebar?.makePrediction || 'Make your prediction'}
                                        </motion.button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Matches Section */}
                {upcomingMatches.length > 0 && (
                    <div className="pb-3 xs:pb-4 sm:pb-5 md:pb-6">
                        <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                            <h2 className={cx(typography.heading.md, "text-white")}>
                                {dict?.sidebar?.upcoming || 'Upcoming Matches'}
                                <span className={cx(typography.body.sm, "ml-2 text-gray-400")}>({upcomingMatches.length})</span>
                            </h2>
                        </div>
                        <div className={`grid gap-2 xs:gap-3 sm:gap-4 md:gap-5 ${
                            // When both sidebar and prediction slip are open, max 2 columns
                            sidebarOpen && !isSlipCollapsed
                                ? 'grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'
                                : // All other states: max 3 columns for consistent layout
                                'grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3'
                            }`}>
                            {upcomingMatches.map((match) => (
                                <div
                                    key={match.id}
                                    className={`bg-slate-900/80 rounded-lg xs:rounded-xl border transition-all duration-200 flex flex-col relative ${
                                        // Check for high odds difference (underdog alert)
                                        !match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5
                                            ? 'border-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 cursor-pointer'
                                            : match.locked
                                                ? 'border-slate-600 bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 backdrop-blur-sm cursor-not-allowed'
                                                : 'border-blue-600 hover:border-blue-500/50 cursor-pointer'
                                        } ${
                                        // Locked matches are much smaller and compact
                                        match.locked
                                            ? 'p-2 xs:p-2.5 sm:p-3 h-[90px] xs:h-[100px] sm:h-[110px] md:h-[120px]'
                                            : // Active matches - adjust padding and height based on available space
                                            sidebarOpen && !isSlipCollapsed
                                                ? 'p-1.5 xs:p-2 sm:p-2.5 md:p-3 h-[200px] xs:h-[220px] sm:h-[240px] md:h-[260px]'
                                                : 'p-2 xs:p-2.5 sm:p-3 md:p-4 h-[220px] xs:h-[240px] sm:h-[260px] md:h-[280px]'
                                        }`}
                                    onClick={() => !match.locked && onSelectMatch(match)}
                                    style={!match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5 ? {
                                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
                                        borderImage: 'linear-gradient(45deg, #fbbf24, #f97316, #ef4444) 1',
                                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(251, 191, 36, 0.1)'
                                    } : undefined}
                                >
                                    {/* Underdog Alert Banner */}
                                    {!match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5 && (
                                        <div className="absolute -top-2 -right-2 z-10 animate-pulse">
                                            <div className={cx(
                                                "text-black text-xs font-bold px-2 py-1 shadow-md",
                                                gradients.orange,
                                                borders.rounded.full,
                                                shadows.glow.orange
                                            )}>
                                                🔥 UNDERDOG ALERT
                                            </div>
                                        </div>
                                    )}

                                    {/* Content Area - Takes up available space */}
                                    <div className="flex-1 flex flex-col">
                                        {match.locked ? (
                                            // Professional compact layout for locked matches
                                            <>
                                                {/* Header with tournament info */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                                                            <div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                                                                {match.tournament}
                                                            </div>
                                                        </div>
                                                        {match.round && (
                                                            <div className="text-xs text-slate-400 font-medium ml-4">
                                                                {match.round}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-medium">{match.time}</div>
                                                </div>

                                                {/* Player names with NTRP ratings */}
                                                <div className="flex items-center justify-between mb-2 xs:mb-3">
                                                    <div className="text-white font-semibold text-xs xs:text-sm truncate flex-1 min-w-0">
                                                        <div className="truncate">
                                                            {match.player1.name.split(' ').length > 1
                                                                ? `${match.player1.name.split(' ')[0][0]}. ${match.player1.name.split(' ').slice(1).join(' ')}`
                                                                : match.player1.name
                                                            }
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_a?.ntrp_rating ? match.player_a.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-500 text-xs font-bold mx-1 xs:mx-2 flex-shrink-0">VS</div>
                                                    <div className="text-white font-semibold text-xs xs:text-sm truncate flex-1 text-right min-w-0">
                                                        <div className="truncate">
                                                            {match.player2.name.split(' ').length > 1
                                                                ? `${match.player2.name.split(' ')[0][0]}. ${match.player2.name.split(' ').slice(1).join(' ')}`
                                                                : match.player2.name
                                                            }
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_b?.ntrp_rating ? match.player_b.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Odds with better styling */}
                                                <div className="flex justify-between items-center">
                                                    <div className="text-center flex-1">
                                                        <div className="text-xs xs:text-sm font-bold text-white">{match.player1.odds.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-center flex-1">
                                                        <div className="text-xs xs:text-sm font-bold text-white">{match.player2.odds.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            // Full layout for active matches
                                            <>
                                                {/* Match Header */}
                                                <div className="mb-2 xs:mb-3 sm:mb-4">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <div className="flex items-center space-x-1 xs:space-x-1.5 sm:space-x-2">
                                                            <div className={`text-xs font-bold px-1 xs:px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ${match.locked
                                                                ? 'bg-gray-600/20 text-gray-400 border-gray-600/30'
                                                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                                                }`}>
                                                                {match.locked ? 'LOCKED' : (dict?.sidebar?.upcoming || 'UPCOMING')}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-400 text-xs xs:text-sm font-bold truncate max-w-[200px] xs:max-w-[200px] sm:max-w-[200px] md:max-w-[200px]">{match.tournament}</span>
                                                                {match.round && (
                                                                    <span className="text-gray-500 text-xs font-medium">
                                                                        {match.round}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-white text-xs xs:text-sm font-medium">{match.time}</div>
                                                            <div className="text-gray-400 text-xs">{new Date(match.startTime).toLocaleDateString('en-GB')}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Teams and Score */}
                                                <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                                                    {/* Team 1 */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white font-semibold text-xs xs:text-sm sm:text-base break-words leading-tight">{match.player1.name}</div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_a?.ntrp_rating ? match.player_a.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>

                                                    {/* VS */}
                                                    <div className="text-center mx-1 xs:mx-2 sm:mx-3 md:mx-4 flex-shrink-0">
                                                        <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-gray-400">{dict?.sidebar?.versus || 'VS'}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5 xs:mt-1">{match.time}</div>
                                                    </div>

                                                    {/* Team 2 */}
                                                    <div className="flex-1 text-right min-w-0">
                                                        <div className="text-white font-semibold text-xs xs:text-sm sm:text-base break-words leading-tight">{match.player2.name}</div>
                                                        <div className="text-xs text-gray-400 font-medium">
                                                            NTRP {match.player_b?.ntrp_rating ? match.player_b.ntrp_rating.toFixed(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Betting Odds */}
                                                <div className="flex justify-between items-center px-1 xs:px-2">
                                                    <div className="text-center flex-1 min-w-0">
                                                        <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white">{match.player1.odds.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-center flex-1 min-w-0">
                                                        <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white">{match.player2.odds.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action Button - Only for active matches */}
                                    {!match.locked && (
                                        <motion.button
                                            className={cx(
                                                "w-full font-semibold py-2 xs:py-2.5 sm:py-3 md:py-3.5 px-3 xs:px-4 text-xs xs:text-sm mt-2 xs:mt-3 text-white",
                                                gradients.purple,
                                                borders.rounded.sm,
                                                transitions.default,
                                                shadows.glow.purple,
                                                "hover:scale-105 active:scale-95"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectMatch(match);
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {dict?.sidebar?.makePrediction || 'Make your prediction'}
                                        </motion.button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Matches State */}
                {matches.length === 0 && (
                    <div className="text-center py-6 xs:py-8 sm:py-10 md:py-12">
                        <div className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl mb-2 xs:mb-3 sm:mb-4">🎾</div>
                        <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-semibold mb-1 xs:mb-2 text-white">{dict?.matches?.noMatches || 'No Tennis Matches Available'}</h2>
                        <p className="text-gray-400 text-xs xs:text-sm sm:text-base">{dict?.matches?.loading || 'Check back later for upcoming tennis matches'}</p>
                    </div>
                )}
            </div>
        </div >
    );
} 