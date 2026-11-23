import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) } }));
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }));
vi.mock('./data', () => ({ useApi: () => null }));

const { applySplits, liveSplit, pollIds, resetLiveSplits, setLiveSplit, MAX_IDS } = await import('./liveSplits');

describe('live splits (founder, 23 Nov 2026)', () => {
  beforeEach(() => resetLiveSplits());

  it('a poll lands as percentages with the count', () => {
    expect(applySplits({ m1: { total: 4, side1: 3, side2: 1, pct1: 75, pct2: 25 } })).toBe(1);
    expect(liveSplit('m1')).toEqual({ pctA: 75, pctB: 25, total: 4 });
  });
  it('the same numbers again change nothing', () => {
    applySplits({ m1: { total: 4, side1: 3, side2: 1, pct1: 75, pct2: 25 } });
    expect(applySplits({ m1: { total: 4, side1: 3, side2: 1, pct1: 75, pct2: 25 } })).toBe(0);
  });
  it('your own vote updates the store at once', () => {
    setLiveSplit('m2', { pctA: 100, pctB: 0, total: 1 });
    expect(liveSplit('m2')?.total).toBe(1);
  });
  it('an empty or missing reply is fine', () => {
    expect(applySplits({})).toBe(0);
    expect(applySplits(null)).toBe(0);
  });
  it('poll ids: no blanks, no repeats, at most 100', () => {
    expect(pollIds(['a', 'a', null, undefined, '', 'b'])).toEqual(['a', 'b']);
    expect(pollIds(Array.from({ length: 150 }, (_, i) => `m${i}`))).toHaveLength(MAX_IDS);
  });
});
