import { describe, expect, it } from 'vitest';
import { ALL_STEP_IDS, featureSet, gateQuests, hasFeature, hasMoment, newPlayerStart, newPlayerVote } from './unlockLadder';

describe('feature gating', () => {
  it('opens everything while unknown', () => {
    expect(hasFeature(featureSet(null), 'level_bar')).toBe(true);
    expect(hasFeature(featureSet(ALL_STEP_IDS), 'ladder_area')).toBe(true);
  });
  it('a day-one player has the basics only', () => {
    const f = featureSet(['day1']);
    expect(hasFeature(f, 'streak')).toBe(true);
    expect(hasFeature(f, 'level_bar')).toBe(false);
    expect(hasFeature(f, 'daily_quests')).toBe(false);
    expect(hasFeature(f, 'ladder_friends')).toBe(false);
  });
  it('empties the locked quests', () => {
    const q = { daily: [1], weekly: [2] };
    expect(gateQuests(q, () => true)).toEqual(q);
    expect(gateQuests(q, (f) => f === 'daily_quests')).toEqual({ daily: [1], weekly: [] });
    expect(gateQuests(q, () => false)).toEqual({ daily: [], weekly: [] });
  });
  it('only some steps get a moment', () => {
    expect(hasMoment('level_bar')).toBe(true);
    expect(hasMoment('first_freeze')).toBe(false);
    expect(hasMoment('gifts')).toBe(false);
  });
});

describe('new player ladder', () => {
  it('starts on day one', () => {
    expect(newPlayerStart().unlocked).toEqual(['day1']);
  });
  it('opens the level bar on the fifth vote', () => {
    let s = newPlayerStart();
    const seen: string[][] = [];
    for (let i = 0; i < 5; i++) {
      const r = newPlayerVote(s);
      s = r.state;
      seen.push(r.newlyUnlocked);
    }
    expect(seen.slice(0, 4).every((x) => x.length === 0)).toBe(true);
    expect(seen[4]).toEqual(['level_bar']);
    expect(s.unlocked).toEqual(['day1', 'level_bar']);
  });
  it('keeps opening steps by the backup vote counts', () => {
    let s = newPlayerStart();
    for (let i = 0; i < 12; i++) s = newPlayerVote(s).state;
    expect(s.unlocked).toEqual(expect.arrayContaining(['day1', 'level_bar', 'first_freeze', 'daily_quests']));
  });
});
