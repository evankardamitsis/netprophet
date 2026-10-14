import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { Banner } from '../feedback';
import { PageHeader } from '../kit';
import { ui } from '../ui';
import { Queue, type Moderation, type TournamentOption } from './Queue';

export const dynamic = 'force-dynamic';

/** Moderation queue (api.admin_moderation): reports, disputed matches, new players, «Άλλο» tournament names. */
export default async function ModerationPage() {
  if (!v2Configured) {
    return (
      <main className="v2-page">
        <h1 style={ui.h1}>v2 admin is not configured</h1>
      </main>
    );
  }
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff) {
    return (
      <main className="v2-page">
        <h1 style={ui.h1}>No access</h1>
        <p style={ui.muted}>This account is not an admin or editor on v2.</p>
        <SignOut />
      </main>
    );
  }
  const rpc = client.rpc.bind(client) as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { message: string } | null }>;
  const [queue, tournaments] = await Promise.all([rpc('admin_moderation', {}), rpc('admin_tournaments', {})]);
  return (
    <div className="v2-shell">
      <Nav here="moderation" staff={staff} />
      <main className="v2-page">
        {queue.error ? (
          <>
            <PageHeader title="Moderation" />
            <Banner tone="problem" title="Could not load the queue" detail={queue.error.message} />
          </>
        ) : (
          <Queue data={queue.data as Moderation} tournaments={((tournaments.data ?? []) as TournamentOption[]).map((t) => ({ id: t.id, name: t.name }))} />
        )}
      </main>
    </div>
  );
}
