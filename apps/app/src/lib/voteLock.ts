import type { CardPct } from './feed';
import type { Side } from './votes';

/**
 * Tap a name to vote (mockup D, founder 22 Oct). A vote is final on the server (only api.cast_vote exists), so the tap
 * does not send at once: the name fills, a ring runs for `motion.voteLock` with «Αναίρεση» under it, and only when it
 * completes is the vote sent. «Αναίρεση» stops it with no call at all. Leaving the screen does not lose it: the timer
 * and the send live here, outside the row, so a row that unmounts (a refresh, the list folding) still sends; the app
 * going to the background sends every pending vote at once (`flushVotes`), as a timer may never fire there.
 *
 * idle      nothing picked
 * locking   a name picked, the ring runs; a tap on the other name moves the pick and starts the ring again
 * sending   the ring completed, cast_vote is on its way
 * voted     the server took it: the split shows (null when it never came back, e.g. a vote loaded with the feed)
 */
export type LockState =
  | { phase: 'idle' }
  | { phase: 'locking'; side: Side; since: number }
  | { phase: 'sending'; side: Side }
  | { phase: 'voted'; side: Side; split: CardPct | null };

export type LockEvent =
  | { type: 'tap'; side: Side; now: number }
  | { type: 'undo' }
  | { type: 'complete' }
  | { type: 'sent'; split: CardPct }
  | { type: 'failed' };

export const LOCK_IDLE: LockState = { phase: 'idle' };

/** the row's state before anything happened here: voted when the feed says so */
export function initialLock(myVote: Side | undefined, split: CardPct | undefined): LockState {
  return myVote ? { phase: 'voted', side: myVote, split: split ?? null } : LOCK_IDLE;
}

export function lockReduce(s: LockState, e: LockEvent): LockState {
  switch (e.type) {
    case 'tap':
      if (s.phase === 'idle') return { phase: 'locking', side: e.side, since: e.now };
      // the other name while the ring runs: the pick moves and the ring starts again; the same name changes nothing
      if (s.phase === 'locking' && s.side !== e.side) return { phase: 'locking', side: e.side, since: e.now };
      return s;
    case 'undo':
      return s.phase === 'locking' ? LOCK_IDLE : s;
    case 'complete':
      return s.phase === 'locking' ? { phase: 'sending', side: s.side } : s;
    case 'sent':
      return s.phase === 'sending' ? { phase: 'voted', side: s.side, split: e.split } : s;
    case 'failed':
      // the vote did not go through: back to a fresh pick (the screen says why in a toast)
      return s.phase === 'sending' ? LOCK_IDLE : s;
  }
}

/** how far the ring has run, 0 to 1 */
export function lockProgress(s: LockState, now: number, ms: number): number {
  if (s.phase === 'sending' || s.phase === 'voted') return 1;
  if (s.phase !== 'locking' || ms <= 0) return 0;
  return Math.min(1, Math.max(0, (now - s.since) / ms));
}

/** the side a name shows as picked (filled ink), if any */
export function pickedSide(s: LockState): Side | null {
  return s.phase === 'idle' ? null : s.side;
}

/* ================= the store: one state per match, outside any row ================= */

type Send = (side: Side) => Promise<CardPct>;

const states = new Map<string, LockState>();
const timers = new Map<string, { timer: ReturnType<typeof setTimeout>; fire: () => void }>();
const listeners = new Set<() => void>();
/** bumps on every change, so a reader can tell a new snapshot */
let version = 0;

function set(id: string, next: LockState): void {
  if (states.get(id) === next) return;
  states.set(id, next);
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribeLocks(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function locksVersion(): number {
  return version;
}

/** the state held for a match, or `fallback` (from the feed) when nothing happened here yet */
export function lockOf(id: string, fallback: LockState): LockState {
  const s = states.get(id);
  // a vote the feed already knows wins over an idle left from an undo
  if (!s || (s.phase === 'idle' && fallback.phase === 'voted')) return fallback;
  return s;
}

function clearTimer(id: string): void {
  const t = timers.get(id);
  if (t) clearTimeout(t.timer);
  timers.delete(id);
}

/**
 * A tap on a name. Starts (or moves) the lock-in; after `ms` the vote is sent through `send` (the screen's vote path:
 * cast_vote, the burst, quests, error toasts). Returns false when the tap changed nothing.
 */
export function tapVote(id: string, side: Side, send: Send, ms: number, now = Date.now()): boolean {
  const before = states.get(id) ?? LOCK_IDLE;
  const next = lockReduce(before, { type: 'tap', side, now });
  if (next === before) return false;
  set(id, next);
  clearTimer(id);
  const fire = () => {
    clearTimer(id);
    const cur = states.get(id) ?? LOCK_IDLE;
    if (cur.phase !== 'locking') return;
    set(id, lockReduce(cur, { type: 'complete' }));
    send(cur.side).then(
      (split) => set(id, lockReduce(states.get(id) ?? LOCK_IDLE, { type: 'sent', split })),
      () => set(id, lockReduce(states.get(id) ?? LOCK_IDLE, { type: 'failed' })),
    );
  };
  timers.set(id, { timer: setTimeout(fire, ms), fire });
  return true;
}

/** «Αναίρεση»: the ring stops, nothing is sent. False when there was nothing to take back (already sent). */
export function undoVote(id: string): boolean {
  const before = states.get(id);
  if (!before || before.phase !== 'locking') return false;
  clearTimer(id);
  set(id, lockReduce(before, { type: 'undo' }));
  return true;
}

/** send every vote still in its lock-in now (the app goes to the background); returns how many */
export function flushVotes(): number {
  const pending = [...timers.values()];
  pending.forEach((p) => p.fire());
  return pending.length;
}

/** tests only */
export function resetLocks(): void {
  timers.forEach((t) => clearTimeout(t.timer));
  timers.clear();
  states.clear();
  version += 1;
}
