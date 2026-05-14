'use client';

import { Player } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import { calculateWinRate } from '../utils';

interface PlayerStatsGridProps {
    player: Player;
}

export function PlayerStatsGrid({ player }: PlayerStatsGridProps) {
    const { dict } = useDictionary();
    const winRate = calculateWinRate(player.wins, player.losses);
    const winRateColor = winRate >= 60 ? '#00E676' : winRate >= 40 ? '#FFD60A' : '#FF4545';
    const isWinStreak = player.streakType === 'W';

    const tiles = [
        {
            label: dict?.athletes?.winRate || 'Win Rate',
            value: `${winRate}%`,
            color: winRateColor,
            icon: '🎯',
        },
        {
            label: dict?.athletes?.record || 'Record',
            value: `${player.wins}–${player.losses}`,
            color: '#FFFFFF',
            icon: '📊',
        },
        {
            label: dict?.athletes?.currentStreak || 'Streak',
            value: `${player.currentStreak} ${isWinStreak ? 'W' : 'L'}`,
            color: isWinStreak ? '#00E676' : '#FF4545',
            icon: isWinStreak ? '🔥' : '❄️',
        },
        {
            label: dict?.athletes?.totalMatches || 'Αγώνες',
            value: String(player.wins + player.losses),
            color: '#38BDF8',
            icon: '🎾',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {tiles.map((tile) => (
                <div key={tile.label} className="relative overflow-hidden rounded-2xl bg-[#161F35] border border-white/[0.06] p-4 text-center">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
                    <div className="text-xl mb-1">{tile.icon}</div>
                    <div className="text-2xl font-black tabular-nums mb-0.5" style={{ color: tile.color }}>
                        {tile.value}
                    </div>
                    <div className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wide">
                        {tile.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
