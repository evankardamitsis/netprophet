import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One line at a time on Σήμερα (founder, 19 Oct: not overwhelming). A vote that failed, a match confirmed, a quest
 * finished or moved, a report sent: each waits its turn and shows for its own time, in the order it came. `ms` is how
 * long the item holds the stage; `n` tells two equal lines apart (a new key shows the toast again).
 */
export interface Queued<T> {
  n: number;
  ms: number;
  item: T;
}

export interface QueueState<T> {
  active: Queued<T> | null;
  waiting: Queued<T>[];
}

export const emptyQueue = <T>(): QueueState<T> => ({ active: null, waiting: [] });

/** Add an item: it shows at once when nothing does, else it waits behind the others. */
export function enqueue<T>(q: QueueState<T>, next: Queued<T>): QueueState<T> {
  return q.active ? { active: q.active, waiting: [...q.waiting, next] } : { active: next, waiting: q.waiting };
}

/** The active item's time is up (`n` guards against a late timer): the next one in line takes the stage. */
export function advance<T>(q: QueueState<T>, n: number): QueueState<T> {
  if (!q.active || q.active.n !== n) return q;
  const [head, ...rest] = q.waiting;
  return { active: head ?? null, waiting: rest };
}

/** The queue as state: `push` adds a line, `active` is what shows now; each item leaves after its `ms`. */
export function useToastQueue<T>(): { active: Queued<T> | null; push: (item: T, ms: number) => void } {
  const [q, setQ] = useState<QueueState<T>>(emptyQueue);
  const seq = useRef(0);
  const push = useCallback((item: T, ms: number) => {
    seq.current += 1;
    const n = seq.current;
    setQ((s) => enqueue(s, { n, ms, item }));
  }, []);
  const active = q.active;
  useEffect(() => {
    if (!active) return undefined;
    const id = setTimeout(() => setQ((s) => advance(s, active.n)), active.ms);
    return () => clearTimeout(id);
  }, [active]);
  return { active, push };
}
