import { supabase } from "./client";

export interface TwoFactorCode {
  id: string;
  user_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export class TwoFactorAuthService {
  /**
   * Generate a 6-digit verification code
   */
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a 2FA code for a user
   */
  static async createCode(
    userId: string
  ): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const { data, error } = await supabase
        .from("two_factor_codes")
        .insert({
          user_id: userId,
          code: code,
          expires_at: expiresAt.toISOString(),
          used: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating 2FA code:", error);
        return { success: false, error: error.message };
      }

      return { success: true, code };
    } catch (error) {
      console.error("Exception creating 2FA code:", error);
      return { success: false, error: "Failed to create verification code" };
    }
  }

  /**
   * Verify a 2FA code for a user
   */
  static async verifyCode(
    userId: string,
    inputCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      // Find valid, unused code
      const { data, error } = await supabase
        .from("two_factor_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("code", inputCode)
        .eq("used", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: "Invalid or expired verification code",
        };
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from("two_factor_codes")
        .update({ used: true })
        .eq("id", data.id);

      if (updateError) {
        console.error("Error marking code as used:", updateError);
        // Don't fail the verification if we can't mark it as used
      }

      return { success: true };
    } catch (error) {
      console.error("Exception verifying 2FA code:", error);
      return { success: false, error: "Failed to verify code" };
    }
  }

  /**
   * Clean up expired codes (can be called periodically)
   */
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      const now = new Date().toISOString();

      await supabase.from("two_factor_codes").delete().lt("expires_at", now);
    } catch (error) {
      console.error("Error cleaning up expired codes:", error);
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("two_factor_enabled")
        .eq("id", userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.two_factor_enabled || false;
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      return false;
    }
  }

  /**
   * Enable 2FA for a user
   */
  static async enableTwoFactor(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ two_factor_enabled: true })
        .eq("id", userId);

      if (error) {
        console.error("Error enabling 2FA:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Exception enabling 2FA:", error);
      return { success: false, error: "Failed to enable 2FA" };
    }
  }

  /**
   * Disable 2FA for a user
   */
  static async disableTwoFactor(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ two_factor_enabled: false })
        .eq("id", userId);

      if (error) {
        console.error("Error disabling 2FA:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Exception disabling 2FA:", error);
      return { success: false, error: "Failed to disable 2FA" };
    }
  }
}
