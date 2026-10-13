import Link from 'next/link';
import { createV2ServerClient } from '@/lib/v2/server';
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

export async function Nav({ here }: { here: Desk }) {
  const counts = await waiting();
  const item = (key: Desk, label: string) => {
    const n = counts[key];
    return (
      <Link href={`/v2/${key}`} style={{ color: 'inherit', fontWeight: here === key ? 800 : 500, textDecoration: here === key ? 'underline' : 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        {label}
        {n ? (
          <span
            aria-label={`${n} waiting`}
            style={{ background: colors.ink, color: colors.paper, border: `1px solid ${colors.paper}`, borderRadius: 999, padding: '0 7px', fontSize: 12, fontWeight: 800, lineHeight: '18px', textDecoration: 'none' }}
          >
            {n}
          </span>
        ) : null}
      </Link>
    );
  };
  return (
    <span style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <strong>NetProphet v2</strong>
      {item('tournaments', 'Tournaments')}
      {item('results', 'Results')}
      {item('moderation', 'Moderation')}
      {item('players', 'Players')}
      {item('names', 'Names')}
      {item('quiz', 'Quiz')}
      {item('game', 'Game')}
    </span>
  );
}
