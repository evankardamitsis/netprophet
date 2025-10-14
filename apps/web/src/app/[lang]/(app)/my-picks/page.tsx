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
    const betsPerPage = 20;

    // Helper function to format prediction for display
    const formatPrediction = (prediction: any) => {
        const parts = [];
        if (prediction.winner) parts.push(`Winner: ${prediction.winner}`);
        if (prediction.matchResult) parts.push(`Result: ${prediction.matchResult}`);
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

                const match = bet.match;
                let matchTitle = 'Unknown Match';
                let matchTitleShort = 'Unknown Match';

                if (match && match.player_a && match.player_b) {
                    const playerAName = `${match.player_a.first_name} ${match.player_a.last_name}`;
                    const playerBName = `${match.player_b.first_name} ${match.player_b.last_name}`;

                    // On mobile: first letter of first name + full last name
                    const playerAShort = `${match.player_a.first_name.charAt(0)}. ${match.player_a.last_name}`;
                    const playerBShort = `${match.player_b.first_name.charAt(0)}. ${match.player_b.last_name}`;

                    matchTitle = `${playerAName} vs ${playerBName}`;
                    matchTitleShort = `${playerAShort} vs ${playerBShort}`;
                } else if (bet.match_id) {
                    // If we have a match_id but no match data, show the match ID
                    matchTitle = `Match ${bet.match_id.slice(0, 8)}...`;
                    matchTitleShort = `Match ${bet.match_id.slice(0, 8)}...`;
                } else {
                    matchTitle = 'Unknown Match';
                    matchTitleShort = 'Unknown Match';
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
    }, [user, loading, router, lang, loadBets]);

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${lang}`);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen relative flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
                <div className="text-center">
                    <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
                    </div>
                    <p className="text-white text-lg font-bold">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            {/* Back to Dashboard Button */}
            <div className="max-w-6xl mx-auto px-6 pt-6 relative z-10">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${lang}/matches`)}
                    className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                    {dict?.navigation?.backToMatches || '← Back to Matches'}
                </Button>
            </div>

            {/* Content Area */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 relative z-10">
                {/* Page Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-block px-4 py-2 rounded-full mb-4" style={{ backgroundColor: '#BE05A1' }}>
                        <p className="text-sm sm:text-base text-white font-bold">
                            🎯 {dict?.myPicks?.title || 'My Predictions'}
                        </p>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
                        {dict?.myPicks?.title || 'My Predictions'}
                    </h1>
                    <p className="text-lg sm:text-xl text-white/90 font-bold max-w-2xl mx-auto px-2">
                        {dict?.myPicks?.subtitle || 'View your prediction history and the points you\'ve earned.'}
                    </p>
                </div>

                {/* Active Bets Section */}
                {!loadingBets && !error && (
                    <div className="mb-8 sm:mb-12">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6 drop-shadow-lg">
                            {dict?.myPicks?.activeBets || 'Active Bets'}
                        </h2>
                        {(() => {
                            const activeBets = bets.filter(bet => bet.status === 'active');
                            return activeBets.length > 0 ? (
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 rounded-3xl opacity-40 group-hover:opacity-60 blur transition"></div>
                                    <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-3xl border-0 shadow-2xl p-6">
                                        <div className="space-y-3">
                                            {activeBets.map((bet) => (
                                                <div key={bet.id} className="relative group/item">
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-30 group-hover/item:opacity-50 blur transition"></div>
                                                    <div className="relative bg-gradient-to-br from-slate-700/90 via-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 hover:border-purple-400/50 transition-all">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-black text-white text-base sm:text-lg mb-2">
                                                                    <span className="md:hidden">{bet.matchTitleShort}</span>
                                                                    <span className="hidden md:inline truncate">{bet.matchTitle}</span>
                                                                </h3>
                                                                <p className="text-purple-300 text-xs mb-2">
                                                                    {new Date(bet.created_at).toLocaleDateString('en-GB', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    })}
                                                                </p>
                                                                <p className="text-purple-200 text-xs sm:text-sm">
                                                                    <span className="font-bold text-white">{dict?.myPicks?.prediction || 'Prediction'}:</span> {formatPrediction(bet.prediction)}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-row sm:flex-col sm:text-right gap-3 sm:gap-2 flex-shrink-0">
                                                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-green-500/30">
                                                                    <div className="text-green-400 font-black text-sm flex items-center gap-1">
                                                                        {bet.betAmount} <CoinIcon size={14} />
                                                                    </div>
                                                                    <div className="text-purple-300 text-xs">
                                                                        {bet.multiplier}x
                                                                    </div>
                                                                </div>
                                                                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-500/30">
                                                                    <div className="text-purple-300 text-xs font-bold mb-1">
                                                                        {dict?.myPicks?.potential || 'Potential'}
                                                                    </div>
                                                                    <div className="text-green-400 font-black text-sm flex items-center gap-1">
                                                                        {bet.potentialWinnings} <CoinIcon size={14} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="inline-block p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4">
                                        <span className="text-4xl">🎯</span>
                                    </div>
                                    <p className="text-white text-lg font-bold mb-6">
                                        {dict?.myPicks?.noActiveBets || 'No active bets at the moment.'}
                                    </p>
                                    <Button onClick={() => router.push(`/${lang}/matches`)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg">
                                        {dict?.myPicks?.goToMatches || 'Go to Matches'}
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Bet History Section */}
                {loadingBets ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
                        </div>
                        <p className="text-white text-lg font-bold">{dict?.myPicks?.loadingBets || 'Loading your bets...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 mb-4">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <p className="text-red-300 text-lg font-bold mb-6">{error}</p>
                        <Button onClick={loadBets} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg">
                            {dict?.myPicks?.tryAgain || 'Try Again'}
                        </Button>
                    </div>
                ) : bets.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4">
                            <span className="text-4xl">🎯</span>
                        </div>
                        <p className="text-white text-lg font-bold mb-6">{dict?.myPicks?.noBetsFound || 'No bets found. Start making predictions to see them here!'}</p>
                        <Button onClick={() => router.push(`/${lang}/matches`)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg">
                            {dict?.myPicks?.goToMatches || 'Go to Matches'}
                        </Button>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6 drop-shadow-lg">
                            {dict?.myPicks?.betHistory || 'Bet History'}
                        </h2>
                        {(() => {
                            const resolvedBets = bets.filter(bet => bet.status !== 'active');
                            const totalPages = Math.ceil(totalBets / betsPerPage);

                            return (
                                <>
                                    <BetHistoryTable bets={resolvedBets} dict={dict} />
                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6 pt-6 border-t border-purple-500/30">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all w-full sm:w-auto"
                                            >
                                                ← Previous
                                            </Button>
                                            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-500/30 whitespace-nowrap">
                                                <span className="text-white text-sm font-bold">
                                                    Page <span className="text-purple-300">{currentPage}</span> of <span className="text-purple-300">{totalPages}</span>
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all w-full sm:w-auto"
                                            >
                                                Next →
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