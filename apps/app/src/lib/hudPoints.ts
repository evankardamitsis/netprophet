/**
 * The header's πόντοι while result cards wait to play (founder, 22 Oct: "the points should tick up per result").
 * The server has already counted every result in get_me. The header lags it: it holds back the points of every right
 * call that has not landed yet, and each card gives its points back when its flight arrives, so the number climbs one
 * card at a time (the header counts each step up). Display only: when nothing is waiting the offset is 0 and the
 * header shows get_me exactly, so the end is always the server's total.
 */
export interface PointsCard {
  id: string;
  ok: boolean;
  points: number;
}

export interface HeldPoints {
  /** every result id met since the app started: a card that played is never held back again */
  seen: readonly string[];
  /** points still to land, by result id */
  unplayed: Readonly<Record<string, number>>;
  /** ids «Πάρε τους πόντους» took: they stay held after they leave the queue, until their flight lands */
  claimed: readonly string[];
}

export const NOTHING_HELD_POINTS: HeldPoints = { seen: [], unplayed: {}, claimed: [] };

/** a wrong call, or a negative number, brings nothing */
export function cardPoints(card: Pick<PointsCard, 'ok' | 'points'>): number {
  return card.ok ? Math.max(0, card.points) : 0;
}

/**
 * The queue changed. Cards not met before are held back; a card no longer queued is let go (it was dismissed without
 * its moment: its points join the header at once, the count-up eases them in) unless it is claimed. An empty queue
 * with nothing claimed clears everything.
 */
export function syncQueue(prev: HeldPoints, queue: readonly PointsCard[]): HeldPoints {
  const seen = new Set(prev.seen);
  const unplayed: Record<string, number> = {};
  for (const [id, pts] of Object.entries(prev.unplayed)) {
    if (prev.claimed.includes(id) || queue.some((c) => c.id === id)) unplayed[id] = pts;
  }
  const fresh = queue.filter((c) => !seen.has(c.id));
  for (const c of fresh) unplayed[c.id] = cardPoints(c);
  const same =
    fresh.length === 0 &&
    Object.keys(unplayed).length === Object.keys(prev.unplayed).length &&
    Object.keys(unplayed).every((id) => prev.unplayed[id] === unplayed[id]);
  if (same) return prev;
  return { seen: fresh.length ? [...prev.seen, ...fresh.map((c) => c.id)] : prev.seen, unplayed, claimed: prev.claimed };
}

/** a card's flight landed: its points join the header */
export function land(prev: HeldPoints, id: string): HeldPoints {
  if (!(id in prev.unplayed)) return prev;
  const unplayed = { ...prev.unplayed };
  delete unplayed[id];
  return { ...prev, unplayed };
}

/** «Πάρε τους πόντους» was tapped: these stay held until `landClaimed` */
export function claim(prev: HeldPoints, ids: readonly string[]): HeldPoints {
  return { ...prev, claimed: [...new Set([...prev.claimed, ...ids])] };
}

/** the one flight of «Πάρε τους πόντους» landed: everything it took joins the header */
export function landClaimed(prev: HeldPoints): HeldPoints {
  if (!prev.claimed.length) return prev;
  const unplayed: Record<string, number> = {};
  for (const [id, pts] of Object.entries(prev.unplayed)) if (!prev.claimed.includes(id)) unplayed[id] = pts;
  return { ...prev, unplayed, claimed: [] };
}

/** subtract from get_me's points; 0 anywhere but the feed, where the header shows get_me as it is */
export function pointsOffset(held: HeldPoints, onFeed: boolean): number {
  if (!onFeed) return 0;
  return Object.values(held.unplayed).reduce((s, p) => s + p, 0);
}
