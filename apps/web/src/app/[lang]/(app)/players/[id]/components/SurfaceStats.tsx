'use client';

import { Player } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';

interface SurfaceStatsProps {
    player: Player;
}

const SURFACES = [
    {
        key: 'hard',
        label: 'Hard Court',
        dot: '#38BDF8',
        border: 'rgba(56,189,248,0.25)',
        bg: 'rgba(56,189,248,0.05)',
        wins: (p: Player) => p.hardWins || 0,
        losses: (p: Player) => p.hardLosses || 0,
        matches: (p: Player) => p.hardMatches || 0,
        winRate: (p: Player) => p.hardWinRate,
    },
    {
        key: 'clay',
        label: 'Clay Court',
        dot: '#FF6B2B',
        border: 'rgba(255,107,43,0.25)',
        bg: 'rgba(255,107,43,0.05)',
        wins: (p: Player) => p.clayWins || 0,
        losses: (p: Player) => p.clayLosses || 0,
        matches: (p: Player) => p.clayMatches || 0,
        winRate: (p: Player) => p.clayWinRate,
    },
    {
        key: 'grass',
        label: 'Grass Court',
        dot: '#00E676',
        border: 'rgba(0,230,118,0.25)',
        bg: 'rgba(0,230,118,0.05)',
        wins: (p: Player) => p.grassWins || 0,
        losses: (p: Player) => p.grassLosses || 0,
        matches: (p: Player) => p.grassMatches || 0,
        winRate: (p: Player) => p.grassWinRate,
    },
];

export function SurfaceStats({ player }: SurfaceStatsProps) {
    const { dict } = useDictionary();

    const hasSurfaceData = ((player.hardMatches || 0) + (player.clayMatches || 0) + (player.grassMatches || 0)) > 0;
    if (!hasSurfaceData) return null;

    return (
        <div className="mt-4 mb-4">
            <h2 className="text-base font-black text-white mb-3">
                {dict?.athletes?.surfaceStats || 'Στατιστικά Επιφάνειας'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SURFACES.map(s => {
                    const wins = s.wins(player);
                    const losses = s.losses(player);
                    const matches = s.matches(player);
                    const wr = s.winRate(player);
                    const wrNum = wr ?? (matches > 0 ? Math.round((wins / matches) * 100) : null);

                    return (
                        <div
                            key={s.key}
                            className="relative overflow-hidden rounded-2xl border p-4"
                            style={{ background: s.bg, borderColor: s.border }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                                <h3 className="text-sm font-black text-white">{s.label}</h3>
                            </div>
                            <div className="space-y-2">
                                <Row label="Win Rate" value={wrNum != null ? `${wrNum}%` : '—'} color={wrNum != null ? (wrNum >= 60 ? '#00E676' : wrNum >= 40 ? '#FFD60A' : '#FF4545') : '#4B5975'} />
                                <Row label="Record" value={`${wins}–${losses}`} />
                                <Row label="Matches" value={String(matches)} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#4B5975]">{label}</span>
            <span className="text-xs font-black tabular-nums" style={{ color: color ?? '#FFFFFF' }}>{value}</span>
        </div>
    );
}
