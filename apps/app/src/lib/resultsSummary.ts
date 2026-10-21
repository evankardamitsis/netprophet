import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';

/**
 * Results one by one (founder, 20 Oct): every result plays as its own card, «Επόμενο ›» to the next. While 2 or more
 * wait behind the card, a row under it says what they hold, «Και 13 ακόμα: 11 ✓ · 2 χαμένα», with one action,
 * «Πάρε τους πόντους» (founder, 21 Oct). A tap marks the card and all of those seen at once (one mark_inbox_seen
 * call; the server counted their points already), flies the points and σερί to the header, says it in a toast, and
 * the whole results block leaves. Nothing stays behind. Whatever is still unseen when the day turns (23:00 Athens)
 * the server marks seen on its own.
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

/** «Και 13 ακόμα: 11 ✓ · 2 χαμένα»; a part with nothing in it is left out («Και 3 ακόμα: 3 ✓») */
export function restLine(rest: readonly Row[], t: Copy): string {
  const s = t.result.summary;
  const { n, right } = summaryCounts(rest);
  const wrong = n - right;
  const parts: string[] = [];
  if (right > 0) parts.push(fmt(s.right, { n: right }));
  if (wrong > 0) parts.push(wrong === 1 ? s.wrongOne : fmt(s.wrongMany, { n: wrong }));
  return `${fmt(s.more, { n })}: ${parts.join(' · ')}`;
}

/**
 * «Πάρε τους πόντους» (founder, 21 Oct): what the tap brings in one go. The points of every right call still to play,
 * and the card on screen too when its own moment has not landed yet; σερί is where the last result (the queue is
 * oldest first) leaves it.
 */
export function takeAll<R extends Row & { streak: number }>(
  card: R,
  rest: readonly R[],
  cardApplied: boolean,
): { points: number; streak: number; allRight: boolean } {
  const rows = cardApplied ? rest : [card, ...rest];
  const { n, points, right } = summaryCounts(rows);
  const last = rest.length > 0 ? rest[rest.length - 1]! : card;
  // «+1» flies to σερί only when every one of them kept it going
  return { points, streak: last.streak, allRight: n > 0 && right === n };
}

/** the toast after the tap: «+155 πόντοι · σερί 7», or «Τα είδες όλα · σερί 0» when nothing in them scored */
export function takenToast(taken: { points: number; streak: number }, t: Copy): string {
  const s = t.result.summary;
  return taken.points > 0 ? fmt(s.taken, { points: taken.points, streak: taken.streak }) : fmt(s.takenNone, { streak: taken.streak });
}

/** every id the tap marks seen, the card's first, once each (one mark_inbox_seen call) */
export function skipIds(card: Row, rest: readonly Row[]): string[] {
  return [card.id, ...rest.map((r) => r.id).filter((id) => id !== card.id)];
}
