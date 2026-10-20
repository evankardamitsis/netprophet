import type { GetBadgesResult, GetQuestsResult } from '@netprophet/db';
import { debounce } from './moments';

/**
 * After votes: one read of quests, badges and get_me for a burst of votes, a beat after the last one (moments already
 * wait a second), and the feed's celebration queue only when that read shows a vote could have queued one.
 */

/** a vote's reads settle this long after the last vote of a burst */
export const POST_VOTE_MS = 1000;

export interface GameSnapshot {
  quests: GetQuestsResult | null;
  badges: GetBadgesResult | null;
  /** get_me's open unlock steps */
  unlocks: readonly string[] | null;
  /** get_me's total points */
  points: number | null;
}

/**
 * Whether the votes between `before` and `after` could have queued a celebration. A vote queues one only through a
 * quest it finished, a badge tier it reached, an unlock step it opened, or points (a level); σερί milestones come
 * from results, never from a vote. Anything unknown counts as «maybe», so nothing is missed.
 */
export function mayHaveCelebrated(before: GameSnapshot, after: GameSnapshot): boolean {
  if (!before.quests || !after.quests || !before.badges || !after.badges || !before.unlocks || !after.unlocks) return true;
  const doneBefore = new Set([...before.quests.daily, ...before.quests.weekly].filter((q) => q.done).map((q) => q.key));
  if ([...after.quests.daily, ...after.quests.weekly].some((q) => q.done && !doneBefore.has(q.key))) return true;
  const tierBefore = new Map(before.badges.badges.map((b) => [b.key, b.tier] as const));
  if (after.badges.badges.some((b) => b.tier > (tierBefore.get(b.key) ?? 0))) return true;
  const open = new Set(before.unlocks);
  if (after.unlocks.some((id) => !open.has(id))) return true;
  if (before.points === null || after.points === null) return true;
  return after.points > before.points;
}

/**
 * Votes in a row make one burst: `add` takes the state from before the first vote of the burst (later ones keep it),
 * and `run` gets it once, `ms` after the last vote.
 */
export function voteBurst<T>(run: (before: T) => void, ms: number = POST_VOTE_MS): { add: (before: () => T) => void; cancel: () => void } {
  let held: { value: T } | null = null;
  const timer = debounce(() => {
    const b = held;
    held = null;
    if (b) run(b.value);
  }, ms);
  return {
    add(before) {
      held ??= { value: before() };
      timer.call();
    },
    cancel() {
      held = null;
      timer.cancel();
    },
  };
}
