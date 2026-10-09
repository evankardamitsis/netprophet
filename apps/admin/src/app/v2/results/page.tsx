import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import { Desk, type DeskItem } from './Desk';

export const dynamic = 'force-dynamic';

/** Results desk: matches waiting for a result first, then upcoming, then recently done (api.admin_desk). */
export default async function ResultsDesk() {
  if (!v2Configured) {
    return (
      <main style={ui.main}>
        <h1 style={ui.h1}>v2 admin is not configured</h1>
        <p style={ui.muted}>Set NEXT_PUBLIC_V2_SUPABASE_URL and NEXT_PUBLIC_V2_SUPABASE_ANON_KEY.</p>
      </main>
    );
  }
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff) {
    return (
      <main style={ui.main}>
        <h1 style={ui.h1}>No access</h1>
        <p style={ui.muted}>This account is not an admin or editor on v2.</p>
        <SignOut />
      </main>
    );
  }
  const { data, error } = await (client.rpc as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'admin_desk',
    { p_days: 7 },
  );
  const items = (data ?? []) as DeskItem[];
  return (
    <>
      <header style={ui.bar}>
        <strong>NetProphet v2 · Results</strong>
        <span style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          {staff.name} ({staff.role}) <SignOut />
        </span>
      </header>
      <main style={ui.main}>
        {error ? <p style={ui.error}>{error.message}</p> : <Desk items={items} admin={staff.role === 'admin'} />}
      </main>
    </>
  );
}
