'use client';

import { Match } from '@/types/dashboard';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useDictionary } from '@/context/DictionaryContext';
import { useActiveBets } from '@/hooks/useActiveBets';
import { motion } from 'framer-motion';

interface LiveMatchesGridProps {
    liveMatches: Match[];
    sidebarOpen?: boolean;
    slipCollapsed?: boolean;
}

export function LiveMatchesGrid({ liveMatches, sidebarOpen = true, slipCollapsed }: LiveMatchesGridProps) {
    const onSelectMatch = useMatchSelect();
    const { slipCollapsed: contextSlipCollapsed } = usePredictionSlip();
    const { dict, prepForUppercaseDisplay } = useDictionary();
    const isSlipCollapsed = slipCollapsed ?? contextSlipCollapsed;
    const { activeBetMatchIds } = useActiveBets();

    const filteredLiveMatches = liveMatches.filter(match => match.status !== 'cancelled');

    const formatPlayerName = (player: any) => {
        if (!player) return 'TBD';
        const first = player.first_name || '';
        const last = player.last_name || '';
        return `${first} ${last}`.trim() || 'TBD';
    };

    const abbreviateName = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length < 2) return name;
        return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
    };

    const renderDoublesNames = (players?: any[], alignRight = false) => {
        const [p1, p2] = players || [];
        if (!p1 && !p2) return <span className="text-[#4B5975]">TBD</span>;
        return (
            <div className={`flex flex-col leading-tight gap-0.5 ${alignRight ? 'items-end' : ''}`}>
                <span className="truncate">{formatPlayerName(p1)}</span>
                <span className="truncate">{formatPlayerName(p2)}</span>
            </div>
        );
    };

    if (filteredLiveMatches.length === 0) return null;

    const gridCols = sidebarOpen && !isSlipCollapsed
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    return (
        <div className="mb-4 mt-4 lg:mt-6">
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-[#FF4545] animate-pulse flex-shrink-0" />
                    {dict?.sidebar?.liveMatches || 'Live Matches'}
                    <span className="text-[#4B5975] font-semibold text-xs">({filteredLiveMatches.length})</span>
                </h2>
                {/* Scroll arrows — desktop only */}
                <div className="hidden lg:flex gap-1">
                    {(['left', 'right'] as const).map(dir => (
                        <button
                            key={dir}
                            onClick={() => document.querySelector('.live-matches-container')?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#1E2A45] border border-white/[0.06] text-[#4B5975] hover:text-white hover:border-white/[0.12] transition-colors text-sm"
                            aria-label={`Scroll ${dir}`}
                        >
                            {dir === 'left' ? '←' : '→'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards */}
            <div className={`live-matches-container ${
                filteredLiveMatches.some(m => m.locked)
                    ? 'flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-2 snap-x snap-mandatory'
                    : `grid gap-3 ${gridCols}`
            }`}>
                {filteredLiveMatches.map((match) => {
                    const isUnderdog = !match.locked && Math.abs(match.player1.odds - match.player2.odds) > 2.5;
                    const hasActiveBet = activeBetMatchIds.has(match.id);
                    const p1Fav = match.player1.odds <= match.player2.odds;

                    return (
                        <div
                            key={match.id}
                            onClick={() => !match.locked && onSelectMatch(match)}
                            className={[
                                'relative overflow-hidden rounded-2xl border transition-all duration-150 flex flex-col',
                                match.locked
                                    ? 'bg-[#161F35] border-white/[0.04] cursor-not-allowed opacity-60 p-3 min-w-[280px] snap-start flex-shrink-0'
                                    : isUnderdog
                                    ? 'bg-[#161F35] border-[#FF6B2B]/30 cursor-pointer hover:border-[#FF6B2B]/50 hover:-translate-y-px p-4'
                                    : 'bg-[#161F35] border-white/[0.06] cursor-pointer hover:border-white/[0.12] hover:-translate-y-px p-4',
                            ].join(' ')}
                        >
                            {/* Top shine */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

                            {/* Active bet badge */}
                            {hasActiveBet && (
                                <div className="absolute -top-px left-3 px-2 py-0.5 rounded-b-lg bg-[#00E676]/15 border-x border-b border-[#00E676]/30 text-[#00E676] text-[9px] font-black tracking-wide">
                                    ✓ ΠΡΟΒΛΕΨΗ ΕΝΕΡΓΗ
                                </div>
                            )}

                            {/* Underdog badge */}
                            {isUnderdog && (
                                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 text-[#FF6B2B] text-[9px] font-black animate-pulse">
                                    🔥 UNDERDOG
                                </div>
                            )}

                            {match.locked ? (
                                /* ── LOCKED (upcoming) compact card ── */
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#4B5975]" />
                                            <span className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wide truncate max-w-[160px]">
                                                {prepForUppercaseDisplay(match.tournament)}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-[#4B5975]">{match.time}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">
                                                {match.match_type === 'doubles'
                                                    ? renderDoublesNames(match.team1?.players)
                                                    : abbreviateName(match.player1.name)}
                                            </p>
                                            <p className="text-[10px] text-[#4B5975]">NTRP {match.player_a?.ntrp_rating?.toFixed(1) ?? '—'}</p>
                                        </div>
                                        <span className="text-[9px] font-black text-[#263354] flex-shrink-0">VS</span>
                                        <div className="flex-1 min-w-0 text-right">
                                            <p className="text-xs font-bold text-white truncate">
                                                {match.match_type === 'doubles'
                                                    ? renderDoublesNames(match.team2?.players, true)
                                                    : abbreviateName(match.player2.name)}
                                            </p>
                                            <p className="text-[10px] text-[#4B5975]">NTRP {match.player_b?.ntrp_rating?.toFixed(1) ?? '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm font-black text-white tabular-nums">{match.player1.odds.toFixed(2)}<span className="text-[10px] text-[#4B5975] ml-0.5">×</span></span>
                                        <span className="text-sm font-black text-white tabular-nums">{match.player2.odds.toFixed(2)}<span className="text-[10px] text-[#4B5975] ml-0.5">×</span></span>
                                    </div>
                                </>
                            ) : (
                                /* ── ACTIVE (live) full card ── */
                                <>
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3 gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#FF4545]/12 border border-[#FF4545]/30 text-[#FF4545] text-[9px] font-black flex-shrink-0">
                                                🔴 {dict?.sidebar?.live || 'LIVE'}
                                            </span>
                                            <span className="text-[#94A3B8] text-[11px] font-semibold truncate">
                                                {match.tournament}
                                                {match.round && <span className="text-[#4B5975]"> · {match.round}</span>}
                                            </span>
                                        </div>
                                        <span className="text-[#4B5975] text-[11px] tabular-nums flex-shrink-0">{match.time}</span>
                                    </div>

                                    {/* Players + odds */}
                                    <div className="flex items-stretch gap-2 flex-1">
                                        {/* Player 1 */}
                                        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-3 rounded-xl bg-[#1E2A45] border border-white/[0.06] gap-1.5 min-w-0">
                                            <span className="text-[11px] font-bold text-[#94A3B8] leading-tight w-full truncate">
                                                {match.match_type === 'doubles'
                                                    ? renderDoublesNames(match.team1?.players)
                                                    : abbreviateName(match.player1.name)}
                                            </span>
                                            <span className="text-[9px] text-[#4B5975]">
                                                NTRP {match.player_a?.ntrp_rating?.toFixed(1) ?? '—'}
                                            </span>
                                            <span className={`text-2xl font-black tabular-nums leading-none ${p1Fav ? 'text-[#38BDF8]' : 'text-[#FF6B2B]'}`}>
                                                {match.player1.odds.toFixed(2)}
                                                <span className="text-sm opacity-60 ml-0.5">×</span>
                                            </span>
                                        </div>

                                        {/* VS */}
                                        <div className="flex items-center justify-center w-5 flex-shrink-0">
                                            <span className="text-[8px] font-black text-[#4B5975] tracking-[0.1em]" style={{ writingMode: 'vertical-rl' }}>VS</span>
                                        </div>

                                        {/* Player 2 */}
                                        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-3 rounded-xl bg-[#1E2A45] border border-white/[0.06] gap-1.5 min-w-0">
                                            <span className="text-[11px] font-bold text-[#94A3B8] leading-tight w-full truncate">
                                                {match.match_type === 'doubles'
                                                    ? renderDoublesNames(match.team2?.players, true)
                                                    : abbreviateName(match.player2.name)}
                                            </span>
                                            <span className="text-[9px] text-[#4B5975]">
                                                NTRP {match.player_b?.ntrp_rating?.toFixed(1) ?? '—'}
                                            </span>
                                            <span className={`text-2xl font-black tabular-nums leading-none ${!p1Fav ? 'text-[#38BDF8]' : 'text-[#FF6B2B]'}`}>
                                                {match.player2.odds.toFixed(2)}
                                                <span className="text-sm opacity-60 ml-0.5">×</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <motion.button
                                        onClick={(e) => { e.stopPropagation(); onSelectMatch(match); }}
                                        className="w-full mt-3 py-2.5 rounded-xl bg-[#FFD60A] text-[#080C18] font-black text-sm shadow-[0_4px_16px_rgba(255,214,10,0.25)] hover:bg-[#FFE033] active:scale-[0.98] transition-all duration-150"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {dict?.sidebar?.makePrediction || 'Κάνε Πρόβλεψη'}
                                    </motion.button>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
