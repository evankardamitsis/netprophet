'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Player, fetchPlayerById } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import { Card, CardContent } from '@netprophet/ui';

export default function PlayerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { dict } = useDictionary();
    const [player, setPlayer] = useState<Player | null>(null);
    const [loading, setLoading] = useState(true);

    const playerId = params.id as string;

    useEffect(() => {
        const loadPlayer = async () => {
            try {
                setLoading(true);
                const fetchedPlayer = await fetchPlayerById(playerId);
                setPlayer(fetchedPlayer);
            } catch (error) {
                console.error('Error loading player:', error);
            } finally {
                setLoading(false);
            }
        };

        if (playerId) {
            loadPlayer();
        }
    }, [playerId]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading player details...</p>
                </div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-8 text-center">
                        <div className="text-gray-400 text-lg mb-2">
                            {dict?.players?.playerNotFound || 'Player not found'}
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {dict?.common?.back || 'Go Back'}
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const winRate = player.wins + player.losses > 0
        ? Math.round((player.wins / (player.wins + player.losses)) * 100)
        : 0;

    const getWinRateColor = (rate: number) => {
        if (rate >= 70) return 'text-green-400';
        if (rate >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getNTRPColor = (rating: number) => {
        if (rating >= 4.5) return 'text-purple-400';
        if (rating >= 4.0) return 'text-blue-400';
        if (rating >= 3.5) return 'text-green-400';
        if (rating >= 3.0) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getSurfaceColor = (surface: string) => {
        switch (surface.toLowerCase()) {
            case 'hard':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'clay':
                return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
            case 'grass':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="mb-4 sm:mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
            >
                ← {dict?.common?.back || 'Back'}
            </button>

            {/* Player Header */}
            <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                            {player.firstName} {player.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base text-gray-400">
                            <span>{player.age} {dict?.players?.years || 'years'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="capitalize">{dict?.players?.[player.hand.toLowerCase() as 'left' | 'right'] || player.hand} {dict?.players?.handed || 'handed'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className={`font-bold ${getNTRPColor(player.ntrpRating)}`}>
                                NTRP {player.ntrpRating}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-400 mb-1">
                            {dict?.players?.preferredSurface || 'Preferred Surface'}
                        </div>
                        <div className={`inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium border ${getSurfaceColor(player.surfacePreference)}`}>
                            {player.surfacePreference}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                {/* Win Rate */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-3 sm:p-6 text-center">
                        <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${getWinRateColor(winRate)} mb-1 sm:mb-2`}>
                            {winRate}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                            {dict?.players?.winRate || 'Win Rate'}
                        </div>
                    </CardContent>
                </Card>

                {/* Record */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-3 sm:p-6 text-center">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">
                            {player.wins}-{player.losses}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                            {dict?.players?.record || 'Record'}
                        </div>
                    </CardContent>
                </Card>

                {/* Current Streak */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-3 sm:p-6 text-center">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">
                            {player.currentStreak} {player.streakType === 'W'
                                ? (player.currentStreak === 1 ? (dict?.players?.win || 'Win') : (dict?.players?.wins || 'Wins'))
                                : (player.currentStreak === 1 ? (dict?.players?.loss || 'Loss') : (dict?.players?.losses || 'Losses'))
                            }
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                            {dict?.players?.currentStreak || 'Current Streak'}
                        </div>
                    </CardContent>
                </Card>

                {/* Total Matches */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-3 sm:p-6 text-center">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">
                            {player.wins + player.losses}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                            {dict?.players?.totalMatches || 'Total Matches'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Last 5 Matches */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                            {dict?.players?.last5 || 'Last 5 Matches'}
                        </h3>
                        <div className="flex gap-1.5 sm:gap-2">
                            {player.last5.map((result, idx) => (
                                <div
                                    key={idx}
                                    className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center ${result === 'W'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}
                                >
                                    {result}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Player Attributes */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                            {dict?.players?.attributes || 'Player Attributes'}
                        </h3>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <div className="flex justify-between text-xs sm:text-sm mb-1">
                                    <span className="text-gray-400">{dict?.players?.aggressiveness || 'Aggressiveness'}</span>
                                    <span className="text-white">{player.aggressiveness}/10</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                                    <div
                                        className="bg-red-400 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(player.aggressiveness / 10) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs sm:text-sm mb-1">
                                    <span className="text-gray-400">{dict?.players?.stamina || 'Stamina'}</span>
                                    <span className="text-white">{player.stamina}/10</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                                    <div
                                        className="bg-green-400 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(player.stamina / 10) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs sm:text-sm mb-1">
                                    <span className="text-gray-400">{dict?.players?.consistency || 'Consistency'}</span>
                                    <span className="text-white">{player.consistency}/10</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                                    <div
                                        className="bg-blue-400 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(player.consistency / 10) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Info */}
            {(player.notes || player.injuryStatus || player.fatigueLevel !== undefined) && (
                <div className="mt-6 sm:mt-8">
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardContent className="p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                                {dict?.players?.additionalInfo || 'Additional Information'}
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                                {player.notes && (
                                    <div>
                                        <div className="text-xs sm:text-sm text-gray-400 mb-1">
                                            {dict?.players?.notes || 'Notes'}
                                        </div>
                                        <div className="text-sm sm:text-base text-white">{player.notes}</div>
                                    </div>
                                )}

                                {player.injuryStatus && player.injuryStatus !== 'healthy' && (
                                    <div>
                                        <div className="text-xs sm:text-sm text-gray-400 mb-1">
                                            {dict?.players?.injuryStatus || 'Injury Status'}
                                        </div>
                                        <div className="text-sm sm:text-base text-red-400 font-medium">
                                            {player.injuryStatus === 'minor' ? (dict?.players?.minorInjury || 'Minor Injury') : (dict?.players?.majorInjury || 'Major Injury')}
                                        </div>
                                    </div>
                                )}

                                {player.fatigueLevel !== undefined && (
                                    <div>
                                        <div className="text-xs sm:text-sm text-gray-400 mb-1">
                                            {dict?.players?.fatigueLevel || 'Fatigue Level'}
                                        </div>
                                        <div className="text-sm sm:text-base text-white">{player.fatigueLevel}/10</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
