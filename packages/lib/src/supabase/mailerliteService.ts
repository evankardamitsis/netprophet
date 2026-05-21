import { supabase } from "./client";
import type { MailerLiteGroupKey, SubscriberFields } from "../services/mailerlite";

/**
 * MailerLite client wrapper — queues jobs for mailerlite-process-queue Edge Function.
 * Transactional emails (win/lose) remain on Resend.
 */

export interface MailerLiteSubscriber {
  email: string;
  name?: string;
  fields?: Record<string, unknown>;
  status?: "active" | "unsubscribed" | "bounced" | "junk";
  groups?: string[];
}

export interface MailerLiteWorkflow {
  id: string;
  name: string;
  type: "welcome" | "onboarding" | "campaign";
}

async function queueAction(params: {
  action: string;
  email?: string;
  userId?: string;
  name?: string;
  fields?: Partial<SubscriberFields>;
  groupKeys?: MailerLiteGroupKey[];
  groupId?: string;
  bulkEmails?: string[];
  executeAfter?: string;
  removeAfter?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("queue_mailerlite_action", {
      p_action: params.action,
      p_email: params.email ?? null,
      p_user_id: params.userId ?? null,
      p_name: params.name ?? null,
      p_fields: params.fields ?? null,
      p_group_keys: params.groupKeys ?? null,
      p_group_id: params.groupId ?? null,
      p_bulk_emails: params.bulkEmails ?? null,
      p_execute_after: params.executeAfter ?? null,
      p_remove_after: params.removeAfter ?? null,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[MailerLiteService] queue failed:", error);
    return false;
  }
}

export class MailerLiteService {
  async addSubscriber(
    email: string,
    name?: string,
    groups?: string[],
    groupKeys?: MailerLiteGroupKey[]
  ): Promise<boolean> {
    return queueAction({
      action: "upsert",
      email,
      name,
      fields: {
        coin_balance: 100,
        last_login_date: new Date().toISOString().slice(0, 10),
      },
      groupKeys: groupKeys ?? ["NEW_USERS"],
    });
  }

  async updateSubscriber(
    email: string,
    fields: Partial<SubscriberFields>
  ): Promise<boolean> {
    return queueAction({ action: "update_fields", email, fields });
  }

  async addToGroup(
    email: string,
    groupKey: MailerLiteGroupKey
  ): Promise<boolean> {
    return queueAction({
      action: "add_group",
      email,
      groupKeys: [groupKey],
    });
  }

  async removeFromGroup(
    email: string,
    groupKey: MailerLiteGroupKey
  ): Promise<boolean> {
    return queueAction({
      action: "remove_group",
      email,
      groupKeys: [groupKey],
    });
  }

  /** @deprecated Use addToGroup with MailerLiteGroupKey */
  async triggerWorkflow(_email: string, _workflowId: string): Promise<boolean> {
    console.warn(
      "[MailerLiteService] triggerWorkflow is deprecated; use group-based automations"
    );
    return false;
  }
}

export const mailerLiteService = new MailerLiteService();
