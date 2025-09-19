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

      const { data, error } = await supabase.rpc(
        "check_tournament_access_with_pass",
        {
          p_user_id: user.id,
          p_tournament_id: tournamentId,
        }
      );

      if (error) {
        console.error("Error checking tournament access:", error);
        return {
          hasAccess: false,
          needsPurchase: false,
          buyInFee: 0,
          message: "Error checking tournament access",
        };
      }

      const accessResult = data?.[0];
      if (!accessResult) {
        return {
          hasAccess: false,
          needsPurchase: false,
          buyInFee: 0,
          message: "No access information found",
        };
      }

      if (accessResult.has_access) {
        return {
          hasAccess: true,
          needsPurchase: false,
          buyInFee: accessResult.buy_in_fee,
          message:
            accessResult.access_type === "pass"
              ? "Access via tournament pass"
              : "Access granted",
        };
      } else if (accessResult.access_type === "pass_available") {
        // User has unused tournament pass - show purchase modal with pass option
        return {
          hasAccess: false,
          needsPurchase: true,
          buyInFee: accessResult.buy_in_fee,
          message: `Tournament requires ${accessResult.buy_in_fee} coins entry fee or use your tournament pass`,
        };
      } else {
        return {
          hasAccess: false,
          needsPurchase: accessResult.buy_in_fee > 0,
          buyInFee: accessResult.buy_in_fee,
          message:
            accessResult.buy_in_fee > 0
              ? `Tournament requires ${accessResult.buy_in_fee} coins entry fee`
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
   * Get count of users who have purchased access to a tournament
   */
  static async getTournamentPurchaseCount(
    tournamentId: string
  ): Promise<{ count: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc(
        "get_tournament_purchase_count",
        { p_tournament_id: tournamentId }
      );

      if (error) {
        console.error("Error getting tournament purchase count:", error);
        return { count: 0, error: error.message };
      }

      const count = data || 0;
      return { count };
    } catch (error) {
      console.error("Error getting tournament purchase count:", error);
      return { count: 0, error: "An unexpected error occurred" };
    }
  }

  /**
   * Use tournament pass for tournament access
   */
  static async useTournamentPass(
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

      const { data, error } = await supabase.rpc(
        "use_tournament_pass_for_tournament",
        {
          p_user_id: user.id,
          p_tournament_id: tournamentId,
        }
      );

      if (error) {
        console.error("Error using tournament pass:", error);
        return {
          success: false,
          message: error.message || "Failed to use tournament pass",
        };
      }

      if (data) {
        return {
          success: true,
          message: "Tournament pass used successfully",
        };
      } else {
        return {
          success: false,
          message: "Tournament pass not available or already used",
        };
      }
    } catch (error) {
      console.error("Error using tournament pass:", error);
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
