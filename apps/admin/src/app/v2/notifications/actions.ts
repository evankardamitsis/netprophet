'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';

/** one push text as api.admin_notification_texts returns it */
export interface NotificationText {
  key: string;
  channel: string;
  label: string;
  title: string;
  body: string;
  placeholders: string[];
  pro: boolean;
  approved_at: string | null;
  approved_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type TextResult = { ok: true; text: NotificationText } | { ok: false; message: string };

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function staffRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  if (!(await getStaff(client))) throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}

export async function loadTexts(): Promise<NotificationText[]> {
  const { data, error } = await (await staffRpc())('admin_notification_texts', {});
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationText[];
}

/** a new title and body (api.admin_update_notification_text): the next push uses it; the approval is cleared */
export async function saveText(key: string, title: string, body: string): Promise<TextResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_update_notification_text', { p_key: key, p_title: title, p_body: body });
    if (error) return { ok: false, message: error.message };
    return { ok: true, text: data as NotificationText };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

/** approve the text as it reads now (api.admin_approve_notification_text, admin only) */
export async function approveText(key: string): Promise<TextResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_approve_notification_text', { p_key: key });
    if (error) return { ok: false, message: error.message };
    return { ok: true, text: data as NotificationText };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
