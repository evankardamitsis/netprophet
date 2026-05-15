'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { BetsService } from '@netprophet/lib';
import { BetHistoryTable } from '@/components/matches/BetHistoryTable';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { useDictionary } from '@/context/DictionaryContext';
import { PredictionHistory } from '@/components/matches/PredictionHistory';
import CoinIcon from '@/components/CoinIcon';

// Interface for bet data with match details
interface BetWithMatchDetails {
    id: string;
    matchTitle: string;
    matchTitleShort: string;
    date: string;
    time: string;
    prediction: {
        winner?: string;
        score?: string;
        tiebreak?: string;
        matchResult?: string;
        set1Score?: string;
        set2Score?: string;
        set3Score?: string;
        superTiebreakScore?: string;
    };
    status: 'active' | 'won' | 'lost';
    pointsEarned: number;
    betAmount: number;
    potentialWinnings: number;
    multiplier: number;
    created_at: string;
}

export default function MyPicksPage() {
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;
    const { user, signOut, loading } = useAuth();
    const { dict } = useDictionary();
    const [bets, setBets] = useState<BetWithMatchDetails[]>([]);
    const [loadingBets, setLoadingBets] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalBets, setTotalBets] = useState(0);
    const [isActiveBetsMinimized, setIsActiveBetsMinimized] = useState(true);
    const betsPerPage = 20;

    // When landing with #bet-{id}, expand active bets and scroll to the bet
    useEffect(() => {
        if (typeof window === 'undefined' || loadingBets) return;
        const hash = window.location.hash;
        if (hash?.startsWith('#bet-')) {
            setIsActiveBetsMinimized(false);
            const id = hash.slice(1);
            const timer = setTimeout(() => {
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [loadingBets]);

    // Helper function to format prediction for display
    const formatPrediction = (prediction: any) => {
        const parts = [];
        if (prediction.winner) parts.push(`Νικητής: ${prediction.winner}`);
        if (prediction.matchResult) parts.push(`Αποτέλεσμα: ${prediction.matchResult}`);
        if (prediction.set1Score) parts.push(`Set 1: ${prediction.set1Score}`);
        if (prediction.set2Score) parts.push(`Set 2: ${prediction.set2Score}`);
        if (prediction.set3Score) parts.push(`Set 3: ${prediction.set3Score}`);
        if (prediction.superTiebreakScore) parts.push(`Super TB: ${prediction.superTiebreakScore}`);
        return parts.join(' | ');
    };

    // Load user bets
    const loadBets = useCallback(async () => {
        try {
            setLoadingBets(true);
            setError(null);

            // Ensure user is authenticated
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { bets: betsData, total } = await BetsService.getBetsWithMatches(currentPage, betsPerPage);
            setTotalBets(total);

            // Transform bets data to match the expected format
            const transformedBets: BetWithMatchDetails[] = betsData.map(bet => {
                let prediction: any = {};

                // Handle different prediction formats
                if (typeof bet.prediction === 'string') {
                    // Try to parse as JSON first
                    try {
                        prediction = JSON.parse(bet.prediction);
                    } catch (e) {
                        // If it's not valid JSON, treat it as a simple string prediction
                        // Extract winner from string like "Winner: Player Name | Result: 2-0"
                        const winnerMatch = bet.prediction.match(/Winner:\s*([^|]+)/);
                        const resultMatch = bet.prediction.match(/Result:\s*([^|]+)/);

                        prediction = {
                            winner: winnerMatch ? winnerMatch[1].trim() : null,
                            matchResult: resultMatch ? resultMatch[1].trim() : null,
                        };
                    }
                } else if (bet.prediction) {
                    prediction = bet.prediction;
                }

                type PlayerLite = { first_name?: string; last_name?: string; name?: string };
                type MatchLite = {
                    match_type?: 'singles' | 'doubles';
                    player_a?: PlayerLite | PlayerLite[];
                    player_b?: PlayerLite | PlayerLite[];
                    player_a1?: PlayerLite | PlayerLite[];
                    player_a2?: PlayerLite | PlayerLite[];
                    player_b1?: PlayerLite | PlayerLite[];
                    player_b2?: PlayerLite | PlayerLite[];
                    // Derived fields that exist on the matches list
                    player1?: { name?: string };
                    player2?: { name?: string };
                    team1?: { name?: string; players?: PlayerLite[] };
                    team2?: { name?: string; players?: PlayerLite[] };
                };

                const normalizePlayer = (player?: PlayerLite | PlayerLite[]) => {
                    if (!player) return null;
                    const resolved = Array.isArray(player) ? player[0] : player;
                    if (!resolved) return null;
                    // Some match transforms provide a combined name string
                    if (resolved.name) {
                        const [first, ...rest] = resolved.name.split(' ');
                        const last = rest.join(' ');
                        return { first_name: first, last_name: last };
                    }
                    const first = resolved.first_name || '';
                    const last = resolved.last_name || '';
                    if (!first && !last) return null;
                    return { first_name: first, last_name: last };
                };

                const matchRaw = (bet.match || {}) as MatchLite;
                const match = {
                    ...matchRaw,
                    player_a: normalizePlayer(matchRaw.player_a) || undefined,
                    player_b: normalizePlayer(matchRaw.player_b) || undefined,
                    player_a1: normalizePlayer(matchRaw.player_a1) || undefined,
                    player_a2: normalizePlayer(matchRaw.player_a2) || undefined,
                    player_b1: normalizePlayer(matchRaw.player_b1) || undefined,
                    player_b2: normalizePlayer(matchRaw.player_b2) || undefined,
                };
                const matchHasData = Object.values(match).some(Boolean);
                let matchTitle = 'Unknown Match';
                let matchTitleShort = 'Unknown Match';

                const formatPlayerName = (player: any, short = false) => {
                    if (!player) return 'TBD';
                    const first = player.first_name || '';
                    const last = player.last_name || '';
                    if (short) {
                        const initial = first ? `${first.charAt(0)}.` : '';
                        return `${initial} ${last}`.trim();
                    }
                    return `${first} ${last}`.trim() || 'TBD';
                };

                const getPlayerFullName = (player?: PlayerLite) => {
                    if (!player) return 'TBD';
                    const first = player.first_name || '';
                    const last = player.last_name || '';
                    const full = `${first} ${last}`.trim();
                    return full || 'TBD';
                };

                const getPlayersForTeam = (teamPlayers?: PlayerLite[], fallback1?: PlayerLite, fallback2?: PlayerLite) => {
                    const normalized = teamPlayers?.map(p => normalizePlayer(p) || p).filter(Boolean) || [];
                    if (normalized.length) return normalized;
                    return [fallback1, fallback2].filter(Boolean);
                };

                const hasAnyTeamPlayers =
                    (match.team1?.players && match.team1.players.length > 0) ||
                    (match.team2?.players && match.team2.players.length > 0) ||
                    match.player_a1 || match.player_a2 || match.player_b1 || match.player_b2;
                const hasAnyTeamIds =
                    (match as any).player_a1_id || (match as any).player_a2_id || (match as any).player_b1_id || (match as any).player_b2_id;
                const isDoubles = (match.match_type || (hasAnyTeamPlayers ? 'doubles' : 'singles')) === 'doubles' || hasAnyTeamPlayers || hasAnyTeamIds;

                const team1Players = getPlayersForTeam(match.team1?.players, match.player_a1, match.player_a2);
                const team2Players = getPlayersForTeam(match.team2?.players, match.player_b1, match.player_b2);

                // Build computed names similar to MatchesList transform so we mirror table display
                const teamAName = isDoubles && team1Players.length === 2
                    ? `${getPlayerFullName(team1Players[0] as PlayerLite)} & ${getPlayerFullName(team1Players[1] as PlayerLite)}`
                    : getPlayerFullName(match.player_a as PlayerLite);

                const teamBName = isDoubles && team2Players.length === 2
                    ? `${getPlayerFullName(team2Players[0] as PlayerLite)} & ${getPlayerFullName(team2Players[1] as PlayerLite)}`
                    : getPlayerFullName(match.player_b as PlayerLite);

                const setFromTeamPlayers = () => {
                    const teamA = team1Players.length
                        ? team1Players.map(p => formatPlayerName(p, false)).join(' / ')
                        : (match.team1?.name || teamAName || 'Team A');
                    const teamB = team2Players.length
                        ? team2Players.map(p => formatPlayerName(p, false)).join(' / ')
                        : (match.team2?.name || teamBName || 'Team B');
                    const teamAShort = team1Players.length
                        ? team1Players.map(p => formatPlayerName(p, true)).join(' / ')
                        : (match.team1?.name || teamAName || 'Team A');
                    const teamBShort = team2Players.length
                        ? team2Players.map(p => formatPlayerName(p, true)).join(' / ')
                        : (match.team2?.name || teamBName || 'Team B');
                    matchTitle = `${teamA} vs ${teamB}`;
                    matchTitleShort = `${teamAShort} vs ${teamBShort}`;
                };

                const setFromPlayerNames = (playerAName: string, playerBName: string) => {
                    const playerAShort = playerAName.split(' ').length > 1 ? `${playerAName.split(' ')[0][0]}. ${playerAName.split(' ').slice(1).join(' ')}` : playerAName;
                    const playerBShort = playerBName.split(' ').length > 1 ? `${playerBName.split(' ')[0][0]}. ${playerBName.split(' ').slice(1).join(' ')}` : playerBName;
                    matchTitle = `${playerAName} vs ${playerBName}`;
                    matchTitleShort = `${playerAShort} vs ${playerBShort}`;
                };

                if (matchHasData && isDoubles && (team1Players.length || team2Players.length)) {
                    setFromTeamPlayers();
                } else if (matchHasData && isDoubles) {
                    matchTitle = match.team1?.name && match.team2?.name ? `${match.team1.name} vs ${match.team2.name}` : `${teamAName} vs ${teamBName}`;
                    matchTitleShort = matchTitle;
                } else if (matchHasData && (match.player1?.name || match.player2?.name)) {
                    setFromPlayerNames(match.player1?.name || 'Player A', match.player2?.name || 'Player B');
                } else if (matchHasData && (match.player_a || match.player_b)) {
                    setFromPlayerNames(
                        formatPlayerName(match.player_a, false) || 'Player A',
                        formatPlayerName(match.player_b, false) || 'Player B'
                    );
                } else if (matchHasData && isDoubles) {
                    matchTitle = 'Team A vs Team B';
                    matchTitleShort = matchTitle;
                } else if (matchHasData && (match as any).player_a_id && (match as any).player_b_id) {
                    matchTitle = 'Player A vs Player B';
                    matchTitleShort = matchTitle;
                } else if (bet.match_id) {
                    if (prediction.winner) {
                        matchTitle = prediction.winner;
                        matchTitleShort = prediction.winner;
                    } else {
                        matchTitle = `Match ${bet.match_id.slice(0, 8)}...`;
                        matchTitleShort = `Match ${bet.match_id.slice(0, 8)}...`;
                    }
                } else {
                    matchTitle = 'Unknown Match';
                    matchTitleShort = 'Unknown Match';
                }

                if (prediction.winner && (matchTitle === 'Unknown Match' || matchTitle.startsWith('Match '))) {
                    matchTitle = prediction.winner;
                    matchTitleShort = prediction.winner;
                }

                const createdDate = new Date(bet.created_at);
                const date = createdDate.toLocaleDateString('en-GB');
                const time = createdDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return {
                    id: bet.id,
                    matchTitle,
                    matchTitleShort,
                    date,
                    time,
                    prediction: {
                        winner: prediction.winner,
                        score: prediction.matchResult,
                        tiebreak: prediction.tieBreak ? 'Yes' : 'No',
                        matchResult: prediction.matchResult,
                        set1Score: prediction.set1Score,
                        set2Score: prediction.set2Score,
                        set3Score: prediction.set3Score,
                        superTiebreakScore: prediction.superTiebreakScore,
                    },
                    status: bet.status as 'active' | 'won' | 'lost',
                    pointsEarned: bet.status === 'won' ? bet.potential_winnings : 0,
                    betAmount: bet.bet_amount,
                    potentialWinnings: bet.potential_winnings,
                    multiplier: bet.multiplier,
                    created_at: bet.created_at,
                };
            });

            setBets(transformedBets);
        } catch (err) {
            console.error('Error loading bets:', err);
            setError(err instanceof Error ? err.message : 'Failed to load bets');
        } finally {
            setLoadingBets(false);
        }
    }, [user, currentPage, betsPerPage]);

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${lang}/auth/signin`);
        } else if (user && !loading) {
            loadBets();
        }
    }, [loading, router, lang, loadBets, user]);

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${lang}`);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#080C18]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FFD60A] border-t-transparent mx-auto mb-4" />
                    <p className="text-[#94A3B8] text-sm font-semibold">Φόρτωση...</p>
                </div>
            </div>
        );
    }

    const wonBets = bets.filter(b => b.status === 'won');
    const totalBetsCount = bets.filter(b => b.status !== 'active').length;
    const accuracy = totalBetsCount > 0 ? Math.round((wonBets.length / totalBetsCount) * 100) : 0;
    const totalEarnings = wonBets.reduce((sum, b) => sum + b.potentialWinnings, 0);

    return (
        <div className="min-h-screen bg-[#080C18]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 np-page-pad">
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-black text-white">
                        {dict?.myPicks?.title || 'Οι Προβλέψεις Μου'}
                    </h1>
                    <p className="text-[#94A3B8] text-sm mt-1">
                        {dict?.myPicks?.subtitle || 'Το ιστορικό και τα αποτελέσματα των προβλέψεών σου.'}
                    </p>
                </div>

                {/* Stat Summary Strip */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 mb-6 [scrollbar-width:none]">
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border bg-[#161F35] border-white/[0.06] text-sm font-bold text-white">
                        <span>🎯</span>
                        <span className="text-[#94A3B8] font-medium">Ακρίβεια:</span>
                        <span className="tabular-nums">{accuracy}%</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border bg-[#FFD60A]/10 border-[#FFD60A]/30 text-sm font-bold text-[#FFD60A]">
                        <span>🪙</span>
                        <span className="font-medium opacity-70">Κέρδη:</span>
                        <span className="tabular-nums">+{totalEarnings.toLocaleString('el-GR')}</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border bg-[#161F35] border-white/[0.06] text-sm font-bold text-white">
                        <span>📊</span>
                        <span className="text-[#94A3B8] font-medium">Συνολικά:</span>
                        <span className="tabular-nums">{bets.length}</span>
                    </div>
                </div>

                {/* Active Bets Section */}
                {!loadingBets && !error && (() => {
                    const activeBets = bets.filter(bet => bet.status === 'active');
                    if (activeBets.length === 0) return null;
                    return (
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-lg font-black text-white">
                                    {dict?.myPicks?.activeBets || 'Ενεργές Προβλέψεις'}
                                </h2>
                                <button
                                    onClick={() => setIsActiveBetsMinimized(!isActiveBetsMinimized)}
                                    className="text-[#94A3B8] hover:text-white transition-colors text-sm"
                                >
                                    {isActiveBetsMinimized ? '▼' : '▲'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {activeBets.map((bet) => (
                                    <div key={bet.id} id={`bet-${bet.id}`}
                                         className="bg-[#161F35] border border-[#38BDF8]/20 rounded-xl p-4 scroll-mt-24">
                                        {isActiveBetsMinimized ? (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-white text-sm truncate">
                                                        <span className="md:hidden">{bet.matchTitleShort}</span>
                                                        <span className="hidden md:inline">{bet.matchTitle}</span>
                                                    </h3>
                                                    <p className="text-[#94A3B8] text-xs truncate mt-0.5">
                                                        {formatPrediction(bet.prediction)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-xs">
                                                    <span className="text-[#94A3B8]">Ποσό: <span className="text-white font-bold tabular-nums">{bet.betAmount} 🪙</span></span>
                                                    <span className="text-[#94A3B8]">Πιθανά Κέρδη: <span className="text-[#00E676] font-bold tabular-nums">{bet.potentialWinnings} 🪙</span></span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-white text-base truncate">
                                                            <span className="md:hidden">{bet.matchTitleShort}</span>
                                                            <span className="hidden md:inline">{bet.matchTitle}</span>
                                                        </h3>
                                                        <p className="text-[#94A3B8] text-xs mt-1">
                                                            {new Date(bet.created_at).toLocaleDateString('el-GR', {
                                                                day: 'numeric', month: 'short', year: 'numeric'
                                                            })}
                                                        </p>
                                                        <p className="text-[#94A3B8] text-xs mt-1">
                                                            <span className="text-white font-semibold">{dict?.myPicks?.prediction || 'Πρόβλεψη'}:</span>{' '}
                                                            {formatPrediction(bet.prediction)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm pt-3 border-t border-white/[0.06]">
                                                    <span className="text-[#94A3B8]">
                                                        Ποσό: <span className="text-white font-bold tabular-nums">{bet.betAmount} 🪙</span>
                                                        <span className="text-[#4B5975] ml-2">× {bet.multiplier}</span>
                                                    </span>
                                                    <span className="text-[#94A3B8]">
                                                        Πιθανά Κέρδη: <span className="text-[#00E676] font-bold tabular-nums">{bet.potentialWinnings} 🪙</span>
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Bet History Section */}
                {loadingBets ? (
                    <div className="text-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FFD60A] border-t-transparent mx-auto mb-4" />
                        <p className="text-[#94A3B8] text-sm">{dict?.myPicks?.loadingBets || 'Φόρτωση προβλέψεων...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <p className="text-[#FF4545] text-sm font-semibold mb-4">{error}</p>
                        <Button onClick={loadBets}
                                className="px-6 py-2.5 rounded-full bg-[#FFD60A] text-[#080C18] font-bold text-sm">
                            {dict?.myPicks?.tryAgain || 'Δοκίμασε ξανά'}
                        </Button>
                    </div>
                ) : bets.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-4 text-center">
                        <span className="text-5xl opacity-40">🎯</span>
                        <p className="text-lg font-bold text-white">{dict?.myPicks?.noBetsFound || 'Δεν υπάρχουν προβλέψεις ακόμα'}</p>
                        <p className="text-sm text-[#94A3B8] max-w-[260px]">Κάνε την πρώτη σου πρόβλεψη και δες τα αποτελέσματά σου εδώ!</p>
                        <Button onClick={() => router.push(`/${lang}/matches`)}
                                className="px-6 py-3 rounded-full bg-[#FFD60A] text-[#080C18] font-bold text-sm">
                            Πήγαινε στους Αγώνες →
                        </Button>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-lg font-black text-white mb-4">
                            {dict?.myPicks?.betHistory || 'Ιστορικό Προβλέψεων'}
                        </h2>
                        {(() => {
                            const resolvedBets = bets.filter(bet => bet.status !== 'active');
                            const totalPages = Math.ceil(totalBets / betsPerPage);

                            return (
                                <>
                                    <BetHistoryTable bets={resolvedBets} />
                                    {totalPages > 1 && (
                                        <div className="flex flex-row justify-center items-center gap-2 mt-6 pt-6 border-t border-white/[0.06]">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.max(1, prev - 1));
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 text-sm font-bold bg-[#1E2A45] border-white/[0.12] text-white hover:bg-[#263354] disabled:opacity-40"
                                            >
                                                ← Προηγούμενη
                                            </Button>
                                            <span className="text-[#94A3B8] text-sm px-3">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 text-sm font-bold bg-[#1E2A45] border-white/[0.12] text-white hover:bg-[#263354] disabled:opacity-40"
                                            >
                                                Επόμενη →
                                            </Button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
} 