'use client';

import { Player } from '@netprophet/lib';
import { Card, CardContent } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';
import { calculateWinRate, getWinRateColor } from '../utils';

interface PlayerStatsGridProps {
    player: Player;
}

export function PlayerStatsGrid({ player }: PlayerStatsGridProps) {
    const { dict } = useDictionary();
    const winRate = calculateWinRate(player.wins, player.losses);

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {/* Win Rate */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className={`text-3xl sm:text-4xl font-black ${getWinRateColor(winRate)} mb-2 drop-shadow-lg`}>
                            {winRate}%
                        </div>
                        <div className="text-xs sm:text-sm text-purple-300 font-bold">
                            {dict?.athletes?.winRate || 'Win Rate'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Record */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
                            {player.wins}-{player.losses}
                        </div>
                        <div className="text-xs sm:text-sm text-purple-300 font-bold">
                            {dict?.athletes?.record || 'Record'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Current Streak */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
                            {player.currentStreak} {player.streakType === 'W'
                                ? (player.currentStreak === 1 ? (dict?.athletes?.win || 'Win') : (dict?.athletes?.wins || 'Wins'))
                                : (player.currentStreak === 1 ? (dict?.athletes?.loss || 'Loss') : (dict?.athletes?.losses || 'Losses'))
                            }
                        </div>
                        <div className="text-xs sm:text-sm text-purple-300 font-bold">
                            {dict?.athletes?.currentStreak || 'Current Streak'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Total Matches */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
                            {player.wins + player.losses}
                        </div>
                        <div className="text-xs sm:text-sm text-purple-300 font-bold">
                            {dict?.athletes?.totalMatches || 'Total Matches'}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
