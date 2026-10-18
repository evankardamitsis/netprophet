import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { activeLine, planCards, priceLine, proPrice, trialLine } from './pro';

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

describe('plan cards', () => {
  it('puts the founding year first with its monthly price, then the monthly', () => {
    const cards = planCards(
      [
        { product_id: 'pro_monthly', price: 8.99, period: 'month' },
        { product_id: 'pro_founding', price: 49.99, period: 'year' },
      ],
      t,
    );
    expect(cards.map((c) => c.productId)).toEqual(['pro_founding', 'pro_monthly']);
    expect(cards[0]).toMatchObject({ title: 'Ιδρυτικό μέλος', price: '49,99€', perMonth: '4,17€ τον μήνα', best: true });
    expect(cards[1]).toMatchObject({ title: 'Μηνιαίο', price: '8,99€', perMonth: null, best: false });
  });
  it('the yearly plan after the founding offer', () => {
    expect(planCards([{ product_id: 'pro_yearly', price: 69.99, period: 'year' }], t)[0]).toMatchObject({ price: '69,99€', perMonth: '5,83€ τον μήνα' });
  });
});

describe('trialLine', () => {
  it('says what the free week costs today and after, with the date of the charge', () => {
    const card = planCards([{ product_id: 'pro_monthly', price: 8.99, period: 'month' }], t)[0]!;
    expect(trialLine(card, t, new Date(2026, 9, 18))).toBe('Σήμερα 0€. Από 25/10, 8,99€ τον μήνα. Ακύρωσε πριν και δεν χρεώνεσαι.');
  });
  it('names the founding year', () => {
    const card = planCards([{ product_id: 'pro_founding', price: 49.99, period: 'year' }], t)[0]!;
    expect(trialLine(card, t, new Date(2026, 9, 28))).toContain('49,99€ τον πρώτο χρόνο');
  });
});
