import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';

/**
 * Many results at once (founder, 20 Oct): with more than 3 queued, the first plays as a card and the rest fold into one
 * line under it, «Και 13 ακόμα: 11 σωστά, +155». A tap opens them as rows; «Τα είδα» marks them all seen. Closing the
 * first card while the line is still there marks them seen too: the player saw the line, so the queue drains and the
 * celebrations waiting behind it can play. With 3 or fewer, every card plays one by one as before.
 */
export const SUMMARY_OVER = 3;

type Row = { id: string; ok: boolean; points: number };

/** the card that plays, and the results folded into the summary line (empty: no line) */
export function foldResults<R extends Row>(queue: readonly R[]): { first: R | undefined; folded: R[] } {
  return { first: queue[0], folded: queue.length > SUMMARY_OVER ? queue.slice(1) : [] };
}

/** how many, how many called right, and the points they brought (wrong calls bring none) */
export function summaryCounts(rows: readonly Row[]): { n: number; right: number; points: number } {
  const right = rows.filter((r) => r.ok);
  return { n: rows.length, right: right.length, points: right.reduce((s, r) => s + Math.max(0, r.points), 0) };
}

/**
 * The line, in two parts so the points can sit in lime: «Και 13 ακόμα: 11 σωστά» and «+155». All right reads «όλα
 * σωστά», one «1 σωστό», none «κανένα σωστό αυτή τη φορά»; the points show only when there are some.
 */
export function summaryLine(rows: readonly Row[], t: Copy): { lead: string; points: string | null } {
  const { n, right, points } = summaryCounts(rows);
  const s = t.result.summary;
  const calls = right === 0 ? s.noneRight : right === 1 ? s.oneRight : right === n ? s.allRight : fmt(s.someRight, { n: right });
  return { lead: `${fmt(s.more, { n })}: ${calls}`, points: points > 0 ? fmt(s.points, { points }) : null };
}

/** the first card closed: it leaves the queue, and so does everything the summary line stood for */
export function idsOnFirstDone(first: Row, folded: readonly Row[]): string[] {
  return [first.id, ...folded.map((r) => r.id).filter((id) => id !== first.id)];
}
