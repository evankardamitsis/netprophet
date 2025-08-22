'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { BetsService } from '@netprophet/lib';
import { BetHistoryTable } from '@/components/matches/BetHistoryTable';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { useDictionary } from '@/context/DictionaryContext';
import { PredictionHistory } from '@/components/matches/PredictionHistory';

// Interface for bet data with match details
interface BetWithMatchDetails {
    id: string;
    matchTitle: string;
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

    // Load user bets
    const loadBets = async () => {
        try {
            setLoadingBets(true);
            setError(null);
            const betsData = await BetsService.getBetsWithMatches();

            console.log('Raw bets data:', betsData);

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

                if (match && match.player_a && match.player_b) {
                    const playerAName = `${match.player_a.first_name} ${match.player_a.last_name}`;
                    const playerBName = `${match.player_b.first_name} ${match.player_b.last_name}`;
                    matchTitle = `${playerAName} vs ${playerBName}`;
                } else if (bet.match_id) {
                    // If we have a match_id but no match data, show the match ID
                    matchTitle = `Match ${bet.match_id.slice(0, 8)}...`;
                } else {
                    matchTitle = 'Unknown Match';
                }

                const createdDate = new Date(bet.created_at);
                const date = createdDate.toISOString().split('T')[0];
                const time = createdDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return {
                    id: bet.id,
                    matchTitle,
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
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${lang}/auth/signin`);
        } else if (user) {
            loadBets();
        }
    }, [user, loading, router, lang]);

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
                    ← Back to Dashboard
                </Button>
            </div>
            {/* Content Area */}
            <div className="max-w-6xl mx-auto px-6 pb-6">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        {dict?.myPicks?.title || 'My Predictions'}
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {dict?.myPicks?.subtitle || 'View your prediction history and the points you&apos;ve earned.'}
                    </p>
                </div>

                {/* Prediction History */}
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
                        <Button onClick={() => router.push(`/${lang}/matches`)} variant="outline" className="border-gray-600 text-gray-300">
                            {dict?.myPicks?.goToMatches || 'Go to Matches'}
                        </Button>
                    </div>
                ) : (
                    <BetHistoryTable bets={bets} dict={dict} />
                )}
            </div>
        </div>
    );
} 