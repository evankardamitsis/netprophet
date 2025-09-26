import { supabase } from "./client";
import { EmailTemplateService } from "./emailTemplateService";

export interface EmailData {
  to: string | string[];
  template: string;
  variables?: Record<string, any>;
  language?: "en" | "el";
  type: "promotional" | "notification" | "admin" | "2fa";
}

export interface EmailLog {
  id: string;
  user_id: string | null;
  to_email: string;
  template: string;
  type: string;
  language: string;
  variables: Record<string, any>;
  sent_at: string;
  status: string;
}

export class EmailService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  /**
   * Send winnings notification email
   */
  async sendWinningsEmail(
    userEmail: string,
    matchName: string,
    prediction: string,
    winningsAmount: number,
    language: "en" | "el" = "en"
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const emailData: EmailData = {
        to: userEmail,
        template: "winnings_notification",
        type: "notification",
        language,
        variables: {
          match: matchName,
          prediction,
          winnings: winningsAmount,
        },
      };

      const { data, error } = await this.supabase.functions.invoke(
        "send-email",
        {
          body: emailData,
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error sending winnings email:", error);
      return false;
    }
  }

  /**
   * Send promotional email with featured matches
   */
  async sendPromotionalEmail(
    userEmail: string,
    featuredMatches: any[],
    language: "en" | "el" = "en"
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const emailData: EmailData = {
        to: userEmail,
        template: "promotional_update",
        type: "promotional",
        language,
        variables: {
          matches: featuredMatches,
        },
      };

      const { data, error } = await this.supabase.functions.invoke(
        "send-email",
        {
          body: emailData,
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error sending promotional email:", error);
      return false;
    }
  }

  /**
   * Send admin alert email
   */
  async sendAdminAlert(
    alertType: string,
    message: string,
    details?: any
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        to: "admin@netprophet.app", // Will be expanded to all admins in the function
        template: "admin_alert",
        type: "admin",
        language: "en",
        variables: {
          alert_type: alertType,
          message,
          details: details ? JSON.stringify(details, null, 2) : "",
          timestamp: new Date().toISOString(),
        },
      };

      const { data, error } = await this.supabase.functions.invoke(
        "send-email",
        {
          body: emailData,
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error sending admin alert:", error);
      return false;
    }
  }

  /**
   * Get email logs (admin only)
   */
  async getEmailLogs(limit: number = 50): Promise<EmailLog[]> {
    try {
      const { data, error } = await this.supabase
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching email logs:", error);
      return [];
    }
  }

  /**
   * Get email statistics (admin only)
   */
  async getEmailStats(): Promise<{
    total_sent: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    recent_activity: number;
  }> {
    try {
      // Get total sent emails
      const { count: totalSent } = await this.supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true });

      // Get emails by type
      const { data: byType } = await this.supabase
        .from("email_logs")
        .select("type")
        .eq("status", "sent");

      // Get emails by status
      const { data: byStatus } = await this.supabase
        .from("email_logs")
        .select("status");

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { count: recentActivity } = await this.supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", yesterday.toISOString());

      // Process type data
      const typeCounts: Record<string, number> = {};
      byType?.forEach((item: { type: string }) => {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      });

      // Process status data
      const statusCounts: Record<string, number> = {};
      byStatus?.forEach((item: { status: string }) => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });

      return {
        total_sent: totalSent || 0,
        by_type: typeCounts,
        by_status: statusCounts,
        recent_activity: recentActivity || 0,
      };
    } catch (error) {
      console.error("Error fetching email stats:", error);
      return {
        total_sent: 0,
        by_type: {},
        by_status: {},
        recent_activity: 0,
      };
    }
  }

  /**
   * Send bulk promotional emails to multiple users
   */
  async sendBulkPromotionalEmails(
    userEmails: string[],
    featuredMatches: any[],
    language: "en" | "el" = "en"
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process emails in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < userEmails.length; i += batchSize) {
      const batch = userEmails.slice(i, i + batchSize);

      const promises = batch.map(async (email) => {
        try {
          const result = await this.sendPromotionalEmail(
            email,
            featuredMatches,
            language
          );
          if (result) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
          failed++;
        }
      });

      await Promise.all(promises);

      // Add small delay between batches
      if (i + batchSize < userEmails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { success, failed };
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    language: "en" | "el" = "en"
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const emailData: EmailData = {
        to: userEmail,
        template: "welcome_email",
        type: "promotional",
        language,
        variables: {
          user_name: userName,
          welcome_bonus: 100, // Default welcome bonus
        },
      };

      const { data, error } = await this.supabase.functions.invoke(
        "send-email",
        {
          body: emailData,
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
