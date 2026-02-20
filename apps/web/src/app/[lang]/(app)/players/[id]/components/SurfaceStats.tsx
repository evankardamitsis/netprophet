'use client';

import { Player } from '@netprophet/lib';
import { Card, CardContent } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface SurfaceStatsProps {
    player: Player;
}

export function SurfaceStats({ player }: SurfaceStatsProps) {
    const { dict } = useDictionary();

    const hasSurfaceData = ((player.hardMatches || 0) + (player.clayMatches || 0) + (player.grassMatches || 0)) > 0;

    if (!hasSurfaceData) return null;

    return (
        <div className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 drop-shadow-lg">
                {dict?.athletes?.surfaceStats || 'Surface Statistics'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hard Court Stats */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                    <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-white">Hard Court</h3>
                                <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Win Rate:</span>
                                    <span className="text-white font-black">
                                        {player.hardWinRate ? `${player.hardWinRate}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Record:</span>
                                    <span className="text-white font-bold">
                                        {player.hardWins || 0}-{player.hardLosses || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Matches:</span>
                                    <span className="text-white font-bold">
                                        {player.hardMatches || 0}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Clay Court Stats */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                    <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-white">Clay Court</h3>
                                <div className="w-4 h-4 bg-orange-500 rounded-full shadow-lg"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Win Rate:</span>
                                    <span className="text-white font-black">
                                        {player.clayWinRate ? `${player.clayWinRate}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Record:</span>
                                    <span className="text-white font-bold">
                                        {player.clayWins || 0}-{player.clayLosses || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Matches:</span>
                                    <span className="text-white font-bold">
                                        {player.clayMatches || 0}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Grass Court Stats */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                    <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-white">Grass Court</h3>
                                <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Win Rate:</span>
                                    <span className="text-white font-black">
                                        {player.grassWinRate ? `${player.grassWinRate}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Record:</span>
                                    <span className="text-white font-bold">
                                        {player.grassWins || 0}-{player.grassLosses || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-purple-300 font-bold">Matches:</span>
                                    <span className="text-white font-bold">
                                        {player.grassMatches || 0}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
