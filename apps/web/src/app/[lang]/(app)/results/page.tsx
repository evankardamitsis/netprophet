'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@netprophet/lib';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { ResultsTournamentFilter } from '@/components/matches/ResultsTournamentFilter';
import { useDictionary } from '@/context/DictionaryContext';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

interface MatchResult {
    id: string;
    tournament_name: string;
    category_name: string;
    player_a_name: string;
    player_a_ntrp: number;
    player_b_name: string;
    player_b_ntrp: number;
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
    const [allResults, setAllResults] = useState<TournamentResults[]>([]);
    const [loadingResults, setLoadingResults] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
    const [tournamentPages, setTournamentPages] = useState<Record<string, number>>({});
    const [tournamentTotals, setTournamentTotals] = useState<Record<string, number>>({});
    const resultsPerPage = 10;

    // Load match results with pagination
    const loadResults = async () => {
        try {
            setLoadingResults(true);
            setError(null);

            // First, get all tournaments that have finished matches
            const { data: tournamentsData, error: tournamentsError } = await supabase
                .from('matches')
                .select(`
                    tournament_id,
                    tournaments(id, name),
                    tournament_categories(name)
                `)
                .eq('status', 'finished')
                .not('tournaments', 'is', null);

            if (tournamentsError) {
                throw tournamentsError;
            }

            // Extract unique tournaments with their IDs
            const uniqueTournaments = new Map<string, { name: string; id: string }>();
            tournamentsData?.forEach((match) => {
                const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                const tournamentName = tournament?.name || 'Unknown Tournament';
                const tournamentId = tournament?.id || match.tournament_id || '';

                // Use only tournament name as key to avoid duplicates
                if (!uniqueTournaments.has(tournamentName)) {
                    uniqueTournaments.set(tournamentName, { name: tournamentName, id: tournamentId });
                }
            });

            const tournamentResults: TournamentResults[] = [];
            const totals: Record<string, number> = {};

            // OPTIMIZATION: Add timeout and limit to prevent hanging queries
            const queryTimeout = 5000; // 5 second timeout per tournament

            // Fetch paginated results for each tournament (with timeout protection)
            for (const [tournamentKey, tournamentInfo] of uniqueTournaments) {
                let tournamentMatches: any[] = [];

                try {
                    // Get total count for this tournament using tournament_id (with timeout)
                    const countPromise = supabase
                        .from('matches')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'finished')
                        .eq('tournament_id', tournamentInfo.id);

                    const { count, error: countError } = await Promise.race([
                        countPromise,
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Query timeout')), queryTimeout)
                        )
                    ]) as any;

                    if (countError) {
                        console.error(`Error getting count for ${tournamentInfo.name}:`, countError);
                        continue;
                    }

                    totals[tournamentInfo.name] = count || 0;

                    // Get first page of results for this tournament (with timeout)
                    const matchesPromise = supabase
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
                            tournament_categories(name),
                            player_a:players!matches_player_a_id_fkey(id, first_name, last_name, ntrp_rating),
                            player_b:players!matches_player_b_id_fkey(id, first_name, last_name, ntrp_rating),
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
                        .eq('tournament_id', tournamentInfo.id)
                        .order('updated_at', { ascending: false })
                        .range(0, resultsPerPage - 1);

                    const { data: matchesData, error: matchesError } = await Promise.race([
                        matchesPromise,
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Query timeout')), queryTimeout)
                        )
                    ]) as any;

                    if (matchesError) {
                        console.error(`Error fetching matches for ${tournamentInfo.name}:`, matchesError);
                        continue;
                    }

                    tournamentMatches = matchesData || [];
                } catch (timeoutError) {
                    console.error(`Timeout fetching data for ${tournamentInfo.name}:`, timeoutError);
                    continue;
                }

                // Transform matches data
                const matches: MatchResult[] = [];
                tournamentMatches?.forEach((match: any) => {
                    const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                    const tournamentName = tournament?.name || 'Unknown Tournament';
                    const category = Array.isArray(match.tournament_categories) ? match.tournament_categories[0] : match.tournament_categories;
                    const categoryName = category?.name || 'Unknown Category';
                    const playerA = Array.isArray(match.player_a) ? match.player_a[0] : match.player_a;
                    const playerB = Array.isArray(match.player_b) ? match.player_b[0] : match.player_b;
                    const playerAName = `${playerA?.first_name || ''} ${playerA?.last_name || ''}`.trim() || 'Unknown Player';
                    const playerBName = `${playerB?.first_name || ''} ${playerB?.last_name || ''}`.trim() || 'Unknown Player';
                    const playerANtrp = playerA?.ntrp_rating || 0;
                    const playerBNtrp = playerB?.ntrp_rating || 0;

                    // Get the match result data
                    const matchResultData = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;

                    // Determine winner name based on winner_id in match_results
                    let winnerName = 'TBD';
                    if (matchResultData?.winner_id) {
                        // Check if winner is player A or player B
                        if (matchResultData.winner_id === match.player_a_id) {
                            winnerName = playerAName;
                        } else if (matchResultData.winner_id === match.player_b_id) {
                            winnerName = playerBName;
                        }
                    }

                    const matchResult: MatchResult = {
                        id: match.id,
                        tournament_name: tournamentName,
                        category_name: categoryName,
                        player_a_name: playerAName,
                        player_a_ntrp: playerANtrp,
                        player_b_name: playerBName,
                        player_b_ntrp: playerBNtrp,
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

                    matches.push(matchResult);
                });

                // Add tournament results
                if (matches.length > 0) {
                    tournamentResults.push({
                        tournament_name: tournamentInfo.name,
                        matches: matches.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    });
                }
            }

            // Sort tournaments by most recent match
            tournamentResults.sort((a, b) => {
                const aLatest = new Date(a.matches[0]?.updated_at || 0).getTime();
                const bLatest = new Date(b.matches[0]?.updated_at || 0).getTime();
                return bLatest - aLatest;
            });

            setAllResults(tournamentResults);
            setResults(tournamentResults);
            setTournamentTotals(totals);
            setTournamentPages(Object.fromEntries(Array.from(uniqueTournaments.values()).map(tournament => [tournament.name, 1])));
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

    // Handle tournament filtering
    const handleTournamentSelect = (tournament: string | null) => {
        setSelectedTournament(tournament);

        if (tournament === null) {
            setResults(allResults);
        } else {
            // Filter from existing results
            const filteredResults = allResults.filter(result => result.tournament_name === tournament);
            setResults(filteredResults);
        }
    };

    // Flatten all matches for the tournament filter
    const allMatches = allResults.flatMap(tournament => tournament.matches);

    // Load more results for a specific tournament
    const loadMoreResults = async (tournamentName: string, page: number) => {
        try {
            const start = (page - 1) * resultsPerPage;
            const end = start + resultsPerPage - 1;

            // Find the tournament ID from allResults
            const tournament = allResults.find(t => t.tournament_name === tournamentName);
            if (!tournament) {
                console.error(`Tournament ${tournamentName} not found`);
                return;
            }

            // Get tournament ID from the first match
            const firstMatch = tournament.matches[0];
            if (!firstMatch) {
                console.error(`No matches found for tournament ${tournamentName}`);
                return;
            }

            const { data: tournamentMatches, error: matchesError } = await supabase
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
                    tournament_categories(name),
                    player_a:players!matches_player_a_id_fkey(id, first_name, last_name, ntrp_rating),
                    player_b:players!matches_player_b_id_fkey(id, first_name, last_name, ntrp_rating),
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
                .eq('tournaments.name', tournamentName)
                .order('updated_at', { ascending: false })
                .range(start, end);

            if (matchesError) {
                console.error(`Error fetching more matches for ${tournamentName}:`, matchesError);
                return;
            }

            // Transform matches data
            const matches: MatchResult[] = [];
            tournamentMatches?.forEach((match) => {
                const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                const tournamentName = tournament?.name || 'Unknown Tournament';
                const category = Array.isArray(match.tournament_categories) ? match.tournament_categories[0] : match.tournament_categories;
                const categoryName = category?.name || 'Unknown Category';
                const playerA = Array.isArray(match.player_a) ? match.player_a[0] : match.player_a;
                const playerB = Array.isArray(match.player_b) ? match.player_b[0] : match.player_b;
                const playerAName = `${playerA?.first_name || ''} ${playerA?.last_name || ''}`.trim() || 'Unknown Player';
                const playerBName = `${playerB?.first_name || ''} ${playerB?.last_name || ''}`.trim() || 'Unknown Player';
                const playerANtrp = playerA?.ntrp_rating || 0;
                const playerBNtrp = playerB?.ntrp_rating || 0;

                // Get the match result data
                const matchResultData = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;

                // Determine winner name based on winner_id in match_results
                let winnerName = 'TBD';
                if (matchResultData?.winner_id) {
                    // Check if winner is player A or player B
                    if (matchResultData.winner_id === match.player_a_id) {
                        winnerName = playerAName;
                    } else if (matchResultData.winner_id === match.player_b_id) {
                        winnerName = playerBName;
                    }
                }

                const matchResult: MatchResult = {
                    id: match.id,
                    tournament_name: tournamentName,
                    category_name: categoryName,
                    player_a_name: playerAName,
                    player_a_ntrp: playerANtrp,
                    player_b_name: playerBName,
                    player_b_ntrp: playerBNtrp,
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

                matches.push(matchResult);
            });

            // Update the specific tournament's matches in allResults
            setAllResults(prevResults =>
                prevResults.map(tournament =>
                    tournament.tournament_name === tournamentName
                        ? { ...tournament, matches: matches.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) }
                        : tournament
                )
            );

            // Update the current results if this tournament is currently displayed
            setResults(prevResults =>
                prevResults.map(tournament =>
                    tournament.tournament_name === tournamentName
                        ? { ...tournament, matches: matches.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) }
                        : tournament
                )
            );

            // Update page state
            setTournamentPages(prev => ({ ...prev, [tournamentName]: page }));
        } catch (err) {
            console.error('Error loading more results:', err);
        }
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
                    variant="ghost"
                    onClick={() => router.push(`/${lang}/matches`)}
                    className="mb-6 text-gray-300 hover:text-white hover:bg-slate-800/50 px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base"
                >
                    {dict?.navigation?.backToMatches || '← Back to Matches'}
                </Button>
            </div>

            {/* Content Area */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 relative z-10">
                {/* Page Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
                        {dict?.results?.title || 'Match Results'}
                    </h1>
                    <p className="text-sm sm:text-lg text-white/90 font-bold max-w-2xl mx-auto px-2">
                        {dict?.results?.subtitle || 'View the latest match results and tournament outcomes.'}
                    </p>
                </div>

                {/* Tournament Filter */}
                {!loadingResults && !error && allResults.length > 0 && (
                    <ResultsTournamentFilter
                        tournaments={allResults.map(t => t.tournament_name)}
                        tournamentTotals={tournamentTotals}
                        onTournamentSelect={handleTournamentSelect}
                        selectedTournament={selectedTournament}
                    />
                )}

                {/* Results Content */}
                {loadingResults ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
                        </div>
                        <p className="text-white text-lg font-bold">{dict?.results?.loadingResults || 'Loading results...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 mb-4">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <p className="text-red-300 text-lg font-bold mb-6">{error}</p>
                        <Button onClick={loadResults} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg">
                            {dict?.results?.tryAgain || 'Try Again'}
                        </Button>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4">
                            <span className="text-4xl">🎾</span>
                        </div>
                        <p className="text-white text-lg font-bold mb-6">{dict?.results?.noResults || 'No results available yet.'}</p>
                        <Button onClick={() => router.push(`/${lang}/matches`)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg">
                            {dict?.results?.goToMatches || 'Go to Matches'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 sm:space-y-8">
                        {results.map((tournament) => (
                            <div key={tournament.tournament_name} className="relative group">
                                {/* Gradient border effect */}
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-3xl opacity-75 group-hover:opacity-100 blur transition duration-300"></div>

                                <Card className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-0 shadow-2xl rounded-3xl overflow-hidden">
                                    <CardHeader className="pb-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-2 drop-shadow-lg truncate">
                                                    🏆 {tournament.tournament_name}
                                                </CardTitle>
                                                <p className="text-purple-200 text-xs sm:text-sm lg:text-base font-bold">
                                                    {tournament.matches.length} {dict?.results?.matches || 'matches'} • {dict?.results?.latestResults || 'Latest results'}
                                                </p>
                                            </div>
                                            <div className="hidden sm:block text-4xl lg:text-6xl opacity-30 flex-shrink-0">🎾</div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="space-y-3 sm:space-y-4">
                                            {tournament.matches.map((match) => {
                                                const isPlayerAWinner = match.winner_name === match.player_a_name;
                                                const isPlayerBWinner = match.winner_name === match.player_b_name;


                                                return (
                                                    <div key={match.id} className="relative group/item">
                                                        {/* Gradient border effect */}
                                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover/item:opacity-60 blur transition duration-300"></div>

                                                        <div className="relative bg-gradient-to-br from-slate-700/90 via-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-purple-400/50 transition-all">
                                                            {/* Date and Category Badge */}
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-purple-300 text-xs sm:text-sm font-bold">📅</span>
                                                                    <p className="text-purple-200 text-xs sm:text-sm font-bold">
                                                                        {new Date(match.updated_at).toLocaleDateString('en-GB', {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg whitespace-nowrap">
                                                                    {match.category_name}
                                                                </span>
                                                            </div>

                                                            {/* Players and Score - Centered Layout */}
                                                            <div className="flex flex-col items-center gap-3">
                                                                {/* Players Row */}
                                                                <div className="flex items-center justify-between gap-3 w-full">
                                                                    {/* Player A */}
                                                                    <div className="flex-1 text-center">
                                                                        <div className={`font-black text-sm sm:text-base lg:text-lg mb-1 ${isPlayerAWinner ? '!text-green-500 drop-shadow-lg' : 'text-gray-400'}`}>
                                                                            {match.player_a_name}
                                                                        </div>
                                                                        <div className="text-xs text-purple-300 font-bold">
                                                                            NTRP {match.player_a_ntrp.toFixed(1)}
                                                                        </div>
                                                                    </div>

                                                                    {/* VS Badge */}
                                                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex-shrink-0">
                                                                        VS
                                                                    </div>

                                                                    {/* Player B */}
                                                                    <div className="flex-1 text-center">
                                                                        <div className={`font-black text-sm sm:text-base lg:text-lg mb-1 ${isPlayerBWinner ? '!text-green-500 drop-shadow-lg' : 'text-gray-400'}`}>
                                                                            {match.player_b_name}
                                                                        </div>
                                                                        <div className="text-xs text-purple-300 font-bold">
                                                                            NTRP {match.player_b_ntrp.toFixed(1)}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Score - Centered below VS */}
                                                                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-500/30">
                                                                    <div className="text-sm sm:text-base font-black text-white text-center">
                                                                        {formatScore(match)}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Pagination Controls */}
                                        {(() => {
                                            const totalMatches = tournamentTotals[tournament.tournament_name] || 0;
                                            const currentPage = tournamentPages[tournament.tournament_name] || 1;
                                            const totalPages = Math.ceil(totalMatches / resultsPerPage);

                                            if (totalPages <= 1) return null;

                                            return (
                                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6 pt-6 border-t border-purple-500/30">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => loadMoreResults(tournament.tournament_name, currentPage - 1)}
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
                                                        size="sm"
                                                        onClick={() => loadMoreResults(tournament.tournament_name, currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all w-full sm:w-auto"
                                                    >
                                                        Next →
                                                    </Button>
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
