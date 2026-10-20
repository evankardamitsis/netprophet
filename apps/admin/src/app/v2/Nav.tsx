import Link from 'next/link';
import { cache, Suspense } from 'react';
import { createV2ServerClient } from '@/lib/v2/server';
import { SignOut } from './SignOut';

/** the v2 admin's desks */
type Desk = 'tournaments' | 'results' | 'import' | 'sources' | 'moderation' | 'players' | 'quiz' | 'game' | 'names' | 'notifications' | 'team';

type Counts = Partial<Record<Desk, number>>;
type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

/** the desks that can show a badge */
const COUNTED: ReadonlySet<Desk> = new Set<Desk>(['tournaments', 'results', 'moderation', 'notifications']);

const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/**
 * what is waiting on each desk; any problem just means no badge. Cached per request, so every badge shares one
 * round of RPCs.
 */
const waiting = cache(async (): Promise<Counts> => {
  try {
    const client = await createV2ServerClient();
    const rpc = client.rpc.bind(client) as unknown as Rpc;
    const [reviews, desk, queue, texts] = await Promise.all([
      // the client's requests are thenables without .catch: wrap them so one failure only drops its badge
      Promise.resolve(rpc('admin_ingest_reviews', { p_tournament_id: null })).catch(() => null),
      Promise.resolve(rpc('admin_desk', { p_days: 7 })).catch(() => null),
      Promise.resolve(rpc('admin_moderation', {})).catch(() => null),
      Promise.resolve(rpc('admin_notification_texts', {})).catch(() => null),
    ]);
    const out: Counts = {};
    if (reviews && !reviews.error) out.tournaments = len(reviews.data);
    if (desk && !desk.error && Array.isArray(desk.data)) {
      out.results = (desk.data as { bucket_name?: string; tournament?: string | null; overdue?: boolean }[]).filter(
        (i) => i.bucket_name === 'to_score' && (!i.tournament || i.overdue),
      ).length;
    }
    if (queue && !queue.error && queue.data && typeof queue.data === 'object') {
      const q = queue.data as Record<string, unknown>;
      out.moderation = len(q.reports) + len(q.disputes) + len(q.players) + len(q.tournaments) + len(q.traits);
    }
    if (texts && !texts.error && Array.isArray(texts.data)) {
      out.notifications = (texts.data as { approved_at?: string | null }[]).filter((t) => !t.approved_at).length;
    }
    return out;
  } catch {
    return {};
  }
});

/** one desk's badge: streams in when the counts are ready, so the menu and the page never wait for them */
async function Count({ desk }: { desk: Desk }) {
  const n = (await waiting())[desk];
  return n ? (
    <span className="v2-nav-count" aria-label={`${n} waiting`}>
      {n}
    </span>
  ) : null;
}

/**
 * The menu (founder, 14 Oct: a vertical bar, more room for the pages): a dark column on the left with each desk on
 * its own line and what is waiting on it, the staff member and «Sign out» at the bottom. On a phone it becomes a
 * row of desks above the page. Styles in v2.css.
 */
export function Nav({ here, staff }: { here: Desk; staff: { name: string; role: string } }) {
  // the row keeps its height (min-height 42px, badge 20px) and the label stays put, so a badge arriving moves nothing
  const item = (key: Desk, label: string) => (
    <Link key={key} href={`/v2/${key}`} className="v2-nav-item" aria-current={here === key ? 'page' : undefined}>
      <span>{label}</span>
      {COUNTED.has(key) ? (
        <Suspense fallback={null}>
          <Count desk={key} />
        </Suspense>
      ) : null}
    </Link>
  );
  return (
    <aside className="v2-nav">
      <div className="v2-brand">
        netprophet
        <small>Admin</small>
      </div>
      <nav className="v2-nav-items">
        {item('tournaments', 'Tournaments')}
        {item('results', 'Results')}
        {item('moderation', 'Moderation')}
        {item('players', 'Players')}
        {item('names', 'Names')}
        {item('quiz', 'Quiz')}
        {item('game', 'Game')}
        {item('notifications', 'Ειδοποιήσεις')}
        {staff.role === 'admin' ? item('team', 'Team') : null}
      </nav>
      <div className="v2-nav-foot">
        <span>
          {staff.name}
          <br />
          {staff.role}
        </span>
        <SignOut />
      </div>
    </aside>
  );
}
