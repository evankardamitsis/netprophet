'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { useTheme } from '../Providers';
import { useDictionary } from '@/context/DictionaryContext';
import { firstInitialUpper } from '@/lib/greekTypography';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface MatchDetails {
    tournament: string;
    round: string;
    surface: string;
    player1: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number; teamName?: string | null };
    player2: { name: string; odds: number; wins: number; losses: number; ntrpRating?: number; teamName?: string | null };
    headToHead: string;
    headToHeadData?: {
        player_a_wins: number;
        player_b_wins: number;
        total_matches: number;
        last_match_date?: string;
        last_match_result?: string;
    } | null;
    format: string;
    matchType?: 'singles' | 'doubles';
}

interface Match {
    id: string;
    status: string;
}

interface MatchHeaderProps {
    match: Match;
    details: MatchDetails;
    player1Id?: string | null;
    player2Id?: string | null;
    defaultExpanded?: boolean;
}

export function MatchHeader({ match, details, player1Id, player2Id, defaultExpanded }: MatchHeaderProps) {
    const { theme } = useTheme();
    const { dict, lang } = useDictionary();
    const router = useRouter();
    const params = useParams();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? true);

    const isDoubles = details.matchType === 'doubles';

    // Helper to format player/team name for display
    const formatName = (name: string, isCompact: boolean = false) => {
        if (isDoubles) {
            // For doubles, format each player name: "LASTNAME F. & LASTNAME F."
            const formatPlayerName = (fullName: string) => {
                const parts = fullName.trim().split(' ');
                if (parts.length >= 2) {
                    const lastName = parts[parts.length - 1];
                    const firstName = parts[0];
                    const firstInitial = firstInitialUpper(lang, firstName);
                    return `${lastName} ${firstInitial}.`;
                }
                return fullName;
            };

            // Split by " & " to get individual player names
            if (name.includes(' & ')) {
                const [player1, player2] = name.split(' & ');
                return `${formatPlayerName(player1)} & ${formatPlayerName(player2)}`;
            }
            return name;
        }
        // For singles, show last name + first initial on compact view
        if (isCompact) {
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
                const lastName = parts[parts.length - 1];
                const firstName = parts[0];
                const firstInitial = firstInitialUpper(lang, firstName);
                return `${lastName} ${firstInitial}.`;
            }
            return name;
        }
        return name;
    };

    // Auto-expand on large screens, collapse on small screens (skip if caller sets defaultExpanded)
    useEffect(() => {
        if (defaultExpanded !== undefined) return;
        const handleResize = () => {
            setIsExpanded(window.innerWidth >= 1024);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [defaultExpanded]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const isBestOf5 = details.format === 'best-of-5';

    // Function to translate head-to-head string
    const translateHeadToHead = (headToHead: string) => {
        // Check if the string contains "leads"
        if (headToHead.includes('leads')) {
            return headToHead.replace('leads', dict?.matches?.leads || 'leads');
        }
        return headToHead;
    };

    // Function to navigate to player page
    const navigateToPlayer = (playerId: string | null | undefined) => {
        if (playerId && params?.lang) {
            router.push(`/${params.lang}/players/${playerId}`);
        }
    };

    return (
        <div className="overflow-hidden">
            {/* Compact header — always visible */}
            <div className="p-3">
                {/* Tournament meta */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wider truncate">
                            {details.tournament}
                        </p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                            {details.round ? `${details.round} · ${details.surface}` : details.surface}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="ml-2 w-7 h-7 rounded-full bg-[#1E2A45] flex items-center justify-center text-[#4B5975] hover:text-white transition-colors flex-shrink-0"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                        <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Players vs row */}
                <div className="flex items-stretch gap-2">
                    {/* Player 1 */}
                    <button
                        onClick={() => navigateToPlayer(player1Id)}
                        disabled={!player1Id || isDoubles}
                        className={`flex-1 flex flex-col items-center text-center p-3 rounded-xl bg-[#1E2A45] border border-white/[0.06] transition-all ${player1Id && !isDoubles ? 'hover:border-[#38BDF8]/40 hover:bg-[#263354] cursor-pointer' : 'cursor-default'}`}
                    >
                        <span className="text-xs font-semibold text-white break-words leading-tight">
                            {formatName(details.player1.name, true)}
                            {details.player1.ntrpRating ? <span className="text-[#4B5975] font-normal"> ({details.player1.ntrpRating.toFixed(1)})</span> : null}
                        </span>
                        {details.player1.teamName && (
                            <span className="text-[#FF6B2B] text-[10px] leading-tight mt-0.5">{details.player1.teamName}</span>
                        )}
                        <span className="text-sm font-black text-[#38BDF8] mt-1 tabular-nums">{details.player1.odds.toFixed(2)}×</span>
                    </button>

                    {/* VS */}
                    <div className="flex items-center justify-center w-8 flex-shrink-0">
                        <span className="text-[9px] font-black text-[#4B5975] tracking-[0.1em]" style={{ writingMode: 'vertical-rl' }}>VS</span>
                    </div>

                    {/* Player 2 */}
                    <button
                        onClick={() => navigateToPlayer(player2Id)}
                        disabled={!player2Id || isDoubles}
                        className={`flex-1 flex flex-col items-center text-center p-3 rounded-xl bg-[#1E2A45] border border-white/[0.06] transition-all ${player2Id && !isDoubles ? 'hover:border-[#38BDF8]/40 hover:bg-[#263354] cursor-pointer' : 'cursor-default'}`}
                    >
                        <span className="text-xs font-semibold text-white break-words leading-tight">
                            {formatName(details.player2.name, true)}
                            {details.player2.ntrpRating ? <span className="text-[#4B5975] font-normal"> ({details.player2.ntrpRating.toFixed(1)})</span> : null}
                        </span>
                        {details.player2.teamName && (
                            <span className="text-[#FF6B2B] text-[10px] leading-tight mt-0.5">{details.player2.teamName}</span>
                        )}
                        <span className="text-sm font-black text-[#38BDF8] mt-1 tabular-nums">{details.player2.odds.toFixed(2)}×</span>
                    </button>
                </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                    {/* Format pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-[#1E2A45] border border-white/[0.06] text-[11px] font-semibold text-[#94A3B8]">
                            🎾 {isBestOf5 ? (dict?.matches?.bestOf5 || 'Καλύτερος από 5 σετ') : (dict?.matches?.bestOf3 || 'Καλύτερος από 3 σετ')}
                        </span>
                    </div>

                    {/* H2H card */}
                    <div className="rounded-xl bg-[#1E2A45] border border-white/[0.06] p-3">
                        <p className="text-[10px] font-bold text-[#4B5975] uppercase tracking-wider mb-2">
                            {dict?.matches?.headToHead || 'Head to Head'}
                        </p>
                        {details.headToHeadData && details.headToHeadData.total_matches > 0 ? (
                            <div className="space-y-2">
                                {/* Win bar */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white tabular-nums w-6 text-right">{details.headToHeadData.player_a_wins}</span>
                                    <div className="flex-1 h-2 rounded-full bg-[#0F1628] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] to-[#38BDF8]/60"
                                            style={{ width: `${(details.headToHeadData.player_a_wins / details.headToHeadData.total_matches) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-white tabular-nums w-6">{details.headToHeadData.player_b_wins}</span>
                                </div>
                                <p className="text-[10px] text-[#4B5975] text-center">
                                    {details.headToHeadData.total_matches} {dict?.athletes?.totalMatches || 'κοινοί αγώνες'}
                                    {details.headToHeadData.last_match_date && (
                                        <> · Τελευταίος: {new Date(details.headToHeadData.last_match_date).toLocaleDateString('el-GR')}</>
                                    )}
                                </p>
                                <p className="text-xs text-[#94A3B8] text-center">{translateHeadToHead(details.headToHead)}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-[#4B5975]">Δεν υπάρχουν κοινοί αγώνες</p>
                        )}
                    </div>

                    {/* Player stats cards */}
                    {(() => {
                        const p1Total = details.player1.wins + details.player1.losses;
                        const p2Total = details.player2.wins + details.player2.losses;
                        const p1Pct = p1Total > 0 ? Math.round((details.player1.wins / p1Total) * 100) : null;
                        const p2Pct = p2Total > 0 ? Math.round((details.player2.wins / p2Total) * 100) : null;
                        return (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-[#1E2A45] border border-white/[0.06] p-3">
                                    <button
                                        onClick={() => navigateToPlayer(player1Id)}
                                        disabled={!player1Id || isDoubles}
                                        className={`text-xs font-semibold text-white text-left w-full leading-tight mb-2 ${player1Id && !isDoubles ? 'hover:text-[#38BDF8] cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="break-words">{formatName(details.player1.name, true)}</span>
                                            {details.player1.teamName && <span className="text-[#FF6B2B] text-[10px] leading-tight break-words">{details.player1.teamName}</span>}
                                        </div>
                                    </button>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-[#00E676]">✅ {details.player1.wins}</span>
                                                <span className="text-[10px] text-[#4B5975]">W</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-[#4B5975]">L</span>
                                                <span className="text-[10px] font-bold text-[#FF4545]">{details.player1.losses} ❌</span>
                                            </div>
                                        </div>
                                        {p1Pct !== null && (
                                            <>
                                                <div className="h-1.5 rounded-full bg-[#0F1628] overflow-hidden mt-1">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-[#00E676] to-[#00C853]"
                                                        style={{ width: `${p1Pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] font-black text-center tabular-nums" style={{ color: p1Pct >= 60 ? '#00E676' : p1Pct >= 40 ? '#FFD60A' : '#FF4545' }}>
                                                    {p1Pct}% νίκες
                                                </p>
                                            </>
                                        )}
                                        {details.player1.ntrpRating && (
                                            <div className="mt-1 px-2 py-0.5 rounded-full bg-[#0F1628] text-center">
                                                <span className="text-[10px] font-bold text-[#38BDF8]">NTRP {details.player1.ntrpRating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-xl bg-[#1E2A45] border border-white/[0.06] p-3">
                                    <button
                                        onClick={() => navigateToPlayer(player2Id)}
                                        disabled={!player2Id || isDoubles}
                                        className={`text-xs font-semibold text-white text-left w-full leading-tight mb-2 ${player2Id && !isDoubles ? 'hover:text-[#38BDF8] cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="break-words">{formatName(details.player2.name, true)}</span>
                                            {details.player2.teamName && <span className="text-[#FF6B2B] text-[10px] leading-tight break-words">{details.player2.teamName}</span>}
                                        </div>
                                    </button>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-[#00E676]">✅ {details.player2.wins}</span>
                                                <span className="text-[10px] text-[#4B5975]">W</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-[#4B5975]">L</span>
                                                <span className="text-[10px] font-bold text-[#FF4545]">{details.player2.losses} ❌</span>
                                            </div>
                                        </div>
                                        {p2Pct !== null && (
                                            <>
                                                <div className="h-1.5 rounded-full bg-[#0F1628] overflow-hidden mt-1">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-[#00E676] to-[#00C853]"
                                                        style={{ width: `${p2Pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] font-black text-center tabular-nums" style={{ color: p2Pct >= 60 ? '#00E676' : p2Pct >= 40 ? '#FFD60A' : '#FF4545' }}>
                                                    {p2Pct}% νίκες
                                                </p>
                                            </>
                                        )}
                                        {details.player2.ntrpRating && (
                                            <div className="mt-1 px-2 py-0.5 rounded-full bg-[#0F1628] text-center">
                                                <span className="text-[10px] font-bold text-[#38BDF8]">NTRP {details.player2.ntrpRating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
} 