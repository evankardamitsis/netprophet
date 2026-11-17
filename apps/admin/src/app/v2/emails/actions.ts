'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { Rpc } from '@/lib/v2/service';

/** api.admin_email_settings: the switch, the allow-list and each kind with what went out */
export interface EmailKindRow {
  kind: string;
  group: 'account' | 'game' | 'pro' | 'list';
  label: string;
  sent_7d: number;
  skipped_7d: number;
  failed: number;
  due: number;
}
/** the App Store offer codes for the Pro winback (core.offer_codes) */
export interface OfferCodes {
  /** codes free with more than a week left */
  left: number;
  given: number;
  next_expiry: string | null;
  /** winbacks due that wait for a code */
  winback_waiting: number;
}
export interface EmailSettings {
  mode: 'off' | 'allowlist' | 'on';
  allowlist: string[];
  start_at: string;
  kinds_off: string[];
  kinds: EmailKindRow[];
  offer_codes?: OfferCodes;
}
export interface ImportResult {
  added: number;
  already_there: number;
  invalid: number;
  left: number;
}
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

async function adminRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff || staff.role !== 'admin') throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}
const fail = (e: unknown) => ({ ok: false as const, message: e instanceof Error ? e.message : 'failed' });

export async function loadEmailSettings(): Promise<Result<EmailSettings>> {
  try {
    const { data, error } = await (await adminRpc())('admin_email_settings', {});
    if (error) throw new Error(error.message);
    return { ok: true, value: data as EmailSettings };
  } catch (e) {
    return fail(e);
  }
}

export async function saveEmailSettings(patch: Partial<Pick<EmailSettings, 'mode' | 'allowlist' | 'kinds_off'>>): Promise<Result<EmailSettings>> {
  try {
    const { data, error } = await (await adminRpc())('admin_set_email_settings', { p: patch });
    if (error) throw new Error(error.message);
    return { ok: true, value: data as EmailSettings };
  } catch (e) {
    return fail(e);
  }
}

/** queues one email of this kind to me; the cron sends it within 10 minutes */
export async function sendTest(kind: string): Promise<Result<string>> {
  try {
    const { data, error } = await (await adminRpc())('admin_email_test', { p_kind: kind });
    if (error) throw new Error(error.message);
    return { ok: true, value: data as string };
  } catch (e) {
    return fail(e);
  }
}

/** a batch of one-time offer codes from App Store Connect, with the expiry the batch has there (YYYY-MM-DD) */
export async function importOfferCodes(codes: string[], expires: string): Promise<Result<ImportResult>> {
  try {
    const { data, error } = await (await adminRpc())('admin_offer_codes_import', { p_codes: codes, p_expires: expires });
    if (error) throw new Error(error.message);
    return { ok: true, value: data as ImportResult };
  } catch (e) {
    return fail(e);
  }
}
