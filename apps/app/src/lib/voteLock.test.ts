import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOCK_IDLE,
  flushVotes,
  initialLock,
  lockOf,
  lockProgress,
  lockReduce,
  pickedSide,
  resetLocks,
  tapVote,
  undoVote,
  type LockState,
} from './voteLock';

const split = { pctA: 62, pctB: 38 };

describe('lockReduce', () => {
  it('a tap starts the lock-in on that name', () => {
    expect(lockReduce(LOCK_IDLE, { type: 'tap', side: 'a', now: 10 })).toEqual({ phase: 'locking', side: 'a', since: 10 });
  });
  it('the other name while it runs moves the pick and restarts the ring', () => {
    const s: LockState = { phase: 'locking', side: 'a', since: 10 };
    expect(lockReduce(s, { type: 'tap', side: 'b', now: 500 })).toEqual({ phase: 'locking', side: 'b', since: 500 });
  });
  it('the same name again changes nothing', () => {
    const s: LockState = { phase: 'locking', side: 'a', since: 10 };
    expect(lockReduce(s, { type: 'tap', side: 'a', now: 500 })).toBe(s);
  });
  it('«Αναίρεση» goes back to idle only while locking', () => {
    expect(lockReduce({ phase: 'locking', side: 'a', since: 0 }, { type: 'undo' })).toEqual(LOCK_IDLE);
    const sending: LockState = { phase: 'sending', side: 'a' };
    expect(lockReduce(sending, { type: 'undo' })).toBe(sending);
  });
  it('complete → sending → voted with the split', () => {
    const s1 = lockReduce({ phase: 'locking', side: 'b', since: 0 }, { type: 'complete' });
    expect(s1).toEqual({ phase: 'sending', side: 'b' });
    expect(lockReduce(s1, { type: 'sent', split })).toEqual({ phase: 'voted', side: 'b', split });
  });
  it('a failed send goes back to idle', () => {
    expect(lockReduce({ phase: 'sending', side: 'a' }, { type: 'failed' })).toEqual(LOCK_IDLE);
  });
  it('a vote that is in cannot be tapped or undone', () => {
    const v: LockState = { phase: 'voted', side: 'a', split };
    expect(lockReduce(v, { type: 'tap', side: 'b', now: 1 })).toBe(v);
    expect(lockReduce(v, { type: 'undo' })).toBe(v);
  });
});

describe('helpers', () => {
  it('initialLock follows the feed', () => {
    expect(initialLock(undefined, undefined)).toEqual(LOCK_IDLE);
    expect(initialLock('a', split)).toEqual({ phase: 'voted', side: 'a', split });
    expect(initialLock('b', undefined)).toEqual({ phase: 'voted', side: 'b', split: null });
  });
  it('lockProgress runs 0 to 1 over the lock time', () => {
    const s: LockState = { phase: 'locking', side: 'a', since: 1000 };
    expect(lockProgress(s, 1000, 2000)).toBe(0);
    expect(lockProgress(s, 2000, 2000)).toBe(0.5);
    expect(lockProgress(s, 9000, 2000)).toBe(1);
    expect(lockProgress(LOCK_IDLE, 9000, 2000)).toBe(0);
    expect(lockProgress({ phase: 'sending', side: 'a' }, 0, 2000)).toBe(1);
  });
  it('pickedSide', () => {
    expect(pickedSide(LOCK_IDLE)).toBeNull();
    expect(pickedSide({ phase: 'sending', side: 'b' })).toBe('b');
  });
});

describe('the store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends once, only after the lock time', async () => {
    const send = vi.fn().mockResolvedValue(split);
    tapVote('m1', 'a', send, 2000, 0);
    vi.advanceTimersByTime(1999);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('a');
    await vi.runAllTimersAsync();
    expect(lockOf('m1', LOCK_IDLE)).toEqual({ phase: 'voted', side: 'a', split });
  });

  it('«Αναίρεση» makes no call at all', () => {
    const send = vi.fn().mockResolvedValue(split);
    tapVote('m1', 'a', send, 2000, 0);
    vi.advanceTimersByTime(1500);
    expect(undoVote('m1')).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(send).not.toHaveBeenCalled();
    expect(lockOf('m1', LOCK_IDLE)).toEqual(LOCK_IDLE);
  });

  it('switching names sends the last pick, after a fresh ring', () => {
    const send = vi.fn().mockResolvedValue(split);
    tapVote('m1', 'a', send, 2000, 0);
    vi.advanceTimersByTime(1500);
    tapVote('m1', 'b', send, 2000, 1500);
    vi.advanceTimersByTime(1500);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('b');
  });

  it('leaving for the background sends what is pending at once', () => {
    const send = vi.fn().mockResolvedValue(split);
    tapVote('m1', 'a', send, 2000, 0);
    tapVote('m2', 'b', send, 2000, 0);
    expect(flushVotes()).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    // the timers were cleared: nothing is sent twice
    vi.advanceTimersByTime(5000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(undoVote('m1')).toBe(false);
  });

  it('a failed vote goes back to idle and can be tapped again', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(split);
    tapVote('m1', 'a', send, 2000, 0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(lockOf('m1', LOCK_IDLE)).toEqual(LOCK_IDLE);
    expect(tapVote('m1', 'b', send, 2000, 3000)).toBe(true);
  });

  it('a vote the feed already has wins over an idle left here', () => {
    const send = vi.fn().mockResolvedValue(split);
    tapVote('m1', 'a', send, 2000, 0);
    undoVote('m1');
    expect(lockOf('m1', initialLock('b', split))).toEqual({ phase: 'voted', side: 'b', split });
  });
});
