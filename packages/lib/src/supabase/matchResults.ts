import { supabase } from './client';
import type { Database } from '../types/database';
import { updatePlayerStatsFromMatchResult, reversePlayerStatsFromMatchResult } from './players';

type MatchResult = Database['public']['Tables']['match_results']['Row'];
type MatchResultInsert = Database['public']['Tables']['match_results']['Insert'];
type MatchResultUpdate = Database['public']['Tables']['match_results']['Update'];

export interface MatchResultWithDetails extends MatchResult {
  match: {
    id: string;
    player_a_id: string | null;
    player_b_id: string | null;
    tournaments: {
      matches_type: string;
    } | null;
  } | null;
  winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set1_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set2_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set3_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set4_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set5_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  super_tiebreak_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  aces_leader: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export class MatchResultsService {
  /**
   * Create a new match result
   */
  static async createMatchResult(data: MatchResultInsert): Promise<{ data: MatchResult | null; error: any }> {
    const { data: result, error } = await supabase
      .from('match_results')
      .insert(data)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Automatically update player statistics
    if (result && data.winner_id) {
      try {
        // Get match details to find the loser and tournament surface
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            player_a_id, 
            player_b_id,
            tournaments(surface)
          `)
          .eq('id', data.match_id)
          .single();

        if (!matchError && matchData) {
          const loserId = data.winner_id === matchData.player_a_id 
            ? matchData.player_b_id 
            : matchData.player_a_id;

          if (loserId) {
            const tournamentSurface = (matchData.tournaments as any)?.surface;
            await updatePlayerStatsFromMatchResult(
              data.match_id,
              data.winner_id,
              loserId,
              new Date().toISOString(),
              tournamentSurface
            );
          }
        }
      } catch (playerUpdateError) {
        console.error('Error updating player stats:', playerUpdateError);
        // Don't fail the match result creation if player stats update fails
      }
    }

    return { data: result, error };
  }

  /**
   * Update an existing match result
   */
  static async updateMatchResult(id: string, data: MatchResultUpdate): Promise<{ data: MatchResult | null; error: any }> {
    // Get the current match result to compare
    const { data: currentResult, error: fetchError } = await supabase
      .from('match_results')
      .select('winner_id, match_id')
      .eq('id', id)
      .single();

    const { data: result, error } = await supabase
      .from('match_results')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Only update player stats if the winner changed
    if (result && data.winner_id && currentResult && data.winner_id !== currentResult.winner_id) {
      try {
        // Get match details to find the loser and tournament surface
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            player_a_id, 
            player_b_id,
            tournaments(surface)
          `)
          .eq('id', result.match_id)
          .single();

        if (!matchError && matchData) {
          const loserId = data.winner_id === matchData.player_a_id 
            ? matchData.player_b_id 
            : matchData.player_a_id;

          if (loserId) {
            const tournamentSurface = (matchData.tournaments as any)?.surface;
            await updatePlayerStatsFromMatchResult(
              result.match_id,
              data.winner_id,
              loserId,
              new Date().toISOString(),
              tournamentSurface
            );
          }
        }
      } catch (playerUpdateError) {
        console.error('Error updating player stats:', playerUpdateError);
        // Don't fail the match result update if player stats update fails
      }
    }

    return { data: result, error };
  }

  /**
   * Get match result by match ID
   */
  static async getMatchResultByMatchId(matchId: string): Promise<{ data: MatchResultWithDetails | null; error: any }> {
    const { data, error } = await supabase
      .from('match_results')
      .select(`
        *,
        match:matches(
          id,
          player_a_id,
          player_b_id,
          tournaments(matches_type)
        ),
        winner:players!match_results_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set1_winner:players!match_results_set1_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set2_winner:players!match_results_set2_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set3_winner:players!match_results_set3_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set4_winner:players!match_results_set4_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set5_winner:players!match_results_set5_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        super_tiebreak_winner:players!match_results_super_tiebreak_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        aces_leader:players!match_results_aces_leader_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('match_id', matchId)
      .single();

    return { data, error };
  }

  /**
   * Get all match results for a tournament
   */
  static async getMatchResultsByTournament(tournamentId: string): Promise<{ data: MatchResultWithDetails[] | null; error: any }> {
    const { data, error } = await supabase
      .from('match_results')
      .select(`
        *,
        match:matches(
          id,
          player_a_id,
          player_b_id,
          tournaments(matches_type)
        ),
        winner:players!match_results_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set1_winner:players!match_results_set1_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set2_winner:players!match_results_set2_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set3_winner:players!match_results_set3_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set4_winner:players!match_results_set4_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        set5_winner:players!match_results_set5_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        super_tiebreak_winner:players!match_results_super_tiebreak_winner_id_fkey(
          id,
          first_name,
          last_name
        ),
        aces_leader:players!match_results_aces_leader_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('match.tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Delete a match result
   */
  static async deleteMatchResult(id: string): Promise<{ error: any }> {
    // Get the match result details before deleting
    const { data: resultToDelete, error: fetchError } = await supabase
      .from('match_results')
      .select('winner_id, match_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('match_results')
      .delete()
      .eq('id', id);

    if (error) {
      return { error };
    }

    // Reverse player statistics if we successfully deleted the result
    if (resultToDelete && resultToDelete.winner_id) {
      try {
        // Get match details to find the loser and tournament surface
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            player_a_id, 
            player_b_id,
            tournaments(surface)
          `)
          .eq('id', resultToDelete.match_id)
          .single();

        if (!matchError && matchData) {
          const loserId = resultToDelete.winner_id === matchData.player_a_id 
            ? matchData.player_b_id 
            : matchData.player_a_id;

          if (loserId) {
            const tournamentSurface = (matchData.tournaments as any)?.surface;
            await reversePlayerStatsFromMatchResult(
              resultToDelete.match_id,
              resultToDelete.winner_id,
              loserId,
              tournamentSurface
            );
          }
        }
      } catch (playerUpdateError) {
        console.error('Error reversing player stats:', playerUpdateError);
        // Don't fail the match result deletion if player stats reversal fails
      }
    }

    return { error };
  }

  /**
   * Check if a match has results
   */
  static async hasMatchResults(matchId: string): Promise<{ data: boolean; error: any }> {
    const { count, error } = await supabase
      .from('match_results')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId);

    return { data: (count || 0) > 0, error };
  }
}
