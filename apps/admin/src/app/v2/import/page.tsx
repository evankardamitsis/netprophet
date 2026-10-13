import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { ui } from '../ui';
import type { Tournament } from './actions';
import { Importer } from './Importer';

export const dynamic = 'force-dynamic';

/** Import desk: an organiser's order-of-play sheet into a tournament, after a review (M1 basic import). */
export default async function ImportDesk() {
  if (!v2Configured) {
    return (
      <main style={ui.main}>
        <h1 style={ui.h1}>v2 admin is not configured</h1>
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
  const rpc = client.rpc.bind(client) as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { message: string } | null }>;
  const [{ data: tournaments }, { data: areas }] = await Promise.all([
    rpc('admin_tournaments', {}),
    client.from('areas').select('id, name_el').order('sort'),
  ]);
  return (
    <>
      <header style={ui.bar}>
        <Nav here="import" />
        <span style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          {staff.name} ({staff.role}) <SignOut />
        </span>
      </header>
      <main style={{ ...ui.main, maxWidth: 1100 }}>
        <Importer tournaments={(tournaments ?? []) as Tournament[]} areas={(areas ?? []) as { id: string; name_el: string }[]} />
      </main>
    </>
  );
}
