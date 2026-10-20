import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';

/**
 * Results one by one (founder, 20 Oct): every result plays as its own card, «Επόμενο ›» to the next. While 2 or more
 * wait behind the card, it carries a quieter line, «Και 13 ακόμα: 11 σωστά ›». A tap marks the card and all of those
 * seen at once (their points are already counted) and leaves one strip in their place, «✓ 11 σωστά · +155»: the
 * numbers confirmed are the ones the player tapped, the card itself already showed its own result. Whatever is still
 * unseen when the day turns (23:00 Athens) the server marks seen on its own.
 */
export const SKIP_FROM = 2;

type Row = { id: string; ok: boolean; points: number };

/** the results waiting behind the card that plays (the queue's head) */
export function restAfter<R extends Row>(queue: readonly R[]): R[] {
  return queue.slice(1);
}

/** the «Και 13 ακόμα» line shows only while 2 or more wait (with one, «Επόμενο ›» is as quick) */
export function showSkip(rest: readonly Row[]): boolean {
  return rest.length >= SKIP_FROM;
}

/** how many, how many called right, and the points they brought (wrong calls bring none) */
export function summaryCounts(rows: readonly Row[]): { n: number; right: number; points: number } {
  const right = rows.filter((r) => r.ok);
  return { n: rows.length, right: right.length, points: right.reduce((s, r) => s + Math.max(0, r.points), 0) };
}

/** «όλα σωστά», «1 σωστό», «11 σωστά», «κανένα σωστό» */
function calls(rows: readonly Row[], t: Copy): string {
  const { n, right } = summaryCounts(rows);
  const s = t.result.summary;
  return right === 0 ? s.noneRight : right === n && n > 1 ? s.allRight : right === 1 ? s.oneRight : fmt(s.someRight, { n: right });
}

/** the action on the card, without its glyph: «Και 13 ακόμα: 11 σωστά» */
export function skipLine(rest: readonly Row[], t: Copy): string {
  return `${fmt(t.result.summary.more, { n: rest.length })}: ${calls(rest, t)}`;
}

/** the strip left after the tap, in parts so only the points sit in lime: ✓ «11 σωστά» «+155» */
export function skipStrip(rest: readonly Row[], t: Copy): { tick: boolean; text: string; points: string | null } {
  const { right, points } = summaryCounts(rest);
  return { tick: right > 0, text: calls(rest, t), points: points > 0 ? fmt(t.result.summary.points, { points }) : null };
}

/** every id the tap marks seen, the card's first, once each (one mark_inbox_seen call) */
export function skipIds(card: Row, rest: readonly Row[]): string[] {
  return [card.id, ...rest.map((r) => r.id).filter((id) => id !== card.id)];
}

/** skipped batches add up in one strip for the visit, each result once */
export function addSkipped<R extends Row>(prev: readonly R[], rows: readonly R[]): R[] {
  return [...prev, ...rows.filter((r) => !prev.some((x) => x.id === r.id))];
}
