import { supabase, getCurrentUserId } from './client';
import { Database } from '../types/database';

type Bet = Database['public']['Tables']['bets']['Row'];
type BetInsert = Database['public']['Tables']['bets']['Insert'];
type BetWithMatch = Bet & {
  match: {
    player_a_id: string;
    player_b_id: string;
    start_time: string;
    a_score: string | null;
    b_score: string | null;
    player_a: {
      first_name: string;
      last_name: string;
    };
    player_b: {
      first_name: string;
      last_name: string;
    };
  };
};

export interface CreateBetData {
  matchId: string;
  betAmount: number;
  multiplier: number;
  potentialWinnings: number;
  prediction: any;
  description: string;
}

export interface CreateParlayBetData {
  predictions: Array<{
    matchId: string;
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

export interface BetStats {
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  total_winnings: number;
  total_losses: number;
  win_rate: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export class BetsService {
  /**
   * Create a new bet
   */
  static async createBet(betData: CreateBetData): Promise<Bet> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to create a bet');
    }

    // Use the provided matchId if available, otherwise use NULL
    // This allows for proper bet resolution when match results are added

    const { data, error } = await supabase
      .from('bets')
      .insert({
        user_id: userId,
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
    const userId = getCurrentUserId();
    
    if (!userId) {
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
      
      // Use the matchId from the prediction if available
      const matchId = prediction.matchId;

      if (!matchId) {
        throw new Error('Match ID is required for parlay bet');
      }

      const { data, error } = await supabase
        .from('bets')
        .insert({
          user_id: userId,
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
   * Get bet statistics for the current user
   */
  static async getUserBetStats(): Promise<BetStats | null> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view bet stats');
    }

    const { data, error } = await supabase
      .from('bet_stats')
      .select('*')
      .eq('user_id', userId)
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
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view active bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
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
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select(`
        *,
        match:matches(
          player_a_id,
          player_b_id,
          start_time,
          a_score,
          b_score,
          player_a:players!matches_player_a_id_fkey(
            first_name,
            last_name
          ),
          player_b:players!matches_player_b_id_fkey(
            first_name,
            last_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bets with matches:', error);
      throw new Error(`Failed to fetch bets: ${error.message}`);
    }

    return (data || []) as unknown as BetWithMatch[];
  }

  /**
   * Update bet status (admin only)
   */
  static async updateBetStatus(betId: string, status: 'won' | 'lost' | 'cancelled', winningsPaid?: number): Promise<Bet> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to update bet status');
    }

    const updateData: any = { status };
    if (winningsPaid !== undefined) {
      updateData.winnings_paid = winningsPaid;
    }

    const { data, error } = await supabase
      .from('bets')
      .update(updateData)
      .eq('id', betId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bet status:', error);
      throw new Error(`Failed to update bet status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user bets
   */
  static async getUserBets(): Promise<Bet[]> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bets:', error);
      throw new Error(`Failed to fetch user bets: ${error.message}`);
    }

    return data || [];
  }



  /**
   * Get bets by match ID
   */
  static async getBetsByMatchId(matchId: string): Promise<Bet[]> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bets by match ID:', error);
      throw new Error(`Failed to fetch bets by match ID: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get parlay bets
   */
  static async getParlayBets(): Promise<Bet[]> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view parlay bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_parlay', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching parlay bets:', error);
      throw new Error(`Failed to fetch parlay bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bets by parlay ID
   */
  static async getBetsByParlayId(parlayId: string): Promise<Bet[]> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view parlay bets');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('parlay_id', parlayId)
      .eq('user_id', userId)
      .order('parlay_position', { ascending: true });

    if (error) {
      console.error('Error fetching bets by parlay ID:', error);
      throw new Error(`Failed to fetch bets by parlay ID: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get safe bet tokens for user
   */
  static async getSafeBetTokens(): Promise<number> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view safe bet tokens');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('safe_bet_tokens')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching safe bet tokens:', error);
      return 0;
    }

    return data?.safe_bet_tokens || 0;
  }

  /**
   * Consume safe bet tokens
   */
  static async consumeSafeBetTokens(tokensToConsume: number): Promise<boolean> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to consume safe bet tokens');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('safe_bet_tokens')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching safe bet tokens:', error);
      return false;
    }

    const currentTokens = data?.safe_bet_tokens || 0;
    if (currentTokens < tokensToConsume) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ safe_bet_tokens: currentTokens - tokensToConsume })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating safe bet tokens:', updateError);
      return false;
    }

    return true;
  }

  /**
   * Get bet by ID
   */
  static async getBetById(betId: string): Promise<Bet | null> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view bet');
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('id', betId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching bet by ID:', error);
      throw new Error(`Failed to fetch bet by ID: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel bet
   */
  static async cancelBet(betId: string): Promise<Bet> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to cancel bet');
    }

    const { data, error } = await supabase
      .from('bets')
      .update({ status: 'cancelled' })
      .eq('id', betId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling bet:', error);
      throw new Error(`Failed to cancel bet: ${error.message}`);
    }

    return data;
  }

  /**
   * Get bet history with pagination
   */
  static async getBetHistory(page: number = 1, limit: number = 20): Promise<{ bets: Bet[]; total: number }> {
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User must be authenticated to view bet history');
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('bets')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching bet history:', error);
      throw new Error(`Failed to fetch bet history: ${error.message}`);
    }

    return {
      bets: data || [],
      total: count || 0
    };
  }
} 