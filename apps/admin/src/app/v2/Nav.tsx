import Link from 'next/link';
import { createV2ServerClient } from '@/lib/v2/server';
import { SignOut } from './SignOut';
import { colors } from './ui';

/** the v2 admin's desks */
type Desk = 'tournaments' | 'results' | 'import' | 'sources' | 'moderation' | 'players' | 'quiz' | 'game' | 'names';

type Counts = Partial<Record<Desk, number>>;
type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/** what is waiting on each desk; any problem just means no badge */
async function waiting(): Promise<Counts> {
  try {
    const client = await createV2ServerClient();
    const rpc = client.rpc.bind(client) as unknown as Rpc;
    const [reviews, desk, queue] = await Promise.all([
      // the client's requests are thenables without .catch: wrap them so one failure only drops its badge
      Promise.resolve(rpc('admin_ingest_reviews', { p_tournament_id: null })).catch(() => null),
      Promise.resolve(rpc('admin_desk', { p_days: 7 })).catch(() => null),
      Promise.resolve(rpc('admin_moderation', {})).catch(() => null),
    ]);
    const out: Counts = {};
    if (reviews && !reviews.error) out.tournaments = len(reviews.data);
    if (desk && !desk.error && Array.isArray(desk.data)) {
      out.results = (desk.data as { bucket_name?: string; tournament?: string | null }[]).filter(
        (i) => i.bucket_name === 'to_score' && !i.tournament,
      ).length;
    }
    if (queue && !queue.error && queue.data && typeof queue.data === 'object') {
      const q = queue.data as Record<string, unknown>;
      out.moderation = len(q.reports) + len(q.disputes) + len(q.players) + len(q.tournaments) + len(q.traits);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The menu (founder, 14 Oct: a vertical bar, more room for the pages): a dark column on the left with each desk on
 * its own line and what is waiting on it, the staff member and «Sign out» at the bottom. On a phone it becomes a
 * row of desks above the page.
 */
export async function Nav({ here, staff }: { here: Desk; staff: { name: string; role: string } }) {
  const counts = await waiting();
  const item = (key: Desk, label: string) => {
    const n = counts[key];
    const on = here === key;
    return (
      <Link key={key} href={`/v2/${key}`} className="v2-nav-item" aria-current={on ? 'page' : undefined}
        style={{ color: colors.paper, background: on ? colors.inkRaised : 'transparent', fontWeight: on ? 800 : 600 }}>
        <span>{label}</span>
        {n ? (
          <span aria-label={`${n} waiting`}
            style={{ background: colors.paper, color: colors.ink, borderRadius: 999, padding: '0 8px', fontSize: 12, fontWeight: 800, lineHeight: '20px' }}>
            {n}
          </span>
        ) : null}
      </Link>
    );
  };
  return (
    <aside className="v2-nav" style={{ background: colors.ink, color: colors.paper }}>
      <style>{SHELL_CSS}</style>
      <strong style={{ fontSize: 17, padding: '4px 12px 12px' }}>NetProphet v2</strong>
      <nav className="v2-nav-items">
        {item('tournaments', 'Tournaments')}
        {item('results', 'Results')}
        {item('moderation', 'Moderation')}
        {item('players', 'Players')}
        {item('names', 'Names')}
        {item('quiz', 'Quiz')}
        {item('game', 'Game')}
      </nav>
      <div className="v2-nav-foot" style={{ color: colors.mist }}>
        <span style={{ fontSize: 13 }}>
          {staff.name}
          <br />
          {staff.role}
        </span>
        <SignOut />
      </div>
    </aside>
  );
}

const SHELL_CSS = `
.v2-shell { display: flex; min-height: 100vh; }
.v2-shell > main { flex: 1; min-width: 0; }
.v2-nav { width: 216px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 4px; padding: 20px 12px; }
.v2-nav-items { display: flex; flex-direction: column; gap: 2px; }
.v2-nav-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 40px;
  padding: 0 12px; border-radius: 10px; text-decoration: none; font-size: 15px; }
.v2-nav-item:hover { background: ${colors.inkDeep}; }
.v2-nav-foot { margin-top: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; }
@media (max-width: 760px) {
  .v2-shell { flex-direction: column; }
  .v2-nav { width: auto; height: auto; position: static; padding: 12px; }
  .v2-nav-items { flex-direction: row; flex-wrap: wrap; }
  .v2-nav-foot { margin-top: 4px; flex-direction: row; align-items: center; justify-content: space-between; }
}
`;
