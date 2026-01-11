import { supabase } from "./client";

/**
 * MailerLite Service
 *
 * This service handles MailerLite integration for automated marketing workflows.
 * It is completely separate from the transactional email system (Resend).
 *
 * Use cases:
 * - Welcome email automation workflows
 * - Onboarding sequences
 * - Marketing campaigns
 * - Newsletter management
 *
 * Note: Transactional emails (2FA, winnings, admin alerts) still use Resend.
 */

export interface MailerLiteSubscriber {
  email: string;
  name?: string;
  fields?: {
    name?: string;
    first_name?: string;
  };
  status?: "active" | "unsubscribed" | "bounced" | "junk";
  groups?: string[];
}

export interface MailerLiteWorkflow {
  id: string;
  name: string;
  type: "welcome" | "onboarding" | "campaign";
}

export class MailerLiteService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  /**
   * Add subscriber to MailerLite
   * This triggers automated workflows (welcome, onboarding)
   */
  async addSubscriber(
    email: string,
    name?: string,
    groups?: string[]
  ): Promise<boolean> {
    try {
      // Call Supabase Edge Function to add subscriber to MailerLite
      const { data, error } = await this.supabase.functions.invoke(
        "mailerlite-subscribe",
        {
          body: {
            email,
            name,
            groups: groups || ["users"], // Default to 'users' group
          },
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error adding subscriber to MailerLite:", error);
      // Don't throw - MailerLite failures shouldn't block user registration
      return false;
    }
  }

  /**
   * Trigger a specific workflow for a subscriber
   */
  async triggerWorkflow(email: string, workflowId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        "mailerlite-trigger-workflow",
        {
          body: {
            email,
            workflow_id: workflowId,
          },
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error triggering MailerLite workflow:", error);
      return false;
    }
  }

  /**
   * Update subscriber information in MailerLite
   */
  async updateSubscriber(
    email: string,
    fields: Record<string, any>
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        "mailerlite-update-subscriber",
        {
          body: {
            email,
            fields,
          },
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error updating MailerLite subscriber:", error);
      return false;
    }
  }

  /**
   * Add subscriber to a specific group
   */
  async addToGroup(email: string, groupId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        "mailerlite-add-to-group",
        {
          body: {
            email,
            group_id: groupId,
          },
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error adding subscriber to MailerLite group:", error);
      return false;
    }
  }

  /**
   * Remove subscriber from a group
   */
  async removeFromGroup(email: string, groupId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        "mailerlite-remove-from-group",
        {
          body: {
            email,
            group_id: groupId,
          },
        }
      );

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Error removing subscriber from MailerLite group:", error);
      return false;
    }
  }
}

// Export singleton instance
export const mailerLiteService = new MailerLiteService();
