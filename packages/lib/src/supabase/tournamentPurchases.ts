import { supabase } from "./client";

export interface TournamentPurchase {
  id: string;
  user_id: string;
  tournament_id: string;
  purchase_amount: number;
  purchase_date: string;
  created_at: string;
}

export interface TournamentAccessResult {
  hasAccess: boolean;
  needsPurchase: boolean;
  buyInFee: number;
  message: string;
}

export interface TournamentPurchaseResult {
  success: boolean;
  message: string;
  newBalance?: number;
}

export class TournamentPurchaseService {
  /**
   * Check if user has access to a tournament
   */
  static async checkTournamentAccess(
    tournamentId: string
  ): Promise<TournamentAccessResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          hasAccess: false,
          needsPurchase: false,
          buyInFee: 0,
          message: "User not authenticated",
        };
      }

      const { data, error } = await supabase.rpc("user_has_tournament_access", {
        p_user_id: user.id,
        p_tournament_id: tournamentId,
      });

      if (error) {
        console.error("Error checking tournament access:", error);
        return {
          hasAccess: false,
          needsPurchase: false,
          buyInFee: 0,
          message: "Error checking tournament access",
        };
      }

      // Get tournament details to show buy-in fee
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("buy_in_fee, name")
        .eq("id", tournamentId)
        .single();

      const buyInFee = tournament?.buy_in_fee || 0;

      if (data) {
        return {
          hasAccess: true,
          needsPurchase: false,
          buyInFee,
          message: "Access granted",
        };
      } else {
        return {
          hasAccess: false,
          needsPurchase: buyInFee > 0,
          buyInFee,
          message:
            buyInFee > 0
              ? `Tournament requires ${buyInFee} coins entry fee`
              : "Tournament access denied",
        };
      }
    } catch (error) {
      console.error("Error checking tournament access:", error);
      return {
        hasAccess: false,
        needsPurchase: false,
        buyInFee: 0,
        message: "Error checking tournament access",
      };
    }
  }

  /**
   * Purchase tournament access
   */
  static async purchaseTournamentAccess(
    tournamentId: string
  ): Promise<TournamentPurchaseResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          message: "User not authenticated",
        };
      }

      const { data, error } = await supabase.rpc("purchase_tournament_access", {
        p_user_id: user.id,
        p_tournament_id: tournamentId,
      });

      if (error) {
        console.error("Error purchasing tournament access:", error);
        return {
          success: false,
          message: error.message || "Failed to purchase tournament access",
        };
      }

      const result = data[0];

      return {
        success: result.success,
        message: result.message,
        newBalance: result.new_balance,
      };
    } catch (error) {
      console.error("Error purchasing tournament access:", error);
      return {
        success: false,
        message: "An unexpected error occurred",
      };
    }
  }

  /**
   * Get user's tournament purchases
   */
  static async getUserTournamentPurchases(): Promise<TournamentPurchase[]> {
    try {
      const { data, error } = await supabase
        .from("tournament_purchases")
        .select(
          `
          *,
          tournaments (
            id,
            name
          )
        `
        )
        .order("purchase_date", { ascending: false });

      if (error) {
        console.error("Error fetching tournament purchases:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching tournament purchases:", error);
      return [];
    }
  }
}
