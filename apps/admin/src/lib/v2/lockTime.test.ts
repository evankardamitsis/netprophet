import { describe, expect, it } from 'vitest';
import { DEFAULT_UNTIMED_LOCK, validLockTime } from './lockTime';

describe('validLockTime', () => {
  it('takes HH:MM through the day', () => {
    expect(validLockTime(DEFAULT_UNTIMED_LOCK)).toBe(true);
    expect(validLockTime('00:00')).toBe(true);
    expect(validLockTime('09:30')).toBe(true);
    expect(validLockTime('23:59')).toBe(true);
  });
  it('refuses anything else', () => {
    expect(validLockTime('')).toBe(false);
    expect(validLockTime('24:00')).toBe(false);
    expect(validLockTime('9:30')).toBe(false);
    expect(validLockTime('14:00:00')).toBe(false);
    expect(validLockTime('noon')).toBe(false);
  });
});
