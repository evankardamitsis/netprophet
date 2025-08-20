import { supabase } from './client';
import type { Database } from '../types/database';

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

    return { data: result, error };
  }

  /**
   * Update an existing match result
   */
  static async updateMatchResult(id: string, data: MatchResultUpdate): Promise<{ data: MatchResult | null; error: any }> {
    const { data: result, error } = await supabase
      .from('match_results')
      .update(data)
      .eq('id', id)
      .select()
      .single();

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
    const { error } = await supabase
      .from('match_results')
      .delete()
      .eq('id', id);

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
