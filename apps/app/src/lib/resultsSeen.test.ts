import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
const { hasNewResults, laterMark } = await import('./resultsSeen');

describe('laterMark', () => {
  it('takes the first mark', () => {
    expect(laterMark(null, '2026-10-14T12:00:00Z')).toBe('2026-10-14T12:00:00Z');
    expect(laterMark(undefined, '2026-10-14T12:00:00Z')).toBe('2026-10-14T12:00:00Z');
  });
  it('moves forward, never back (Σήμερα and Αποτελέσματα both mark)', () => {
    expect(laterMark('2026-10-14T11:00:00Z', '2026-10-14T12:00:00Z')).toBe('2026-10-14T12:00:00Z');
    expect(laterMark('2026-10-14T12:00:00Z', '2026-10-14T11:00:00Z')).toBe('2026-10-14T12:00:00Z');
  });
});

describe('hasNewResults', () => {
  it('lights for a result newer than the last visit', () => {
    expect(hasNewResults('2026-10-14T12:00:00Z', '2026-10-14T11:00:00Z')).toBe(true);
  });
  it('stays dark once that same result was seen (the marker is the server time, not the phone clock)', () => {
    expect(hasNewResults('2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z')).toBe(false);
  });
  it('lights on a first run when there are results', () => {
    expect(hasNewResults('2026-10-14T12:00:00Z', null)).toBe(true);
  });
  it('stays dark for older results, no results, or while loading', () => {
    expect(hasNewResults('2026-10-14T10:00:00Z', '2026-10-14T11:00:00Z')).toBe(false);
    expect(hasNewResults(null, '2026-10-14T11:00:00Z')).toBe(false);
    expect(hasNewResults('2026-10-14T12:00:00Z', undefined)).toBe(false);
  });
});
