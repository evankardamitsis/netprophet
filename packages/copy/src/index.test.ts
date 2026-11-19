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
  it('says which locale it is', () => {
    expect(getCopy('el').locale).toBe('el');
    expect(getCopy('en').locale).toBe('en');
  });
  it('English has no Greek letters, except the language names and comments', () => {
    // the only Greek an English reader sees from the dictionary: «Ελληνικά» in the language picker
    const allow = new Set(['Ελληνικά']);
    const found: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') {
        if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(v) && !allow.has(v)) found.push(v);
      } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(getCopy('en'));
    expect(found).toEqual([]);
  });
  it('English says Ladder, never League, and streak, never σερί', () => {
    const values: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') values.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(getCopy('en'));
    expect(values.filter((v) => /league|σερί/i.test(v))).toEqual([]);
  });
  it('carries no real people in sample text', () => {
    const text = JSON.stringify([getCopy('el'), getCopy('en')]);
    for (const name of ['Ροδίτη', 'Γκότση', 'Καρρά', 'Δεσύπρη', 'Roditis', 'Gkotsis', 'Karra', 'Desypris']) expect(text).not.toContain(name);
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
