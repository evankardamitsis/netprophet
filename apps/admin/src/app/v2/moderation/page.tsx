import { v2Configured } from '@/lib/v2/env';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { Nav } from '../Nav';
import { SignOut } from '../SignOut';
import { Banner } from '../feedback';
import { PageHeader } from '../kit';
import { ui } from '../ui';
import { Queue, type BallerName, type ClaimRequest, type IdentityFlag, type Moderation, type PlayerMatch, type TournamentOption } from './Queue';

export const dynamic = 'force-dynamic';

/**
 * Moderation queue (api.admin_moderation): reports, disputed matches, new players, «Άλλο» tournament names; and
 * «Ματς παικτών» (api.admin_match_review_queue): what players logged, waiting for staff before it goes live; and
 * «Αιτήματα παικτών» (api.admin_claim_queue): people asking to be a roster player; and «Ταυτότητα»
 * (api.admin_identity_queue): «Δεν είμαι εγώ;» reports and first official results on players users made.
 */
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
  const [queue, tournaments, names, matches, claims, identity] = await Promise.all([
    rpc('admin_moderation', {}),
    rpc('admin_tournaments', {}),
    rpc('admin_baller_names', { p_limit: 200 }),
    rpc('admin_match_review_queue', {}),
    rpc('admin_claim_queue', {}),
    rpc('admin_identity_queue', {}),
  ]);
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
          <Queue
            data={queue.data as Moderation}
            tournaments={((tournaments.data ?? []) as TournamentOption[]).map((t) => ({ id: t.id, name: t.name }))}
            names={(names.data ?? []) as BallerName[]}
            matches={(matches.data ?? []) as PlayerMatch[]}
            claims={(claims.data ?? []) as ClaimRequest[]}
            identity={(identity.data ?? []) as IdentityFlag[]}
          />
        )}
      </main>
    </div>
  );
}
