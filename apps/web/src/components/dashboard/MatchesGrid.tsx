'use client';

import { Card, CardContent, Badge, Button } from '@netprophet/ui';
import { Match } from '@/types/dashboard';
import { CardTitle } from '@/components/ui/card';
import { mockMatches } from '@/components/MatchesList';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { useTheme } from '../Providers';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

interface MatchesGridProps {
    matches?: Match[];
    onSelectMatch?: (match: Match) => void;
    sidebarOpen?: boolean;
}

export function MatchesGrid({ matches = mockMatches, sidebarOpen = true }: MatchesGridProps) {
    const onSelectMatch = useMatchSelect();
    const { theme } = useTheme();
    const { slipCollapsed } = usePredictionSlip();

    const liveMatches = matches.filter(match => match.status === 'live');
    const upcomingMatches = matches.filter(match => match.status === 'upcoming');

    return (
        <div className="flex flex-col h-full w-full bg-[#0F0F0F] text-white">
            {/* Header Section */}
            <div className="p-4 sm:p-6 pb-2 sm:pb-4 flex-shrink-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Tennis Matches</h1>
                <p className="text-gray-400 text-xs sm:text-sm">Monitor live tennis events and place your predictions</p>
            </div>

            {/* Content Section - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6">
                {/* Live Matches Section */}
                {liveMatches.length > 0 && (
                    <div className="mb-4 sm:mb-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2 sm:mr-3"></span>
                                Live Matches
                            </h2>
                            <span className="text-xs sm:text-sm text-gray-400">({liveMatches.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {liveMatches.map((match) => (
                                <div
                                    key={match.id}
                                    className="bg-[#1A1A1A] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[#2A2A2A] hover:border-purple-500/50 transition-all duration-200 cursor-pointer"
                                    onClick={() => onSelectMatch(match)}
                                >
                                    {/* Match Header */}
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <div className="flex items-center space-x-1 sm:space-x-2">
                                            <div className="bg-red-500/20 text-red-400 text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-red-500/30">
                                                LIVE
                                            </div>
                                            <span className="text-gray-400 text-xs sm:text-sm truncate">{match.tournament}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white text-xs sm:text-sm font-medium">{match.time}</div>
                                            <div className="text-gray-500 text-xs">{match.court}</div>
                                        </div>
                                    </div>

                                    {/* Teams and Score */}
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        {/* Team 1 */}
                                        <div className="flex-1">
                                            <div className="text-white font-semibold text-sm sm:text-base truncate">{match.player1.name}</div>
                                            <div className="text-gray-400 text-xs sm:text-sm">{match.player1.country}</div>
                                        </div>

                                        {/* Score */}
                                        <div className="text-center mx-2 sm:mx-4">
                                            <div className="text-lg sm:text-2xl font-bold text-white">6-4, 3-6</div>
                                            <div className="text-xs text-gray-400 mt-1">2ND SET</div>
                                        </div>

                                        {/* Team 2 */}
                                        <div className="flex-1 text-right">
                                            <div className="text-white font-semibold text-sm sm:text-base truncate">{match.player2.name}</div>
                                            <div className="text-gray-400 text-xs sm:text-sm">{match.player2.country}</div>
                                        </div>
                                    </div>

                                    {/* Betting Odds */}
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-400 mb-1">{match.player1.name.split(' ')[1]}</div>
                                            <div className="text-2xl font-bold text-white">{match.player1.odds.toFixed(2)}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-400 mb-1">{match.player2.name.split(' ')[1]}</div>
                                            <div className="text-2xl font-bold text-white">{match.player2.odds.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectMatch(match);
                                        }}
                                    >
                                        Make your prediction
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Matches Section */}
                {upcomingMatches.length > 0 && (
                    <div className="pb-4 sm:pb-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h2 className="text-base sm:text-lg font-bold text-white">Upcoming Matches</h2>
                            <span className="text-xs sm:text-sm text-gray-400">({upcomingMatches.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {upcomingMatches.map((match) => (
                                <div
                                    key={match.id}
                                    className="bg-[#1A1A1A] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[#2A2A2A] hover:border-purple-500/50 transition-all duration-200 cursor-pointer"
                                    onClick={() => onSelectMatch(match)}
                                >
                                    {/* Match Header */}
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <div className="flex items-center space-x-1 sm:space-x-2">
                                            <div className="bg-blue-500/20 text-blue-400 text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-blue-500/30">
                                                UPCOMING
                                            </div>
                                            <span className="text-gray-400 text-xs sm:text-sm truncate">{match.tournament}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white text-xs sm:text-sm font-medium">{match.time}</div>
                                            <div className="text-gray-500 text-xs">{match.court}</div>
                                        </div>
                                    </div>

                                    {/* Teams and Score */}
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        {/* Team 1 */}
                                        <div className="flex-1">
                                            <div className="text-white font-semibold text-sm sm:text-base truncate">{match.player1.name}</div>
                                            <div className="text-gray-400 text-xs sm:text-sm">{match.player1.country}</div>
                                        </div>

                                        {/* VS */}
                                        <div className="text-center mx-2 sm:mx-4">
                                            <div className="text-base sm:text-lg font-bold text-gray-400">VS</div>
                                            <div className="text-xs text-gray-500 mt-1">{match.time}</div>
                                        </div>

                                        {/* Team 2 */}
                                        <div className="flex-1 text-right">
                                            <div className="text-white font-semibold text-sm sm:text-base truncate">{match.player2.name}</div>
                                            <div className="text-gray-400 text-xs sm:text-sm">{match.player2.country}</div>
                                        </div>
                                    </div>

                                    {/* Betting Odds */}
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-400 mb-1">{match.player1.name.split(' ')[1]}</div>
                                            <div className="text-2xl font-bold text-white">{match.player1.odds.toFixed(2)}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-400 mb-1">{match.player2.name.split(' ')[1]}</div>
                                            <div className="text-2xl font-bold text-white">{match.player2.odds.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectMatch(match);
                                        }}
                                    >
                                        Make your prediction
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Matches State */}
                {matches.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                        <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎾</div>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-white">No Tennis Matches Available</h2>
                        <p className="text-gray-400 text-sm sm:text-base">Check back later for upcoming tennis matches</p>
                    </div>
                )}
            </div>
        </div>
    );
} 