'use client';

import { Player } from '@netprophet/lib';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { useState } from 'react';
import { createSlug } from '@/lib/utils';

interface PlayerCardProps {
    player: Player;
    className?: string;
    disableLink?: boolean;
}

export function PlayerCard({ player, className = '', disableLink = false }: PlayerCardProps) {
    const { dict, lang } = useDictionary();
    const [imageError, setImageError] = useState(false);
    const router = useRouter();

    const winRate = player.wins + player.losses > 0
        ? Math.round((player.wins / (player.wins + player.losses)) * 100)
        : 0;

    const winRateColor = winRate >= 60 ? '#00E676' : winRate >= 40 ? '#FFD60A' : '#FF4545';

    const ntrpColor = player.ntrpRating >= 4.5 ? '#8B5CF6'
        : player.ntrpRating >= 4.0 ? '#38BDF8'
        : player.ntrpRating >= 3.5 ? '#00E676'
        : player.ntrpRating >= 3.0 ? '#FFD60A'
        : '#FF6B2B';

    const surfaceColors: Record<string, { dot: string; text: string; bg: string; border: string }> = {
        hard:  { dot: '#38BDF8', text: '#38BDF8', bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.25)' },
        clay:  { dot: '#FF6B2B', text: '#FF6B2B', bg: 'rgba(255,107,43,0.10)', border: 'rgba(255,107,43,0.25)' },
        grass: { dot: '#00E676', text: '#00E676', bg: 'rgba(0,230,118,0.10)', border: 'rgba(0,230,118,0.25)' },
    };
    const surfaceKey = player.surfacePreference?.toLowerCase() ?? '';
    const surf = surfaceColors[surfaceKey] ?? { dot: '#94A3B8', text: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' };

    const handleCardClick = () => {
        if (disableLink || !player) return;
        const firstName = String(player.firstName || '').trim();
        const lastName = String(player.lastName || '').trim();
        if (firstName && lastName) {
            const slug = createSlug(`${firstName} ${lastName}`);
            if (slug) { router.push(`/${lang}/players/${slug}`); return; }
        }
        router.push(`/${lang}/players/${player.id}`);
    };

    const hasPhoto = player.photoUrl && !imageError;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl bg-[#161F35] border border-white/[0.06] transition-all duration-200 ${!disableLink ? 'cursor-pointer hover:border-white/[0.14] hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]' : ''} ${className}`}
            onClick={handleCardClick}
        >
            {/* Top shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

            {/* Photo */}
            {hasPhoto && (
                <div className="w-full aspect-[4/3] overflow-hidden bg-[#0F1628]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={player.photoUrl!}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImageError(true)}
                    />
                </div>
            )}


            {/* Content */}
            <div className="p-4">
                {/* Name + NTRP */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-white leading-tight truncate">
                            {player.firstName} {player.lastName}
                        </h3>
                        <p className="text-[11px] text-[#4B5975] mt-0.5">
                            {player.age} {dict?.athletes?.years || 'χρ.'} · {dict?.athletes?.[player.hand?.toLowerCase() as 'left' | 'right'] || player.hand} {dict?.athletes?.handed || ''}
                        </p>
                    </div>
                    <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: ntrpColor }}>
                        {player.ntrpRating.toFixed(1)}
                    </span>
                </div>

                {/* Win rate bar */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wide">
                            {dict?.athletes?.winRate || 'Win Rate'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black tabular-nums" style={{ color: winRateColor }}>
                                {winRate}%
                            </span>
                            <span className="text-[10px] text-[#4B5975]">
                                ({player.wins}W–{player.losses}L)
                            </span>
                        </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#0F1628] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${winRate}%`, backgroundColor: winRateColor }}
                        />
                    </div>
                </div>

                {/* Last 5 */}
                <div className="flex items-center gap-1 mb-3">
                    {player.last5.map((result: string, idx: number) => (
                        <div
                            key={idx}
                            className="w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center"
                            style={result === 'W'
                                ? { background: 'rgba(0,230,118,0.15)', color: '#00E676', border: '1px solid rgba(0,230,118,0.3)' }
                                : { background: 'rgba(255,69,69,0.15)', color: '#FF4545', border: '1px solid rgba(255,69,69,0.3)' }
                            }
                        >
                            {result}
                        </div>
                    ))}
                </div>

                {/* Surface pill + injury */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ color: surf.text, background: surf.bg, borderColor: surf.border }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: surf.dot }} />
                        {player.surfacePreference}
                    </span>
                    {player.injuryStatus && player.injuryStatus !== 'healthy' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-[#FF4545]/10 border-[#FF4545]/30 text-[#FF4545]">
                            ⚠ {player.injuryStatus === 'minor' ? (dict?.athletes?.minorInjury || 'Minor') : (dict?.athletes?.majorInjury || 'Major')}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
