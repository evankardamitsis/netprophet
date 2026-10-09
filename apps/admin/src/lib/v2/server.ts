import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database, MeResult, NetprophetClient } from '@netprophet/db';
import { V2_ANON_KEY, V2_URL } from './env';

/**
 * Server client acting as the signed-in admin (never the service key): the database decides what staff may do
 * (core.is_staff / core.is_admin inside each RPC).
 */
export async function createV2ServerClient(): Promise<NetprophetClient> {
  const store = await cookies();
  return createServerClient<Database, 'api'>(V2_URL, V2_ANON_KEY, {
    db: { schema: 'api' },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a server component: the middleware refreshes the session instead
        }
      },
    },
  }) as unknown as NetprophetClient;
}

export type StaffRole = 'admin' | 'editor';

/** The signed-in user's v2 role, or null when signed out or not staff. */
export async function getStaff(client: NetprophetClient): Promise<{ role: StaffRole; name: string } | null> {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await client.rpc('get_me' as never);
  if (error || !data) return null;
  const me = data as unknown as MeResult;
  const role = me.profile.role;
  if (role !== 'admin' && role !== 'editor') return null;
  return { role, name: me.profile.display_name ?? auth.user.email ?? '' };
}
