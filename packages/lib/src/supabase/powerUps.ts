import { createClient } from "@supabase/supabase-js";
import { supabase } from "./client";

export interface PowerUp {
  id: string;
  power_up_id: string;
  name: string;
  cost: number;
  effect: string;
  usage_type: string;
  icon: string;
  description: string;
  gradient: string;
  glow_color: string;
  is_active: boolean;
}

export interface UserPowerUp {
  id: string;
  user_id: string;
  power_up_id: string;
  quantity: number;
  expires_at: string | null;
  power_up?: PowerUp; // Joined data
}

export interface PowerUpPurchaseResult {
  success: boolean;
  message: string;
  userPowerUp?: UserPowerUp;
}

// Fetch all active power-ups
export async function fetchPowerUps(): Promise<PowerUp[]> {
  const { data, error } = await supabase
    .from("power_ups")
    .select("*")
    .eq("is_active", true)
    .order("cost", { ascending: true });

  if (error) {
    console.error("Error fetching power-ups:", error);
    throw error;
  }

  return data || [];
}

// Fetch user's power-up inventory
export async function fetchUserPowerUps(
  userId: string
): Promise<UserPowerUp[]> {
  const { data, error } = await supabase
    .from("user_power_ups")
    .select(
      `
            *,
            power_up:power_ups(*)
        `
    )
    .eq("user_id", userId)
    .gt("quantity", 0)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user power-ups:", error);
    throw error;
  }

  return data || [];
}

// Purchase a power-up
export async function purchasePowerUp(
  userId: string,
  powerUpId: string
): Promise<PowerUpPurchaseResult> {
  console.log("🚨🚨🚨 PURCHASE FUNCTION CALLED! 🚨🚨🚨");
  console.log("🚨🚨🚨 THIS IS A FORCED REBUILD TEST 🚨🚨🚨");
  console.log("=== PURCHASE POWER-UP FUNCTION STARTED ===");
  console.log("User ID:", userId);
  console.log("Power-up ID:", powerUpId);
  try {
    // Start a transaction
    const { data: powerUp, error: powerUpError } = await supabase
      .from("power_ups")
      .select("*")
      .eq("power_up_id", powerUpId)
      .eq("is_active", true)
      .single();

    if (powerUpError || !powerUp) {
      return {
        success: false,
        message: "Power-up not found or inactive",
      };
    }

    // Check user's balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        message: "User profile not found",
      };
    }

    if (profile.balance < powerUp.cost) {
      return {
        success: false,
        message: `Not enough coins! You need ${powerUp.cost} coins.`,
      };
    }

    // Deduct coins from user's balance
    const { error: balanceError } = await supabase
      .from("profiles")
      .update({ balance: profile.balance - powerUp.cost })
      .eq("id", userId);

    if (balanceError) {
      return {
        success: false,
        message: "Failed to update balance",
      };
    }

    // Add transaction record
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "power_up_purchase",
        amount: -powerUp.cost,
        description: `Purchased ${powerUp.name}`,
      });

    if (transactionError) {
      console.error("Error creating transaction:", transactionError);
      // Don't fail the purchase if transaction logging fails
    }

    // Add or update user's power-up inventory
    console.log("=== FETCHING EXISTING POWER-UPS ===");
    const { data: existingPowerUps, error: fetchError } = await supabase
      .from("user_power_ups")
      .select("*")
      .eq("user_id", userId)
      .eq("power_up_id", powerUpId);

    console.log("Fetch result:", { existingPowerUps, fetchError });

    if (fetchError) {
      console.error("Error fetching existing power-ups:", fetchError);
      return {
        success: false,
        message: "Failed to check existing power-up inventory",
      };
    }

    const existingPowerUp =
      existingPowerUps && existingPowerUps.length > 0
        ? existingPowerUps[0]
        : null;
    console.log("Found existing power-ups:", existingPowerUps);
    console.log("Using existing power-up:", existingPowerUp);
    console.log("Will update existing power-up:", !!existingPowerUp);

    // Calculate expiration date for time-based power-ups
    const getExpirationDate = (powerUpId: string): string | null => {
      switch (powerUpId) {
        case "streakBoost":
          // 3 days from now
          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
          return threeDaysFromNow.toISOString();
        default:
          return null;
      }
    };

    const expiresAt = getExpirationDate(powerUpId);
    console.log("Power-up ID:", powerUpId, "Expires at:", expiresAt);
    console.log("Is streakBoost:", powerUpId === "streakBoost");

    let userPowerUp: UserPowerUp;

    console.log("=== CHECKING IF EXISTING POWER-UP EXISTS ===");
    if (existingPowerUp) {
      console.log("Existing power-up found:", existingPowerUp);
      // Update existing inventory
      const updateData: any = {
        quantity: existingPowerUp.quantity + 1,
        updated_at: new Date().toISOString(),
      };

      // Set expiration date for time-based power-ups if not already set
      if (expiresAt && !existingPowerUp.expires_at) {
        updateData.expires_at = expiresAt;
        console.log(
          "Setting expiration date for existing power-up:",
          expiresAt
        );
      } else if (expiresAt && existingPowerUp.expires_at) {
        console.log(
          "Keeping existing expiration date:",
          existingPowerUp.expires_at
        );
      } else if (expiresAt) {
        // Force set expiration date for time-based power-ups that should have one
        updateData.expires_at = expiresAt;
        console.log(
          "Forcing expiration date for time-based power-up:",
          expiresAt
        );
      } else {
        console.log(
          "No expiration date to set. expiresAt:",
          expiresAt,
          "existingPowerUp.expires_at:",
          existingPowerUp.expires_at
        );
      }

      console.log("Update data being sent:", updateData);

      const { data: updatedPowerUp, error: updateError } = await supabase
        .from("user_power_ups")
        .update(updateData)
        .eq("id", existingPowerUp.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error updating power-up:", updateError);
        return {
          success: false,
          message: "Failed to update power-up inventory",
        };
      }

      console.log("Updated power-up result:", updatedPowerUp);
      userPowerUp = updatedPowerUp;
    } else {
      console.log("No existing power-up found, creating new one");
      // Create new inventory entry
      const insertData: any = {
        user_id: userId,
        power_up_id: powerUpId,
        quantity: 1,
      };

      // Set expiration date for time-based power-ups
      if (expiresAt) {
        insertData.expires_at = expiresAt;
        console.log("Setting expiration date for new power-up:", expiresAt);
      } else {
        console.log("No expiration date to set for new power-up");
      }

      console.log("Insert data being sent:", insertData);
      const { data: newPowerUp, error: insertError } = await supabase
        .from("user_power_ups")
        .insert(insertData)
        .select("*")
        .single();

      if (insertError) {
        return {
          success: false,
          message: "Failed to add power-up to inventory",
        };
      }

      userPowerUp = newPowerUp;
    }

    console.log("Final userPowerUp result:", userPowerUp);
    return {
      success: true,
      message: `Successfully purchased ${powerUp.name}!`,
      userPowerUp,
    };
  } catch (error) {
    console.error("Error purchasing power-up:", error);
    return {
      success: false,
      message: "Purchase failed. Please try again.",
    };
  }
}

// Use a power-up
export async function usePowerUp(
  userId: string,
  powerUpId: string,
  betId?: string,
  matchId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user has the power-up
    const { data: userPowerUp, error: fetchError } = await supabase
      .from("user_power_ups")
      .select("*")
      .eq("user_id", userId)
      .eq("power_up_id", powerUpId)
      .gt("quantity", 0)
      .maybeSingle();

    if (fetchError || !userPowerUp) {
      return {
        success: false,
        message: "You don't have this power-up available",
      };
    }

    // Check if power-up has expired (for time-based ones)
    if (
      userPowerUp.expires_at &&
      new Date(userPowerUp.expires_at) < new Date()
    ) {
      return {
        success: false,
        message: "This power-up has expired",
      };
    }

    // Decrease quantity
    const { error: updateError } = await supabase
      .from("user_power_ups")
      .update({
        quantity: userPowerUp.quantity - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userPowerUp.id);

    if (updateError) {
      return {
        success: false,
        message: "Failed to use power-up",
      };
    }

    // Log the usage
    const { error: logError } = await supabase
      .from("power_up_usage_log")
      .insert({
        user_id: userId,
        power_up_id: powerUpId,
        bet_id: betId,
        match_id: matchId,
        effect_applied: {
          used_at: new Date().toISOString(),
          bet_id: betId,
          match_id: matchId,
        },
      });

    if (logError) {
      console.error("Error logging power-up usage:", logError);
      // Don't fail the usage if logging fails
    }

    return {
      success: true,
      message: "Power-up used successfully!",
    };
  } catch (error) {
    console.error("Error using power-up:", error);
    return {
      success: false,
      message: "Failed to use power-up. Please try again.",
    };
  }
}

// Get user's power-up count for a specific power-up
export async function getUserPowerUpCount(
  userId: string,
  powerUpId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("user_power_ups")
    .select("quantity")
    .eq("user_id", userId)
    .eq("power_up_id", powerUpId)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  return data.quantity;
}

// Check if user has active streak multiplier power-up
export async function hasActiveStreakMultiplier(
  userId: string
): Promise<boolean> {
  try {
    const { data: userPowerUps, error } = await supabase
      .from("user_power_ups")
      .select("*")
      .eq("user_id", userId)
      .eq("power_up_id", "streakBoost")
      .gt("quantity", 0)
      .limit(1);

    if (error) {
      console.error("Error fetching streak multiplier:", error);
      return false;
    }

    if (!userPowerUps || userPowerUps.length === 0) {
      return false;
    }

    const userPowerUp = userPowerUps[0];

    // Check if power-up has expired
    if (
      userPowerUp.expires_at &&
      new Date(userPowerUp.expires_at) < new Date()
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking streak multiplier:", error);
    return false;
  }
}

// Get user's active power-ups
export async function getActivePowerUps(
  userId: string
): Promise<UserPowerUp[]> {
  try {
    const { data: userPowerUps, error } = await supabase
      .from("user_power_ups")
      .select(
        `
                *,
                power_up:power_ups(*)
            `
      )
      .eq("user_id", userId)
      .gt("quantity", 0);

    if (error) {
      console.error("Error fetching active power-ups:", error);
      return [];
    }

    // Filter out expired power-ups
    const now = new Date();
    return (userPowerUps || []).filter((powerUp) => {
      if (!powerUp.expires_at) return true; // No expiration = always active
      return new Date(powerUp.expires_at) > now;
    });
  } catch (error) {
    console.error("Error getting active power-ups:", error);
    return [];
  }
}

// Check if user has safe slip power-ups
export async function hasSafeSlipPowerUp(
  userId: string,
  powerUpId: "safeParlay" | "safeSingle"
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_power_ups")
      .select("quantity")
      .eq("user_id", userId)
      .eq("power_up_id", powerUpId)
      .gt("quantity", 0);

    if (error || !data || data.length === 0) {
      return false;
    }

    return data[0].quantity > 0;
  } catch (error) {
    console.error("Error checking safe slip power-up:", error);
    return false;
  }
}

// Use a safe slip power-up
export async function applySafeSlipPowerUp(
  userId: string,
  powerUpId: "safeParlay" | "safeSingle",
  betId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user has the power-up
    const { data: userPowerUp, error: fetchError } = await supabase
      .from("user_power_ups")
      .select("*")
      .eq("user_id", userId)
      .eq("power_up_id", powerUpId)
      .gt("quantity", 0)
      .maybeSingle();

    if (fetchError || !userPowerUp) {
      return {
        success: false,
        message: "You don't have this safe slip power-up available",
      };
    }

    // Decrease quantity
    const { error: updateError } = await supabase
      .from("user_power_ups")
      .update({
        quantity: userPowerUp.quantity - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userPowerUp.id);

    if (updateError) {
      return {
        success: false,
        message: "Failed to use safe slip power-up",
      };
    }

    // Log the usage
    const { error: logError } = await supabase
      .from("power_up_usage_log")
      .insert({
        user_id: userId,
        power_up_id: powerUpId,
        bet_id: betId,
        effect_applied: {
          used_at: new Date().toISOString(),
          bet_id: betId,
          power_up_type: powerUpId,
        },
      });

    if (logError) {
      console.error("Error logging safe slip usage:", logError);
      // Don't fail the operation if logging fails
    }

    return {
      success: true,
      message: `Successfully used ${powerUpId === "safeParlay" ? "Safe Parlay Slip" : "Safe Slip"} power-up!`,
    };
  } catch (error) {
    console.error("Error using safe slip power-up:", error);
    return {
      success: false,
      message: "Failed to use safe slip power-up",
    };
  }
}

// Check if user has Double Points Match power-up
export async function hasDoublePointsMatchPowerUp(
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_power_ups")
      .select("quantity")
      .eq("user_id", userId)
      .eq("power_up_id", "doubleXP")
      .gt("quantity", 0);

    if (error || !data || data.length === 0) {
      return false;
    }

    return data[0].quantity > 0;
  } catch (error) {
    console.error("Error checking Double Points Match power-up:", error);
    return false;
  }
}

// Use Double Points Match power-up
export async function applyDoublePointsMatchPowerUp(
  userId: string,
  matchId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user has the power-up
    const { data: userPowerUp, error: fetchError } = await supabase
      .from("user_power_ups")
      .select("*")
      .eq("user_id", userId)
      .eq("power_up_id", "doubleXP")
      .gt("quantity", 0)
      .maybeSingle();

    if (fetchError || !userPowerUp) {
      return {
        success: false,
        message: "You don't have Double Points Match power-up available",
      };
    }

    // Decrease quantity
    const { error: updateError } = await supabase
      .from("user_power_ups")
      .update({
        quantity: userPowerUp.quantity - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userPowerUp.id);

    if (updateError) {
      return {
        success: false,
        message: "Failed to use Double Points Match power-up",
      };
    }

    // Log the usage
    const { error: logError } = await supabase
      .from("power_up_usage_log")
      .insert({
        user_id: userId,
        power_up_id: "doubleXP",
        match_id: matchId,
        effect_applied: {
          used_at: new Date().toISOString(),
          match_id: matchId,
          power_up_type: "doubleXP",
          effect: "double_points",
        },
      });

    if (logError) {
      console.error("Error logging Double Points Match usage:", logError);
      // Don't fail the operation if logging fails
    }

    return {
      success: true,
      message: "Successfully applied Double Points Match power-up! 🎯",
    };
  } catch (error) {
    console.error("Error using Double Points Match power-up:", error);
    return {
      success: false,
      message: "Failed to use Double Points Match power-up",
    };
  }
}
