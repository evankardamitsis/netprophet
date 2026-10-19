import { createClient } from '@supabase/supabase-js';
import { V2_PUBLISHABLE_KEY, V2_URL } from './env';

/**
 * Server-only v2 clients for the admin login and the Team page. The secret key (V2_SUPABASE_SECRET_KEY) is read
 * here on the server and never reaches a browser: only server actions and route handlers import this file.
 */

export type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

/** the service client (api schema), or null when the secret key is not set */
export function createV2ServiceClient() {
  const key = process.env.V2_SUPABASE_SECRET_KEY;
  if (!V2_URL || !key) return null;
  const client = createClient(V2_URL, key, { db: { schema: 'api' }, auth: { persistSession: false, autoRefreshToken: false } });
  return { client, rpc: client.rpc.bind(client) as unknown as Rpc };
}

/** a client with the publishable key and no session, to ask Supabase for a sign-in code */
export function createV2AnonClient() {
  return createClient(V2_URL, V2_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** api.admin_staff_by_email (service role only): the account's id and role, or null when there is no account */
export async function staffByEmail(rpc: Rpc, email: string): Promise<{ user_id: string; role: string } | null> {
  const { data, error } = await rpc('admin_staff_by_email', { p_email: email });
  if (error) throw new Error(error.message);
  return (data as { user_id: string; role: string } | null) ?? null;
}
