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

export interface CreateParlayBetData {
  predictions: Array<{
    matchId: string;
    betAmount: number;
    multiplier: number;
    prediction: any;
    description: string;
  }>;
  totalStake: number;
  baseOdds: number;
  finalOdds: number;
  bonusMultiplier: number;
  streakBooster: number;
  isSafeBet: boolean;
  safeBetCost: number;
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
   * Create a parlay bet (multiple predictions as one bet)
   */
  static async createParlayBet(parlayData: CreateParlayBetData): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a parlay bet');
    }

    // Check if user has enough safe bet tokens if using safe bet
    if (parlayData.isSafeBet) {
      const hasEnoughTokens = await this.consumeSafeBetTokens(parlayData.safeBetCost);
      if (!hasEnoughTokens) {
        throw new Error(`Insufficient safe bet tokens. Required: ${parlayData.safeBetCost}`);
      }
    }

    // Generate a unique parlay ID
    const parlayId = crypto.randomUUID();
    const createdBets: Bet[] = [];

    // Create individual bet records for each prediction in the parlay
    for (let i = 0; i < parlayData.predictions.length; i++) {
      const prediction = parlayData.predictions[i];
      
      // For now, use NULL for match_id to avoid foreign key issues
      const matchId = null as any;

      const { data, error } = await supabase
        .from('bets')
        .insert({
          user_id: user.id,
          match_id: matchId,
          bet_amount: parlayData.totalStake, // Use total stake for each bet
          multiplier: parlayData.finalOdds, // Use final parlay odds
          potential_winnings: Math.round(parlayData.totalStake * parlayData.finalOdds),
          prediction: prediction.prediction,
          description: `Parlay ${i + 1}/${parlayData.predictions.length}: ${prediction.description}`,
          status: 'active',
          // Parlay-specific fields
          is_parlay: true,
          parlay_id: parlayId,
          parlay_position: i + 1,
          parlay_total_picks: parlayData.predictions.length,
          parlay_base_odds: parlayData.baseOdds,
          parlay_final_odds: parlayData.finalOdds,
          parlay_bonus_multiplier: parlayData.bonusMultiplier,
          parlay_streak_booster: parlayData.streakBooster,
          is_safe_bet: parlayData.isSafeBet,
          safe_bet_cost: parlayData.isSafeBet ? parlayData.safeBetCost : 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating parlay bet:', error);
        throw new Error(`Failed to create parlay bet: ${error.message}`);
      }

      createdBets.push(data);
    }

    return createdBets;
  }

  /**
   * Get parlay bets for the current user
   */
  static async getParlayBets(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view parlay bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_parlay', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching parlay bets:', error);
      throw new Error(`Failed to fetch parlay bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get parlay statistics for the current user
   */
  static async getParlayStats(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view parlay stats');
    }

    const { data, error } = await supabase
      .from('parlay_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No parlay stats found for user (no parlay bets yet)
        return null;
      }
      console.error('Error fetching parlay stats:', error);
      throw new Error(`Failed to fetch parlay stats: ${error.message}`);
    }

    return data;
  }

  /**
   * Get safe bet tokens for the current user
   */
  static async getSafeBetTokens(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view safe bet tokens');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('safe_bet_tokens')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching safe bet tokens:', error);
      throw new Error(`Failed to fetch safe bet tokens: ${error.message}`);
    }

    return data?.safe_bet_tokens || 0;
  }

  /**
   * Award safe bet tokens to the current user
   */
  static async awardSafeBetTokens(tokensToAward: number): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to award safe bet tokens');
    }

    const { data, error } = await supabase
      .rpc('award_safe_bet_tokens', {
        user_uuid: user.id,
        tokens_to_award: tokensToAward
      });

    if (error) {
      console.error('Error awarding safe bet tokens:', error);
      throw new Error(`Failed to award safe bet tokens: ${error.message}`);
    }

    return data;
  }

  /**
   * Consume safe bet tokens (used internally by createParlayBet)
   */
  private static async consumeSafeBetTokens(tokensToConsume: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .rpc('consume_safe_bet_tokens', {
        user_uuid: user.id,
        tokens_to_consume: tokensToConsume
      });

    if (error) {
      console.error('Error consuming safe bet tokens:', error);
      return false;
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
  static async getBetsWithMatches(): Promise<BetWithMatch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select(`
        *,
        match:matches(
          player_a,
          player_b,
          played_at,
          a_score,
          b_score
        )
      `)
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