'use client';

import { Player } from '@netprophet/lib';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { useState } from 'react';

interface PlayerCardProps {
    player: Player;
    className?: string;
    disableLink?: boolean;
}

export function PlayerCard({ player, className = '', disableLink = false }: PlayerCardProps) {
    const router = useRouter();
    const { dict, lang } = useDictionary();
    const [imageError, setImageError] = useState(false);

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

    const getStreakColor = (streak: number, type: 'W' | 'L') => {
        if (type === 'W') {
            return streak >= 3 ? 'text-green-400' : 'text-green-300';
        } else {
            return streak >= 3 ? 'text-red-400' : 'text-red-300';
        }
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

    const handleCardClick = () => {
        if (!disableLink) {
            router.push(`/${lang}/players/${player.id}`);
        }
    };

    return (
        <div
            className={`bg-slate-900/80 rounded-xl border border-slate-700 ${!disableLink ? 'hover:border-blue-500/50 cursor-pointer hover:shadow-lg hover:shadow-blue-500/10' : ''} transition-all duration-300 group ${className}`}
            onClick={handleCardClick}
        >
            {/* Athlete Photo */}
            {player.photoUrl && !imageError && (
                <div className="w-full aspect-[4/3] overflow-hidden rounded-t-xl bg-slate-800 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={player.photoUrl}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImageError(true)}
                    />
                </div>
            )}

            {/* Header with name and rating */}
            <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                        {player.firstName} {player.lastName}
                    </h3>
                    <div className={`text-sm font-bold ${getNTRPColor(player.ntrpRating)}`}>
                        NTRP {player.ntrpRating.toFixed(1)}
                    </div>
                </div>

                {/* Age and Hand */}
                <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{player.age} {dict?.athletes?.years || 'years'}</span>
                    <span>•</span>
                    <span className="capitalize">{dict?.athletes?.[player.hand.toLowerCase() as 'left' | 'right'] || player.hand} {dict?.athletes?.handed || 'handed'}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Win Rate */}
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${getWinRateColor(winRate)}`}>
                            {winRate}%
                        </div>
                        <div className="text-xs text-gray-400">
                            {dict?.athletes?.winRate || 'Win Rate'}
                        </div>
                    </div>

                    {/* Record */}
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">
                            {player.wins}-{player.losses}
                        </div>
                        <div className="text-xs text-gray-400">
                            {dict?.athletes?.record || 'Record'}
                        </div>
                    </div>
                </div>

                {/* Last 5 Matches */}
                <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">
                        {dict?.athletes?.last5 || 'Last 5 Matches'}
                    </div>
                    <div className="flex gap-1">
                        {player.last5.map((result: string, idx: number) => (
                            <div
                                key={idx}
                                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${result === 'W'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}
                            >
                                {result}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Surface Preference */}
                <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">
                        {dict?.athletes?.preferredSurface || 'Preferred Surface'}
                    </div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getSurfaceColor(player.surfacePreference)}`}>
                        {player.surfacePreference}
                    </div>
                </div>

                {/* Player Attributes */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{dict?.athletes?.aggressiveness || 'Aggressiveness'}</span>
                        <div className="flex gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i < player.aggressiveness ? 'bg-red-400' : 'bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{dict?.athletes?.stamina || 'Stamina'}</span>
                        <div className="flex gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i < player.stamina ? 'bg-green-400' : 'bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{dict?.athletes?.consistency || 'Consistency'}</span>
                        <div className="flex gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i < player.consistency ? 'bg-blue-400' : 'bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Injury Status (if available) */}
                {player.injuryStatus && player.injuryStatus !== 'healthy' && (
                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="text-xs text-red-400 font-medium">
                            {player.injuryStatus === 'minor' ? (dict?.athletes?.minorInjury || 'Minor Injury') : (dict?.athletes?.majorInjury || 'Major Injury')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
