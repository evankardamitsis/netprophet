import { supabase } from "@netprophet/lib";

/**
 * Optimized query utilities for web app performance
 * Uses Supabase built-in features for maximum efficiency
 */

export interface TournamentResults {
  tournamentName: string;
  tournamentId: string;
  matches: any[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Optimized batch fetch for tournament results with proper data transformation
 * Replaces N+1 pattern with efficient batch processing
 */
export async function fetchOptimizedTournamentResults(): Promise<{
  tournaments: Array<{
    name: string;
    id: string;
    matches: any[];
  }>;
  totals: Record<string, number>;
}> {
  try {
    // Single optimized query to get all tournament data with counts
    const { data: allMatches, error } = await supabase
      .from("matches")
      .select(
        `
                id,
                tournament_id,
                status,
                start_time,
                updated_at,
                player_a_id,
                player_b_id,
                winner_id,
                tournaments!inner (
                    id,
                    name
                ),
                tournament_categories (
                    name
                ),
                player_a:players!matches_player_a_id_fkey (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating
                ),
                player_b:players!matches_player_b_id_fkey (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating
                ),
                match_results (
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
            `
      )
      .eq("status", "finished")
      .order("updated_at", { ascending: false })
      .limit(100); // Restore reasonable limit for results

    if (error) throw error;

    // Group matches by tournament and count totals
    const tournamentMap = new Map<
      string,
      {
        name: string;
        id: string;
        matches: any[];
      }
    >();
    const totals: Record<string, number> = {};

    allMatches?.forEach((match: any) => {
      const tournament = match.tournaments;
      const tournamentId = tournament.id;
      const tournamentName = tournament.name;

      if (!tournamentMap.has(tournamentId)) {
        tournamentMap.set(tournamentId, {
          name: tournamentName,
          id: tournamentId,
          matches: [],
        });
        totals[tournamentName] = 0;
      }

      tournamentMap.get(tournamentId)!.matches.push(match);
      totals[tournamentName]++;
    });

    return {
      tournaments: Array.from(tournamentMap.values()),
      totals,
    };
  } catch (error) {
    console.error("Error fetching tournament results:", error);
    throw error;
  }
}

/**
 * Fetch more results for a specific tournament with pagination
 */
export async function fetchTournamentPage(
  tournamentName: string,
  page: number,
  resultsPerPage: number = 10
): Promise<any[]> {
  try {
    const start = (page - 1) * resultsPerPage;
    const end = start + resultsPerPage - 1;

    const { data: matches, error } = await supabase
      .from("matches")
      .select(
        `
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
      `
      )
      .eq("status", "finished")
      .eq("tournaments.name", tournamentName)
      .order("updated_at", { ascending: false })
      .range(start, end);

    if (error) throw error;
    return matches || [];
  } catch (error) {
    console.error("Error fetching tournament page:", error);
    throw error;
  }
}

/**
 * Optimized matches fetching with caching
 * Uses Supabase built-in features for better performance
 */
export async function fetchOptimizedMatches() {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
                id,
                tournament_id,
                category_id,
                player_a_id,
                player_b_id,
                winner_id,
                status,
                round,
                start_time,
                lock_time,
                odds_a,
                odds_b,
                web_synced,
                tournaments!inner (
                    id,
                    name,
                    surface,
                    location,
                    matches_type
                ),
                tournament_categories (
                    id,
                    name
                ),
                player_a:players!matches_player_a_id_fkey (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating,
                    surface_preference,
                    wins,
                    losses,
                    last5,
                    current_streak,
                    streak_type
                ),
                player_b:players!matches_player_b_id_fkey (
                    id,
                    first_name,
                    last_name,
                    ntrp_rating,
                    surface_preference,
                    wins,
                    losses,
                    last5,
                    current_streak,
                    streak_type
                )
            `
      )
      .eq("web_synced", true)
      .order("start_time", { ascending: true })
      .limit(100); // Restore reasonable limit

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching optimized matches:", error);
    throw error;
  }
}

// Removed cache key generators - using Supabase's built-in caching instead

/**
 * Transform raw match data to MatchResult format
 */
export function transformMatchData(match: any): any {
  const tournament = Array.isArray(match.tournaments)
    ? match.tournaments[0]
    : match.tournaments;
  const tournamentName = tournament?.name || "Unknown Tournament";
  const category = Array.isArray(match.tournament_categories)
    ? match.tournament_categories[0]
    : match.tournament_categories;
  const categoryName = category?.name || "Unknown Category";
  const playerA = Array.isArray(match.player_a)
    ? match.player_a[0]
    : match.player_a;
  const playerB = Array.isArray(match.player_b)
    ? match.player_b[0]
    : match.player_b;
  const playerAName =
    `${playerA?.first_name || ""} ${playerA?.last_name || ""}`.trim() ||
    "Unknown Player";
  const playerBName =
    `${playerB?.first_name || ""} ${playerB?.last_name || ""}`.trim() ||
    "Unknown Player";
  const playerANtrp = playerA?.ntrp_rating || 0;
  const playerBNtrp = playerB?.ntrp_rating || 0;

  // Get the match result data
  const matchResultData = Array.isArray(match.match_results)
    ? match.match_results[0]
    : match.match_results;

  // Determine winner name based on winner_id in match_results
  let winnerName = "TBD";
  if (matchResultData?.winner_id) {
    // Check if winner is player A or player B
    if (matchResultData.winner_id === match.player_a_id) {
      winnerName = playerAName;
    } else if (matchResultData.winner_id === match.player_b_id) {
      winnerName = playerBName;
    }
  }

  return {
    id: match.id,
    tournament_name: tournamentName,
    category_name: categoryName,
    player_a_name: playerAName,
    player_a_ntrp: playerANtrp,
    player_b_name: playerBName,
    player_b_ntrp: playerBNtrp,
    winner_name: winnerName,
    match_result: matchResultData?.match_result || "",
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
}

// Removed cache TTL constants - using Supabase's built-in caching instead
