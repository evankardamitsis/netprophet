import { describe, expect, it } from 'vitest';
import { addDays, dayKey, localParts, startOfDay, toMs, weekKey } from './time';

describe('time', () => {
  it('rejects invalid instants', () => {
    expect(() => toMs('not a date')).toThrow(RangeError);
  });
  it('reads Athens local parts across DST', () => {
    expect(localParts('2026-03-29T00:59:59Z').hour).toBe(2); // EET
    expect(localParts('2026-03-29T01:00:00Z').hour).toBe(4); // jumped to EEST
    expect(localParts('2026-10-25T00:59:59Z').hour).toBe(3); // EEST
    expect(localParts('2026-10-25T01:00:00Z').hour).toBe(3); // fell back to EET
  });
  it('start of day respects the offset', () => {
    expect(startOfDay('2026-03-29')).toBe('2026-03-28T22:00:00.000Z');
    expect(startOfDay('2026-03-30')).toBe('2026-03-29T21:00:00.000Z');
    expect(startOfDay('2026-10-26')).toBe('2026-10-25T22:00:00.000Z');
  });
  it('addDays crosses month and year', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('accepts offset instants', () => {
    expect(dayKey('2026-10-10T00:00:00+03:00')).toBe('2026-10-10');
    expect(dayKey('2026-10-09T23:59:59+03:00')).toBe('2026-10-09');
    expect(weekKey('2026-10-12T00:00:00+03:00')).toBe('2026-10-12');
  });
});
