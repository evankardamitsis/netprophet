import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { isHttpsUrl } from './openUrl';
import { legalUrl } from './legalLinks';

describe('legal links', () => {
  it('points at the site pages, Greek by default', () => {
    expect(legalUrl('terms')).toBe('https://netprophetapp.com/terms');
    expect(legalUrl('privacy')).toBe('https://netprophetapp.com/privacy');
    expect(legalUrl('terms', 'en')).toBe('https://netprophetapp.com/en/terms');
    expect(legalUrl('privacy', 'en')).toBe('https://netprophetapp.com/en/privacy');
  });
  it('opens as https', () => {
    expect(isHttpsUrl(legalUrl('terms'))).toBe(true);
  });
  it('names the links the same way on the Pro screen and in Ρυθμίσεις', () => {
    for (const lang of ['el', 'en'] as const) {
      const t = getCopy(lang);
      expect(t.pro.terms).toBeTruthy();
      expect(t.pro.privacy).toBeTruthy();
      expect(t.me.terms).toBe(t.pro.terms);
      expect(t.me.privacy).toBe(t.pro.privacy);
    }
    expect(getCopy('el').pro.terms).toBe('Όροι χρήσης');
  });
});
