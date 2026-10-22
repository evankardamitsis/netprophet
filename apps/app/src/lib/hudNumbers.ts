/**
 * What the header shows for σερί while result cards wait to play (πόντοι: hudPoints.ts, held back card by card).
 * The server has already counted every result. The header holds back only the first card of each fetched batch: the
 * σερί from before it, until it plays. Cards 2..N count as already in σερί: nothing moves when they play.
 * That holds only on the feed, where the cards play: on any other screen the header shows get_me as it is, the same
 * σερί Εγώ and the Ladder show (founder, 18 Oct: «σερί 3» in the header over «σερί 5» on Εγώ).
 */
export interface PendingResult {
  id: string;
  points: number;
  streakBefore: number;
}

/** the card the header holds back, pinned once per fetched batch */
export interface HeldBack {
  /** every result id seen since the app started; a list made only of these is the same batch */
  seen: readonly string[];
  first: PendingResult | null;
}

export const NOTHING_HELD: HeldBack = { seen: [], first: null };

/**
 * The pending list changed. If it is made only of ids already seen (a card was dismissed, or get_feed came back the
 * same), the pin stays. A list with a new id is a new batch: pin its first card not seen before, so a card the header
 * already counts is never held back again.
 */
export function pinBatch(prev: HeldBack, pending: readonly PendingResult[]): HeldBack {
  const seen = new Set(prev.seen);
  const fresh = pending.filter((r) => !seen.has(r.id));
  if (!fresh.length) return prev;
  return { seen: [...prev.seen, ...fresh.map((r) => r.id)], first: fresh[0]! };
}

/** the pinned card is waiting: still queued and not played yet (a card leaves the queue only after it played) */
export function isHeld(held: HeldBack, pending: readonly PendingResult[], applied: ReadonlySet<string>): boolean {
  const first = held.first;
  return first !== null && !applied.has(first.id) && pending.some((r) => r.id === first.id);
}

export function hudNumbers(
  held: HeldBack,
  pending: readonly PendingResult[],
  applied: ReadonlySet<string>,
  onFeed: boolean,
): { streakShown: number | null } {
  if (!onFeed || !held.first || !isHeld(held, pending, applied)) return { streakShown: null };
  return { streakShown: held.first.streakBefore };
}
