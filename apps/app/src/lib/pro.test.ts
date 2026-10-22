import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { activeLine, planCards, priceLine, proPrice, proStatusLine, restoreLine, trialLine } from './pro';
import { restoreOutcome } from './storeTypes';

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

describe('proStatusLine', () => {
  const at = (source: 'subscription' | 'promo' | 'trial', ends_at: string | null) => ({
    pro: true,
    current: { source, starts_at: '2026-10-01T00:00:00Z', ends_at },
    waitlisted: false,
  });
  it('nothing without Pro', () => {
    expect(proStatusLine({ pro: false, current: null, waitlisted: false }, t)).toBeNull();
  });
  it('where it comes from and until when', () => {
    expect(proStatusLine(at('subscription', '2026-11-12T10:00:00Z'), t)).toBe('Συνδρομή · μέχρι 12/11');
    expect(proStatusLine(at('trial', '2026-10-27T10:00:00Z'), t)).toBe('Δωρεάν εβδομάδα · μέχρι 27/10');
    expect(proStatusLine(at('promo', null), t)).toBe('Δώρο από την ομάδα');
  });
  it('Pro with no row read yet still says it is on', () => {
    expect(proStatusLine({ pro: true, current: null, waitlisted: false }, t)).toBe('Ενεργό');
  });
});

describe('restore (App Store 3.1.1)', () => {
  it('restored when the store account holds Pro or any one-time item, none otherwise', () => {
    expect(restoreOutcome({ activeEntitlements: 1, oneTimePurchases: 0 })).toBe('restored');
    expect(restoreOutcome({ activeEntitlements: 0, oneTimePurchases: 2 })).toBe('restored');
    expect(restoreOutcome({ activeEntitlements: 0, oneTimePurchases: 0 })).toBe('none');
  });
  it('each outcome has its own line, an error says try again', () => {
    expect(restoreLine('restored', t)).toBe(t.pro.restored);
    expect(restoreLine('none', t)).toBe(t.pro.restoreNone);
    expect(restoreLine('unavailable', t)).toBe(t.pro.restoreUnavailable);
    expect(restoreLine('failed', t)).toBe(t.pro.failed);
  });
});

describe('subscription terms on the Pro screen (App Store 3.1.2)', () => {
  it('says it renews by itself and how to cancel, in both languages', () => {
    expect(t.pro.renewal).toMatch(/ανανεώνεται αυτόματα/);
    expect(t.pro.renewal).toMatch(/ακυρώνεις/);
    expect(getCopy('en').pro.renewal).toMatch(/renews automatically/);
  });
});
