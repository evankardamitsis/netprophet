'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@netprophet/lib';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { useDictionary } from '@/context/DictionaryContext';

interface MatchResult {
    id: string;
    tournament_name: string;
    player_a_name: string;
    player_b_name: string;
    winner_name: string;
    match_result: string;
    set1_score: string | null;
    set2_score: string | null;
    set3_score: string | null;
    set4_score: string | null;
    set5_score: string | null;
    set1_tiebreak_score: string | null;
    set2_tiebreak_score: string | null;
    set3_tiebreak_score: string | null;
    set4_tiebreak_score: string | null;
    set5_tiebreak_score: string | null;
    super_tiebreak_score: string | null;
    status: string;
    start_time: string;
    updated_at: string;
}

interface TournamentResults {
    tournament_name: string;
    matches: MatchResult[];
}

export default function ResultsPage() {
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;
    const { user, signOut, loading } = useAuth();
    const { dict } = useDictionary();
    const [results, setResults] = useState<TournamentResults[]>([]);
    const [loadingResults, setLoadingResults] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load match results
    const loadResults = async () => {
        try {
            setLoadingResults(true);
            setError(null);

            // Let's check all matches to see what we have
            const { data: allMatches, error: allMatchesError } = await supabase
                .from('matches')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(10);

            console.log('All matches with all columns:', allMatches);

            // Get finished matches with player, tournament, and detailed result data
            const { data, error: fetchError } = await supabase
                .from('matches')
                .select(`
                    id,
                    status,
                    start_time,
                    updated_at,
                    player_a_id,
                    player_b_id,
                    winner_id,
                    tournaments(name),
                    player_a:players!matches_player_a_id_fkey(id, first_name, last_name),
                    player_b:players!matches_player_b_id_fkey(id, first_name, last_name),
                    winner:players!matches_winner_id_fkey(id, first_name, last_name),
                    match_results(
                        match_result,
                        set1_score,
                        set2_score,
                        set3_score,
                        set4_score,
                        set5_score,
                        set1_tiebreak_score,
                        set2_tiebreak_score,
                        set3_tiebreak_score,
                        set4_tiebreak_score,
                        set5_tiebreak_score,
                        super_tiebreak_score,
                        winner_id,
                        created_at
                    )
                `)
                .eq('status', 'finished')
                .order('updated_at', { ascending: false });

            if (allMatchesError || fetchError) {
                throw allMatchesError || fetchError;
            }

            // Transform data and group by tournament
            const tournamentMap = new Map<string, MatchResult[]>();

            data?.forEach((match) => {
                const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                const tournamentName = tournament?.name || 'Unknown Tournament';
                const playerA = Array.isArray(match.player_a) ? match.player_a[0] : match.player_a;
                const playerB = Array.isArray(match.player_b) ? match.player_b[0] : match.player_b;
                const playerAName = `${playerA?.first_name || ''} ${playerA?.last_name || ''}`.trim() || 'Unknown Player';
                const playerBName = `${playerB?.first_name || ''} ${playerB?.last_name || ''}`.trim() || 'Unknown Player';

                // Get the match result data
                const matchResultData = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;

                // Determine winner name based on winner_id in matches table
                let winnerName = 'TBD';
                if (match.winner_id) {
                    const winner = Array.isArray(match.winner) ? match.winner[0] : match.winner;
                    if (winner) {
                        winnerName = `${winner.first_name} ${winner.last_name}`;
                    }
                }

                const matchResult: MatchResult = {
                    id: match.id,
                    tournament_name: tournamentName,
                    player_a_name: playerAName,
                    player_b_name: playerBName,
                    winner_name: winnerName,
                    match_result: matchResultData?.match_result || '',
                    set1_score: matchResultData?.set1_score || null,
                    set2_score: matchResultData?.set2_score || null,
                    set3_score: matchResultData?.set3_score || null,
                    set4_score: matchResultData?.set4_score || null,
                    set5_score: matchResultData?.set5_score || null,
                    set1_tiebreak_score: matchResultData?.set1_tiebreak_score || null,
                    set2_tiebreak_score: matchResultData?.set2_tiebreak_score || null,
                    set3_tiebreak_score: matchResultData?.set3_tiebreak_score || null,
                    set4_tiebreak_score: matchResultData?.set4_tiebreak_score || null,
                    set5_tiebreak_score: matchResultData?.set5_tiebreak_score || null,
                    super_tiebreak_score: matchResultData?.super_tiebreak_score || null,
                    status: match.status,
                    start_time: match.start_time,
                    updated_at: match.updated_at,
                };

                if (!tournamentMap.has(tournamentName)) {
                    tournamentMap.set(tournamentName, []);
                }
                tournamentMap.get(tournamentName)!.push(matchResult);
            });

            // Convert map to array and sort by most recent match
            const tournamentResults: TournamentResults[] = Array.from(tournamentMap.entries())
                .map(([tournament_name, matches]) => ({
                    tournament_name,
                    matches: matches.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                }))
                .sort((a, b) => {
                    const aLatest = new Date(a.matches[0]?.updated_at || 0).getTime();
                    const bLatest = new Date(b.matches[0]?.updated_at || 0).getTime();
                    return bLatest - aLatest;
                });

            setResults(tournamentResults);
        } catch (err) {
            console.error('Error loading results:', err);
            setError(err instanceof Error ? err.message : 'Failed to load results');
        } finally {
            setLoadingResults(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${lang}/auth/signin`);
        } else if (user && !loading) {
            loadResults();
        }
    }, [user, loading, router, lang]);

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${lang}`);
    };

    const formatScore = (match: MatchResult) => {
        if (!match.match_result || match.match_result === '') {
            return dict?.results?.resultsPending || 'Results pending';
        }

        // Start with the match result (e.g., "2-1")
        let score = match.match_result;

        // Add set scores if available
        const setScores = [];
        if (match.set1_score) setScores.push(match.set1_score);
        if (match.set2_score) setScores.push(match.set2_score);
        if (match.set3_score) setScores.push(match.set3_score);
        if (match.set4_score) setScores.push(match.set4_score);
        if (match.set5_score) setScores.push(match.set5_score);

        if (setScores.length > 0) {
            score += ` (${setScores.join(', ')})`;
        }

        // Add tiebreak information if available
        const tiebreaks = [];
        if (match.set1_tiebreak_score) tiebreaks.push(`Set 1 TB: ${match.set1_tiebreak_score}`);
        if (match.set2_tiebreak_score) tiebreaks.push(`Set 2 TB: ${match.set2_tiebreak_score}`);
        if (match.set3_tiebreak_score) tiebreaks.push(`Set 3 TB: ${match.set3_tiebreak_score}`);
        if (match.set4_tiebreak_score) tiebreaks.push(`Set 4 TB: ${match.set4_tiebreak_score}`);
        if (match.set5_tiebreak_score) tiebreaks.push(`Set 5 TB: ${match.set5_tiebreak_score}`);

        if (tiebreaks.length > 0) {
            score += ` - ${tiebreaks.join(', ')}`;
        }

        // Add super tiebreak if available
        if (match.super_tiebreak_score) {
            score += ` - Super TB: ${match.super_tiebreak_score}`;
        }

        return score;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
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
                        {dict?.results?.title || 'Match Results'}
                    </h1>
                    <p className="text-gray-300 max-w-2xl mx-auto">
                        {dict?.results?.subtitle || 'View the latest match results and tournament outcomes.'}
                    </p>
                </div>

                {/* Results Content */}
                {loadingResults ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                        <p className="text-gray-300">{dict?.results?.loadingResults || 'Loading results...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-red-400 mb-4">{error}</p>
                        <Button onClick={loadResults} variant="outline" className="border-gray-600 text-gray-300">
                            {dict?.results?.tryAgain || 'Try Again'}
                        </Button>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-300 mb-4">{dict?.results?.noResults || 'No results available yet.'}</p>
                        <Button onClick={() => router.push(`/${lang}/matches`)} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                            {dict?.results?.goToMatches || 'Go to Matches'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {results.map((tournament) => (
                            <Card key={tournament.tournament_name} className="bg-slate-800 border border-slate-700 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold text-white">
                                        {tournament.tournament_name}
                                    </CardTitle>
                                    <p className="text-gray-400 text-sm">
                                        {tournament.matches.length} {dict?.results?.matches || 'matches'} • {dict?.results?.latestResults || 'Latest results'}
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {tournament.matches.map((match) => (
                                            <div key={match.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-white">
                                                                {match.player_a_name} vs {match.player_b_name}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-400 text-sm">
                                                            {formatDate(match.updated_at)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-white">
                                                            {formatScore(match)}
                                                        </div>
                                                        {match.winner_name !== 'TBD' && (
                                                            <div className="text-sm text-gray-400">
                                                                {dict?.results?.winner || 'Winner'}: {match.winner_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
