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
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Back to Dashboard Button */}
            <div className="max-w-6xl mx-auto px-6 pt-6">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${lang}/matches`)}
                    className="mb-6 bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                >
                    {dict?.navigation?.backToMatches || '← Back to Matches'}
                </Button>
            </div>
            {/* Content Area */}
            <div className="max-w-6xl mx-auto px-6 pb-6">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-4">
                        {dict?.myPicks?.title || 'My Predictions'}
                    </h1>
                    <p className="text-gray-300 max-w-2xl mx-auto">
                        {dict?.myPicks?.subtitle || 'View your prediction history and the points you&apos;ve earned.'}
                    </p>
                </div>

                {/* Active Bets Section */}
                {!loadingBets && !error && (
                    <div className="mb-8">
                        <h2 className="text-md font-bold text-white mb-4">
                            {dict?.myPicks?.activeBets || 'Active Bets'}
                        </h2>
                        {(() => {
                            const activeBets = bets.filter(bet => bet.status === 'active');
                            return activeBets.length > 0 ? (
                                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                                    <div className="space-y-2">
                                        {activeBets.map((bet) => (
                                            <div key={bet.id} className="bg-slate-700 rounded-lg p-3 border border-slate-600 hover:bg-slate-650 transition-colors min-h-[80px]">
                                                <div className="flex justify-between items-center h-full">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="font-semibold text-white text-sm">
                                                                <span className="md:hidden">{bet.matchTitleShort}</span>
                                                                <span className="hidden md:inline truncate">{bet.matchTitle}</span>
                                                            </h3>
                                                        </div>
                                                        <p className="text-gray-400 text-xs mb-1">
                                                            {new Date(bet.created_at).toLocaleDateString('en-GB', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        <p className="text-gray-300 text-xs">
                                                            <span className="font-medium text-white">{dict?.myPicks?.prediction || 'Prediction'}:</span> {formatPrediction(bet.prediction)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-4 flex-shrink-0">
                                                        <div className="text-green-400 font-bold text-sm flex items-center justify-end gap-1">
                                                            {bet.betAmount} <CoinIcon size={14} />
                                                        </div>
                                                        <div className="text-gray-400 text-xs">
                                                            {bet.multiplier}x
                                                        </div>
                                                        <div className="text-gray-300 text-xs mt-1">
                                                            {dict?.myPicks?.potential || 'Potential'}: <span className="text-green-400 font-medium items-center justify-end gap-1 inline-flex">{bet.potentialWinnings} <CoinIcon size={12} /></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
                                    <p className="text-gray-300 mb-4">
                                        {dict?.myPicks?.noActiveBets || 'No active bets at the moment.'}
                                    </p>
                                    <Button onClick={() => router.push(`/${lang}/matches`)} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                                        {dict?.myPicks?.goToMatches || 'Go to Matches'}
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Bet History Section */}
                {loadingBets ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                        <p className="text-gray-300">{dict?.myPicks?.loadingBets || 'Loading your bets...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-red-400 mb-4">{error}</p>
                        <Button onClick={loadBets} variant="outline" className="border-gray-600 text-gray-300">
                            {dict?.myPicks?.tryAgain || 'Try Again'}
                        </Button>
                    </div>
                ) : bets.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-300 mb-4">{dict?.myPicks?.noBetsFound || 'No bets found. Start making predictions to see them here!'}</p>
                        <Button onClick={() => router.push(`/${lang}/matches`)} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                            {dict?.myPicks?.goToMatches || 'Go to Matches'}
                        </Button>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-md font-bold text-white mb-4">
                            {dict?.myPicks?.betHistory || 'Bet History'}
                        </h2>
                        {(() => {
                            const resolvedBets = bets.filter(bet => bet.status !== 'active');
                            const totalPages = Math.ceil(totalBets / betsPerPage);

                            return (
                                <>
                                    <BetHistoryTable bets={resolvedBets} dict={dict} />
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-6">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-gray-300 text-sm px-4">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 text-sm border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
                                            >
                                                Next
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