import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { buyNote, activeLine, buyLine, planCards, priceLine, proPrice, proStatusLine, restoreLine, trialLine } from './pro';
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
        { product_id: 'pro_founding', price: 49.99, period: 'year', renews: 69.99 },
      ],
      t,
    );
    expect(cards.map((c) => c.productId)).toEqual(['pro_founding', 'pro_monthly']);
    expect(cards[0]).toMatchObject({
      title: 'Ιδρυτικό μέλος',
      price: '49,99€',
      note: 'τον πρώτο χρόνο, μετά 69,99€/χρόνο',
      renews: '69,99€',
      best: true,
    });
    expect(cards[1]).toMatchObject({ title: 'Μηνιαίο', price: '8,99€', renews: null, best: false });
  });
  it('the founding plan says 69,99 after the first year even if the server does not send it yet', () => {
    expect(planCards([{ product_id: 'pro_founding', price: 49.99, period: 'year' }], t)[0]).toMatchObject({ renews: '69,99€' });
  });
  it('the yearly plan after the founding offer', () => {
    expect(planCards([{ product_id: 'pro_yearly', price: 69.99, period: 'year' }], t)[0]).toMatchObject({ price: '69,99€', note: 'τον χρόνο' });
  });
});

describe('trialLine', () => {
  it('says what the free week costs today and after, with the date of the charge', () => {
    const card = planCards([{ product_id: 'pro_monthly', price: 8.99, period: 'month' }], t)[0]!;
    expect(trialLine(card, t, new Date(2026, 9, 18))).toBe('Σήμερα 0€. Από 25/10, 8,99€ τον μήνα.');
  });
  it('names the founding year and what follows it', () => {
    const card = planCards([{ product_id: 'pro_founding', price: 49.99, period: 'year', renews: 69.99 }], t)[0]!;
    expect(trialLine(card, t, new Date(2026, 9, 28))).toBe(
      'Σήμερα 0€. Από 4/11, 49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο.',
    );
  });
  it('without the free week: the price and what follows', () => {
    const [founding, monthly] = planCards(
      [
        { product_id: 'pro_founding', price: 49.99, period: 'year', renews: 69.99 },
        { product_id: 'pro_monthly', price: 8.99, period: 'month', renews: 8.99 },
      ],
      t,
    );
    expect(buyLine(founding!, t)).toBe(
      '49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο.',
    );
    expect(buyLine(monthly!, t)).toBe('8,99€ τον μήνα.');
    expect(buyLine(founding!, getCopy('en'))).toBe('49,99€ for the first year, then 69,99€/year.');
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

describe('buyNote: what the player reads after a purchase that did not go through', () => {
  const t = getCopy('el');
  it('says nothing after a purchase or a cancel', () => {
    expect(buyNote({ result: 'ok', code: null }, t)).toBeNull();
    expect(buyNote({ result: 'cancelled', code: null }, t)).toBeNull();
  });
  it('names what happened and what to do', () => {
    expect(buyNote({ result: 'failed', code: 'PAYMENT_PENDING_ERROR' }, t)).toBe(t.pro.pending);
    expect(buyNote({ result: 'failed', code: 'PRODUCT_ALREADY_PURCHASED_ERROR' }, t)).toBe(t.pro.owned);
    expect(buyNote({ result: 'failed', code: 'NETWORK_ERROR' }, t)).toBe(t.pro.offline);
    expect(buyNote({ result: 'failed', code: 'STORE_PROBLEM_ERROR' }, t)).toBe(t.pro.storeDown);
    expect(buyNote({ result: 'unavailable', code: 'no_module' }, t)).toBe(t.pro.deviceUnavailable);
  });
  it('anything else carries the store code, so a screenshot says what failed', () => {
    expect(buyNote({ result: 'failed', code: 'INVALID_CREDENTIALS_ERROR' }, t)).toBe(`${t.pro.notDone} (INVALID_CREDENTIALS_ERROR)`);
    expect(buyNote({ result: 'failed', code: null }, t)).toBe(t.pro.notDone);
  });
});
