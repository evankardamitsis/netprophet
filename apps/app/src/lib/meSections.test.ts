import { describe, expect, it } from 'vitest';
import { meSections, mePageOf } from './meSections';

const none = { levelBar: false, quests: false, look: false, proOpen: false };
const all = { levelBar: true, quests: true, look: true, proOpen: true };

describe('meSections', () => {
  it('a brand new player sees the hero, the numbers and the settings', () => {
    expect(meSections(none)).toEqual(['hero', 'numbers', 'settings']);
  });

  it('everything open: the player first, Pro quiet after, settings last', () => {
    expect(meSections(all)).toEqual(['hero', 'level', 'quests', 'numbers', 'look', 'pro', 'settings']);
  });

  it('Pro never sits above the player own sections', () => {
    const s = meSections(all);
    for (const own of ['level', 'quests', 'numbers', 'look'] as const) expect(s.indexOf('pro')).toBeGreaterThan(s.indexOf(own));
  });

  it('one row for the numbers, hero first and settings last, whatever is open', () => {
    for (const levelBar of [false, true])
      for (const quests of [false, true])
        for (const look of [false, true])
          for (const proOpen of [false, true]) {
            const s = meSections({ levelBar, quests, look, proOpen });
            expect(s.filter((x) => x === 'numbers')).toHaveLength(1);
            expect(s[0]).toBe('hero');
            expect(s[s.length - 1]).toBe('settings');
          }
  });

  it('each unlock adds only its own section', () => {
    expect(meSections({ ...none, levelBar: true })).toEqual(['hero', 'level', 'numbers', 'settings']);
    expect(meSections({ ...none, quests: true })).toEqual(['hero', 'quests', 'numbers', 'settings']);
    expect(meSections({ ...none, look: true })).toEqual(['hero', 'numbers', 'look', 'settings']);
    expect(meSections({ ...none, proOpen: true })).toEqual(['hero', 'numbers', 'pro', 'settings']);
  });
});

describe('mePageOf', () => {
  it('?page=stats keeps opening the numbers (the header deep link)', () => {
    expect(mePageOf('stats')).toBe('numbers');
    expect(mePageOf(['stats'])).toBe('numbers');
  });

  it('anything else is the main page', () => {
    expect(mePageOf(undefined)).toBe('main');
    expect(mePageOf('')).toBe('main');
    expect(mePageOf('other')).toBe('main');
  });
});
