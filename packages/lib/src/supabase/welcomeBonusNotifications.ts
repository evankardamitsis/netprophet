import { supabase } from "./client";

export interface WelcomeBonusNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "welcome_bonus";
  data?: {
    bonus_amount?: number;
    tournament_pass?: boolean;
  };
  read_at: string | null;
  created_at: string;
}

export class WelcomeBonusNotificationService {
  /**
   * Create a welcome bonus notification for a user
   */
  static async createWelcomeBonusNotification(
    userId: string,
    bonusAmount: number,
    hasTournamentPass: boolean = true,
    language: string = "en"
  ): Promise<WelcomeBonusNotification> {
    // Get the localized template
    let template;
    const { data: templateData, error: templateError } = await supabase
      .from("notification_templates")
      .select("title, message")
      .eq("type", "welcome_bonus")
      .eq("language", language)
      .single();

    if (templateError) {
      console.error("Error fetching welcome bonus template:", templateError);
      // Fallback to English if template not found
      const { data: fallbackTemplate } = await supabase
        .from("notification_templates")
        .select("title, message")
        .eq("type", "welcome_bonus")
        .eq("language", "en")
        .single();

      template = fallbackTemplate;
    } else {
      template = templateData;
    }

    // Use template or fallback to hardcoded text
    const title = template?.title || "Welcome Bonus Available! 🎉";
    const messageTemplate =
      template?.message || `Claim your {amount} coin welcome bonus{pass}!`;

    // Replace placeholders in the message
    const passText = hasTournamentPass ? " and free tournament pass" : "";
    const message = messageTemplate
      .replace("{amount}", bonusAmount.toString())
      .replace("{pass}", passText);

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: title,
        message: message,
        type: "welcome_bonus",
        data: {
          bonus_amount: bonusAmount,
          tournament_pass: hasTournamentPass,
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get welcome bonus notifications for a user
   */
  static async getWelcomeBonusNotifications(
    userId: string
  ): Promise<WelcomeBonusNotification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "welcome_bonus")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if user has unclaimed welcome bonus notification
   */
  static async hasUnclaimedWelcomeBonus(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "welcome_bonus")
      .is("read_at", null)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  }

  /**
   * Mark welcome bonus notification as read
   */
  static async markWelcomeBonusAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) throw error;
  }

  /**
   * Delete welcome bonus notification
   */
  static async deleteWelcomeBonusNotification(
    notificationId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
  }
}
