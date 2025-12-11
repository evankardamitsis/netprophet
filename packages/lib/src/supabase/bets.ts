import { supabase } from "./client";
import { Database } from "../types/database";

type Bet = Database["public"]["Tables"]["bets"]["Row"];
type BetInsert = Database["public"]["Tables"]["bets"]["Insert"];
type BetWithMatch = Bet & {
  match: {
    player_a_id: string;
    player_b_id: string;
    player_a1_id?: string | null;
    player_a2_id?: string | null;
    player_b1_id?: string | null;
    player_b2_id?: string | null;
    match_type?: "singles" | "doubles";
    start_time: string;
    player_a?: {
      first_name: string;
      last_name: string;
    } | null;
    player_b?: {
      first_name: string;
      last_name: string;
    } | null;
    player_a1?: {
      first_name: string;
      last_name: string;
    } | null;
    player_a2?: {
      first_name: string;
      last_name: string;
    } | null;
    player_b1?: {
      first_name: string;
      last_name: string;
    } | null;
    player_b2?: {
      first_name: string;
      last_name: string;
    } | null;
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
  private static async assertUserNotParticipant(
    userId: string,
    matchIds: string[]
  ) {
    const uniqueMatchIds = Array.from(new Set(matchIds)).filter(Boolean);
    if (uniqueMatchIds.length === 0) {
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("claimed_player_id")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile for bet validation:", profileError);
      throw new Error(
        `Failed to validate profile: ${profileError.message || "Unknown error"}`
      );
    }

    const claimedPlayerId = profile?.claimed_player_id;
    if (!claimedPlayerId) {
      console.log(
        "No claimed_player_id found, skipping participant validation"
      );
      return;
    }

    console.log("Validating participant conflict:", {
      userId,
      claimedPlayerId,
      matchIds: uniqueMatchIds,
    });

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, player_a_id, player_b_id")
      .in("id", uniqueMatchIds);

    if (matchesError) {
      console.error("Error fetching matches for bet validation:", matchesError);
      throw new Error(
        `Failed to validate matches: ${matchesError.message || "Unknown error"}`
      );
    }

    if (!matches || matches.length === 0) {
      console.warn(
        "No matches found for validation. Match IDs:",
        uniqueMatchIds
      );
      // Don't throw error - matches might not be synced yet
      return;
    }

    console.log("Found matches for validation:", matches);

    // Check each match for conflicts
    for (const match of matches) {
      if (
        match.player_a_id === claimedPlayerId ||
        match.player_b_id === claimedPlayerId
      ) {
        console.error("Participant conflict detected:", {
          matchId: match.id,
          claimedPlayerId,
          player_a_id: match.player_a_id,
          player_b_id: match.player_b_id,
        });
        throw new Error(
          "You cannot place predictions on matches you are participating in."
        );
      }
    }

    console.log("Participant validation passed - no conflicts found");
  }

  /**
   * Create a new bet
   */
  static async createBet(betData: CreateBetData): Promise<Bet> {
    // Ensure we have a valid session before making the query
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User must be authenticated to create a bet");
    }

    // Debug logging to identify the issue
    console.log("Creating bet with data:", {
      user_id: sessionData.session.user.id,
      match_id: betData.matchId,
      bet_amount: betData.betAmount,
      bet_amount_type: typeof betData.betAmount,
      multiplier: betData.multiplier,
      multiplier_type: typeof betData.multiplier,
      potential_winnings: betData.potentialWinnings,
      potential_winnings_type: typeof betData.potentialWinnings,
      prediction: betData.prediction,
      description: betData.description,
    });

    // Create the insert data object
    const insertData = {
      user_id: sessionData.session.user.id,
      match_id: betData.matchId,
      bet_amount: betData.betAmount,
      multiplier: betData.multiplier, // Keep as decimal
      potential_winnings: betData.potentialWinnings, // Now supports decimal values
      prediction: betData.prediction,
      description: betData.description,
      status: "active",
    };

    await BetsService.assertUserNotParticipant(sessionData.session.user.id, [
      betData.matchId,
    ]);

    console.log("Insert data object:", insertData);
    console.log("Insert data JSON:", JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("bets")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating bet:", error);
      throw new Error(`Failed to create bet: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a parlay bet (multiple predictions as one bet)
   */
  static async createParlayBet(
    parlayData: CreateParlayBetData
  ): Promise<Bet[]> {
    // Ensure we have a valid session before creating the bet
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User must be authenticated to create a parlay bet");
    }
    const userId = sessionData.session.user.id;

    // Generate a unique parlay ID
    const parlayId = crypto.randomUUID();
    const createdBets: Bet[] = [];

    await BetsService.assertUserNotParticipant(
      userId,
      parlayData.predictions.map((p) => p.matchId).filter(Boolean)
    );

    // First, create the parlay record
    const { data: parlayRecord, error: parlayError } = await supabase
      .from("parlays")
      .insert({
        id: parlayId,
        user_id: userId,
        total_stake: parlayData.totalStake,
        base_odds: parlayData.baseOdds,
        final_odds: parlayData.finalOdds,
        bonus_multiplier: parlayData.bonusMultiplier,
        streak_booster: parlayData.streakBooster,
        is_safe_bet: parlayData.isSafeBet,
        safe_bet_cost: parlayData.isSafeBet ? parlayData.safeBetCost : 0,
        status: "active",
      })
      .select()
      .single();

    if (parlayError) {
      console.error("Error creating parlay record:", parlayError);
      throw new Error(`Failed to create parlay record: ${parlayError.message}`);
    }

    // Create individual bet records for each prediction in the parlay
    for (let i = 0; i < parlayData.predictions.length; i++) {
      const prediction = parlayData.predictions[i];

      // Use the matchId from the prediction if available
      const matchId = prediction.matchId;

      if (!matchId) {
        throw new Error("Match ID is required for parlay bet");
      }

      const { data, error } = await supabase
        .from("bets")
        .insert({
          user_id: userId,
          match_id: matchId,
          bet_amount: parlayData.totalStake, // Use total stake for each bet
          multiplier: parlayData.finalOdds, // Use final parlay odds
          potential_winnings: Math.round(
            parlayData.totalStake * parlayData.finalOdds
          ),
          prediction: prediction.prediction,
          description: `Parlay ${i + 1}/${parlayData.predictions.length}: ${prediction.description}`,
          status: "active",
          // Parlay-specific fields (simplified)
          is_parlay: true,
          parlay_id: parlayId,
          parlay_position: i + 1,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating parlay bet:", error);
        throw new Error(`Failed to create parlay bet: ${error.message}`);
      }

      createdBets.push(data);
    }

    return createdBets;
  }

  /**
   * Get parlay details with bet information
   */
  static async getParlayWithBets(parlayId: string): Promise<any> {
    const { data, error } = await supabase.rpc("get_parlay_with_bets", {
      parlay_uuid: parlayId,
    });

    if (error) {
      console.error("Error fetching parlay with bets:", error);
      throw new Error(`Failed to fetch parlay: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Get all parlays for the current user
   */
  static async getUserParlays(): Promise<any[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("parlays")
      .select(
        `
        *,
        bets!inner (
          id,
          match_id,
          parlay_position,
          prediction,
          description,
          status,
          outcome
        )
      `
      )
      .eq("user_id", sessionData.session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user parlays:", error);
      throw new Error(`Failed to fetch parlays: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get parlay statistics for the current user
   */
  static async getUserParlayStats(): Promise<any> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("parlay_statistics")
      .select("*")
      .eq("user_id", sessionData.session.user.id)
      .single();

    if (error) {
      console.error("Error fetching parlay statistics:", error);
      throw new Error(`Failed to fetch parlay statistics: ${error.message}`);
    }

    return data;
  }

  /**
   * Get bet statistics for the current user
   */
  static async getUserBetStats(): Promise<BetStats | null> {
    // Ensure we have a valid session before making the query
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.rpc("get_user_bet_stats", {
      user_uuid: sessionData.session.user.id,
    });

    if (error) {
      console.error("Error fetching bet stats:", error);
      throw new Error(`Failed to fetch bet stats: ${error.message}`);
    }

    // The function always returns exactly one row, so we can safely access data[0]
    return data[0] || null;
  }

  /**
   * Get active bets for the current user
   */
  static async getActiveBets(): Promise<Bet[]> {
    // Ensure we have a valid session before making the query
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", sessionData.session.user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active bets:", error);
      throw new Error(`Failed to fetch active bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bets with match details
   */
  static async getBetsWithMatches(
    page: number = 1,
    limit: number = 20
  ): Promise<{ bets: BetWithMatch[]; total: number }> {
    try {
      // Ensure we have a valid session before making the query
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!sessionData.session) {
        throw new Error("User not authenticated");
      }

      // Ensure the session is properly set in the client
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("User error:", userError);
        throw new Error(
          `Failed to get authenticated user: ${userError.message}`
        );
      }

      if (!user) {
        throw new Error("Failed to get authenticated user");
      }

      const offset = (page - 1) * limit;

      // Get total count first
      const { count, error: countError } = await supabase
        .from("bets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", sessionData.session.user.id);

      if (countError) {
        console.error("Error fetching bet count:", countError);
        throw new Error(`Failed to fetch bet count: ${countError.message}`);
      }

      // Get paginated bets
      const { data, error } = await supabase
        .from("bets")
        .select(
          `
          *,
          match:matches(
            player_a_id,
            player_b_id,
            player_a1_id,
            player_a2_id,
            player_b1_id,
            player_b2_id,
            match_type,
            start_time,
            player_a:players!matches_player_a_id_fkey(
              first_name,
              last_name
            ),
            player_b:players!matches_player_b_id_fkey(
              first_name,
              last_name
            ),
            player_a1:players!matches_player_a1_id_fkey(
              first_name,
              last_name
            ),
            player_a2:players!matches_player_a2_id_fkey(
              first_name,
              last_name
            ),
            player_b1:players!matches_player_b1_id_fkey(
              first_name,
              last_name
            ),
            player_b2:players!matches_player_b2_id_fkey(
              first_name,
              last_name
            )
          )
        `
        )
        .eq("user_id", sessionData.session.user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching bets with matches:", error);
        throw new Error(`Failed to fetch bets: ${error.message}`);
      }

      return {
        bets: (data || []) as unknown as BetWithMatch[],
        total: count || 0,
      };
    } catch (error) {
      console.error("getBetsWithMatches error:", error);
      throw error;
    }
  }

  /**
   * Update bet status (admin only)
   */
  static async updateBetStatus(
    betId: string,
    status: "won" | "lost" | "cancelled",
    winningsPaid?: number
  ): Promise<Bet> {
    const updateData: any = { status };
    if (winningsPaid !== undefined) {
      updateData.winnings_paid = winningsPaid;
    }

    const { data, error } = await supabase
      .from("bets")
      .update(updateData)
      .eq("id", betId)
      .select()
      .single();

    if (error) {
      console.error("Error updating bet status:", error);
      throw new Error(`Failed to update bet status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user bets
   */
  static async getUserBets(): Promise<Bet[]> {
    // Ensure we have a valid session before making the query
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", sessionData.session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user bets:", error);
      throw new Error(`Failed to fetch user bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all bets (admin only)
   */
  static async getAllBets(): Promise<Bet[]> {
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all bets:", error);
      throw new Error(`Failed to fetch all bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bets by match ID
   */
  static async getBetsByMatchId(matchId: string): Promise<Bet[]> {
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bets by match ID:", error);
      throw new Error(`Failed to fetch bets by match ID: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get parlay bets
   */
  static async getParlayBets(): Promise<Bet[]> {
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("is_parlay", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching parlay bets:", error);
      throw new Error(`Failed to fetch parlay bets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bets by parlay ID
   */
  static async getBetsByParlayId(parlayId: string): Promise<Bet[]> {
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("parlay_id", parlayId)
      .order("parlay_position", { ascending: true });

    if (error) {
      console.error("Error fetching bets by parlay ID:", error);
      throw new Error(`Failed to fetch bets by parlay ID: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get safe bet tokens for user
   */
  static async getSafeBetTokens(): Promise<number> {
    // Ensure we have a valid session before making the query
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("safe_bet_tokens")
      .single();

    if (error) {
      console.error("Error fetching safe bet tokens:", error);
      return 0;
    }

    return data?.safe_bet_tokens || 0;
  }

  /**
   * Consume safe bet tokens
   */
  static async consumeSafeBetTokens(tokensToConsume: number): Promise<boolean> {
    const { data, error } = await supabase
      .from("profiles")
      .select("safe_bet_tokens")
      .single();

    if (error) {
      console.error("Error fetching safe bet tokens:", error);
      return false;
    }

    const currentTokens = data?.safe_bet_tokens || 0;
    if (currentTokens < tokensToConsume) {
      return false;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ safe_bet_tokens: currentTokens - tokensToConsume });

    if (updateError) {
      console.error("Error updating safe bet tokens:", updateError);
      return false;
    }

    return true;
  }

  /**
   * Get bet by ID
   */
  static async getBetById(betId: string): Promise<Bet | null> {
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("id", betId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching bet by ID:", error);
      throw new Error(`Failed to fetch bet by ID: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel bet
   */
  static async cancelBet(betId: string): Promise<Bet> {
    const { data, error } = await supabase
      .from("bets")
      .update({ status: "cancelled" })
      .eq("id", betId)
      .select()
      .single();

    if (error) {
      console.error("Error cancelling bet:", error);
      throw new Error(`Failed to cancel bet: ${error.message}`);
    }

    return data;
  }

  /**
   * Get bet history with pagination
   */
  static async getBetHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<{ bets: Bet[]; total: number }> {
    const offset = (page - 1) * limit;

    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (betsError) {
      console.error("Error fetching bet history:", betsError);
      throw new Error(`Failed to fetch bet history: ${betsError.message}`);
    }

    const { count, error: countError } = await supabase
      .from("bets")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error counting bets:", countError);
      throw new Error(`Failed to count bets: ${countError.message}`);
    }

    return {
      bets: bets || [],
      total: count || 0,
    };
  }
}
