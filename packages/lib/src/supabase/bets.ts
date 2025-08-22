import { supabase } from './client';
import { Database } from '../types/database';

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
    player_a_id: string;
    player_b_id: string;
    start_time: string;
    a_score: number | null;
    b_score: number | null;
    player_a: {
      first_name: string;
      last_name: string;
    } | null;
    player_b: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
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

    // Use the provided matchId if available, otherwise use NULL
    // This allows for proper bet resolution when match results are added

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
      
      // Use the matchId from the prediction if available
      const matchId = prediction.matchId;

      if (!matchId) {
        throw new Error('Match ID is required for parlay bet');
      }

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
      .eq('user_id', user.id)
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

  /**
   * Manually trigger bet resolution for a match (admin only)
   */
  static async resolveBetsForMatch(matchId: string): Promise<{ resolved: number; errors: string[] }> {
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
      throw new Error('Only admins can trigger bet resolution');
    }

    // Call the database function to resolve bets
    const { data, error } = await supabase
      .rpc('resolve_bets_for_match' as any, { match_id_param: matchId });

    if (error) {
      console.error('Error resolving bets:', error);
      throw new Error(`Failed to resolve bets: ${error.message}`);
    }

    // Get the count of resolved bets
    const { data: resolvedBets, error: countError } = await supabase
      .from('bets')
      .select('id')
      .eq('match_id', matchId)
      .in('status', ['won', 'lost']);

    if (countError) {
      console.error('Error counting resolved bets:', countError);
      return { resolved: 0, errors: [countError.message] };
    }

    return { 
      resolved: resolvedBets?.length || 0, 
      errors: [] 
    };
  }

  /**
   * Get bet resolution statistics for a match
   */
  static async getBetResolutionStats(matchId: string): Promise<{
    totalBets: number;
    activeBets: number;
    resolvedBets: number;
    wonBets: number;
    lostBets: number;
    totalWinnings: number;
  }> {
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
      throw new Error('Only admins can view bet resolution stats');
    }

    // Get all bets for the match
    console.log('Searching for bets with match_id:', matchId);
    const { data: bets, error } = await supabase
      .from('bets')
      .select('status, winnings_paid')
      .eq('match_id', matchId);
    
    console.log('Found bets:', bets);
    console.log('Error:', error);
    
    // Also check all bets to see what match_ids exist
    console.log('Querying all bets...');
    const { data: allBets, error: allBetsError } = await supabase
      .from('bets')
      .select('id, match_id, status, description')
      .limit(10);
    
    console.log('All bets in database:', allBets);
    console.log('All bets error:', allBetsError);
    
    // Check if the bets table exists and has any data
    const { count, error: countError } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total bets count:', count);
    console.log('Count error:', countError);

    if (error) {
      console.error('Error fetching bet stats:', error);
      throw new Error(`Failed to fetch bet stats: ${error.message}`);
    }

    const totalBets = bets?.length || 0;
    const activeBets = bets?.filter(bet => bet.status === 'active').length || 0;
    const resolvedBets = bets?.filter(bet => bet.status === 'won' || bet.status === 'lost').length || 0;
    const wonBets = bets?.filter(bet => bet.status === 'won').length || 0;
    const lostBets = bets?.filter(bet => bet.status === 'lost').length || 0;
    const totalWinnings = bets?.reduce((sum, bet) => sum + (bet.winnings_paid || 0), 0) || 0;

    return {
      totalBets,
      activeBets,
      resolvedBets,
      wonBets,
      lostBets,
      totalWinnings
    };
  }

  /**
   * Get detailed bet resolution information for a match
   */
  static async getBetResolutionDetails(matchId: string): Promise<{
    bets: Array<{
      id: string;
      user_id: string;
      status: string;
      outcome: string | null;
      bet_amount: number;
      winnings_paid: number | null;
      prediction: any;
      description: string | null;
      resolved_at: string | null;
      user: {
        email: string;
        first_name: string;
        last_name: string;
      };
    }>;
  }> {
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
      throw new Error('Only admins can view bet resolution details');
    }

    console.log('Searching for bet details with match_id:', matchId);
    const { data: bets, error } = await supabase
      .from('bets')
      .select(`
        id,
        user_id,
        status,
        outcome,
        bet_amount,
        winnings_paid,
        prediction,
        description,
        resolved_at
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });
    
    console.log('Found bet details:', bets);
    console.log('Error:', error);

    if (error) {
      console.error('Error fetching bet details:', error);
      throw new Error(`Failed to fetch bet details: ${error.message}`);
    }

    // Get user details separately
    const userIds = bets?.map(bet => bet.user_id) || [];
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, username')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching user details:', usersError);
      throw new Error(`Failed to fetch user details: ${usersError.message}`);
    }

    // Combine bets with user data
    const betsWithUsers = bets?.map(bet => {
      const user = users?.find(u => u.id === bet.user_id);
      return {
        ...bet,
        user: user ? {
          email: user.email || '',
          first_name: user.username || '',
          last_name: ''
        } : {
          email: '',
          first_name: '',
          last_name: ''
        }
      };
    }) || [];

    return { bets: betsWithUsers };
  }
} 