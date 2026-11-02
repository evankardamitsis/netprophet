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
      // a singular unit for every badge whose first tier is 1, and a feminine name only for a known badge
      expect(Object.keys(b.unitsOne).sort()).toEqual(['doubles_player', 'first_serve', 'generous', 'influencer', 'month_top', 'nice_player', 'season_veteran', 'upset', 'whole_week']);
      expect(Object.keys(b.namesF).every((k) => k in b.names)).toBe(true);
      expect(b.tiers).toHaveLength(3);
      expect(b.tiersLower).toHaveLength(3);
    }
  });
});
