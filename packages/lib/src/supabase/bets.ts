import { supabase } from './client';
import type { Database } from '../types/database';

type Bet = Database['public']['Tables']['bets']['Row'];
type BetInsert = Database['public']['Tables']['bets']['Insert'];
type BetUpdate = Database['public']['Tables']['bets']['Update'];
type BetStats = Database['public']['Views']['bet_stats']['Row'];

export interface CreateBetData {
  matchId: string;
  betAmount: number;
  multiplier: number;
  potentialWinnings: number;
  prediction: any; // JSONB prediction data
  description: string;
}

export interface BetWithMatch extends Bet {
  match: {
    player_a: string;
    player_b: string;
    played_at: string;
    a_score: number | null;
    b_score: number | null;
  };
}

export class BetsService {
  /**
   * Create a new bet
   */
  static async createBet(betData: CreateBetData): Promise<Bet> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a bet');
    }

    // For now, use NULL for match_id to avoid foreign key issues
    // In a real app, you would have proper match management
    betData.matchId = null as any;

    const { data, error } = await supabase
      .from('bets')
      .insert({
        user_id: user.id,
        match_id: betData.matchId,
        bet_amount: betData.betAmount,
        multiplier: betData.multiplier,
        potential_winnings: betData.potentialWinnings,
        prediction: betData.prediction,
        description: betData.description,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bet:', error);
      throw new Error(`Failed to create bet: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all bets for the current user
   */
  static async getUserBets(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bets:', error);
      throw new Error(`Failed to fetch bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bet statistics for the current user
   */
  static async getUserBetStats(): Promise<BetStats | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view bet stats');
    }

    const { data, error } = await supabase
      .from('bet_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats found for user (no bets yet)
        return null;
      }
      console.error('Error fetching bet stats:', error);
      throw new Error(`Failed to fetch bet stats: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active bets for the current user
   */
  static async getActiveBets(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view active bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active bets:', error);
      throw new Error(`Failed to fetch active bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bets with match details
   */
  static async getBetsWithMatches(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bets with matches:', error);
      throw new Error(`Failed to fetch bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update bet status (admin only)
   */
  static async updateBetStatus(betId: string, status: 'won' | 'lost' | 'cancelled', winningsPaid?: number): Promise<Bet> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_admin) {
      throw new Error('Only admins can update bet status');
    }

    const updateData: BetUpdate = {
      status,
      resolved_at: new Date().toISOString(),
      outcome: status === 'won' ? 'won' : status === 'lost' ? 'lost' : 'cancelled'
    };

    if (winningsPaid !== undefined) {
      updateData.winnings_paid = winningsPaid;
    }

    const { data, error } = await supabase
      .from('bets')
      .update(updateData)
      .eq('id', betId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bet status:', error);
      throw new Error(`Failed to update bet status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all bets (admin only)
   */
  static async getAllBets(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_admin) {
      throw new Error('Only admins can view all bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all bets:', error);
      throw new Error(`Failed to fetch bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get active bets (admin only)
   */
  static async getActiveBetsAdmin(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_admin) {
      throw new Error('Only admins can view all active bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active bets:', error);
      throw new Error(`Failed to fetch active bets: ${error.message}`);
    }

    return data || [];
  }
} 