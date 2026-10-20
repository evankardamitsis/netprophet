import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetBadgesResult, GetQuestsResult } from '@netprophet/db';
import { mayHaveCelebrated, POST_VOTE_MS, voteBurst, type GameSnapshot } from './postVote';

const quest = (key: string, done: boolean) => ({ key, target: 3, progress: done ? 3 : 1, done, reward: { kind: 'badge', key: 'x', amount: 1 } });
const quests = (...q: ReturnType<typeof quest>[]) => ({ daily: q, weekly: [] }) as unknown as GetQuestsResult;
const badges = (tier: number) => ({ badges: [{ key: 'many_votes', tier, counter: 0, thresholds: [5, 25, 100] }] }) as unknown as GetBadgesResult;
const snap = (over: Partial<GameSnapshot> = {}): GameSnapshot => ({
  quests: quests(quest('daily_vote_3_cards', false)),
  badges: badges(0),
  unlocks: ['feed'],
  points: 120,
  ...over,
});

describe('mayHaveCelebrated: the feed is read again only when a vote could have queued a celebration', () => {
  it('nothing moved: no read', () => {
    expect(mayHaveCelebrated(snap(), snap())).toBe(false);
  });
  it('a quest finished, a badge tier, a step opened or points: read', () => {
    expect(mayHaveCelebrated(snap(), snap({ quests: quests(quest('daily_vote_3_cards', true)) }))).toBe(true);
    expect(mayHaveCelebrated(snap(), snap({ badges: badges(1) }))).toBe(true);
    expect(mayHaveCelebrated(snap(), snap({ unlocks: ['feed', 'daily_quests'] }))).toBe(true);
    expect(mayHaveCelebrated(snap(), snap({ points: 150 }))).toBe(true);
  });
  it('a quest already done before is not new', () => {
    const done = quests(quest('daily_vote_3_cards', true));
    expect(mayHaveCelebrated(snap({ quests: done }), snap({ quests: done }))).toBe(false);
  });
  it('anything unknown (a read failed, get_me not in yet): read, so nothing is missed', () => {
    expect(mayHaveCelebrated(snap({ quests: null }), snap())).toBe(true);
    expect(mayHaveCelebrated(snap(), snap({ badges: null }))).toBe(true);
    expect(mayHaveCelebrated(snap({ unlocks: null }), snap())).toBe(true);
    expect(mayHaveCelebrated(snap(), snap({ points: null }))).toBe(true);
  });
});

describe('voteBurst: votes in a row make one read', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once, a beat after the last vote, with the state from before the first', () => {
    const runs: number[] = [];
    const b = voteBurst<number>((before) => runs.push(before));
    b.add(() => 1);
    vi.advanceTimersByTime(POST_VOTE_MS - 100);
    b.add(() => 2);
    vi.advanceTimersByTime(POST_VOTE_MS - 100);
    b.add(() => 3);
    expect(runs).toEqual([]);
    vi.advanceTimersByTime(POST_VOTE_MS);
    expect(runs).toEqual([1]);
    // the next burst takes its own «before»
    b.add(() => 4);
    vi.advanceTimersByTime(POST_VOTE_MS);
    expect(runs).toEqual([1, 4]);
  });
  it('cancel (the screen left) drops a waiting burst', () => {
    const runs: number[] = [];
    const b = voteBurst<number>((before) => runs.push(before));
    b.add(() => 1);
    b.cancel();
    vi.advanceTimersByTime(POST_VOTE_MS * 2);
    expect(runs).toEqual([]);
  });
});
