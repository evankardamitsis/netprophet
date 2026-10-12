import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { activeLine, priceLine, proPrice } from './pro';

const t = getCopy('el');

describe('proPrice', () => {
  it('Greek decimals from cents', () => {
    expect(proPrice()).toBe('8,99€');
    expect(proPrice(1000)).toBe('10,00€');
    expect(priceLine(t)).toBe('8,99€ τον μήνα');
  });
});

describe('activeLine', () => {
  it('nothing without Pro, open ended, or until a date', () => {
    expect(activeLine({ pro: false, current: null, waitlisted: true }, t)).toBeNull();
    expect(activeLine({ pro: true, current: { source: 'promo', starts_at: '2026-10-01T00:00:00Z', ends_at: null }, waitlisted: false }, t)).toBe('Ενεργό');
    expect(activeLine({ pro: true, current: { source: 'promo', starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-11-12T10:00:00Z' }, waitlisted: false }, t)).toBe('Ενεργό μέχρι 12/11');
  });
});
