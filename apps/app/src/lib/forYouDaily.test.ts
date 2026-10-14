import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
const { mayRiseToday } = await import('./forYouDaily');

describe('«Για σένα» once a day', () => {
  const now = new Date('2026-10-14T09:00:00Z');
  it('rises on a day it has not risen yet, and on a first run', () => {
    expect(mayRiseToday('2026-10-13', now)).toBe(true);
    expect(mayRiseToday(null, now)).toBe(true);
  });
  it('stays down once it rose today, and while loading', () => {
    expect(mayRiseToday('2026-10-14', now)).toBe(false);
    expect(mayRiseToday(undefined, now)).toBeUndefined();
  });
});
