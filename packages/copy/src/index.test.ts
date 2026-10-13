import { describe, expect, it } from 'vitest';
import { getCopy } from './index';

describe('copy', () => {
  it('has the same shape in both locales', () => {
    expect(Object.keys(getCopy('en'))).toEqual(Object.keys(getCopy('el')));
  });
  it('uses level, not επίπεδο', () => {
    expect(JSON.stringify(getCopy('el'))).not.toContain('επίπεδο');
  });
  it('contains no em dashes', () => {
    expect(JSON.stringify([getCopy('el'), getCopy('en')])).not.toContain(String.fromCharCode(0x2014));
  });
  it('names and units every badge, in both locales', () => {
    for (const locale of ['el', 'en'] as const) {
      const b = getCopy(locale).badges;
      expect(Object.keys(b.names).sort()).toEqual(Object.keys(b.units).sort());
      expect(Object.keys(b.names)).toHaveLength(16);
      expect(b.tiers).toHaveLength(3);
      expect(b.tiersLower).toHaveLength(3);
    }
  });
});
