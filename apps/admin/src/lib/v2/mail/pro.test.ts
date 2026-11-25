import { describe, expect, it } from 'vitest';
import { colors } from '@netprophet/tokens';
import { KNOWN_KINDS, renderDue, type DueEmail } from './index';
import { dayMonth, euro, fullDate, planPrice, redeemUrl } from './pro';

// 24/11/2026 15:00 in Athens (13:00 UTC)
const ENDS = '2026-11-24T13:00:00+00:00';
const base: DueEmail = {
  id: '00000000-0000-0000-0000-000000000002',
  kind: 'pro_welcome',
  group: 'pro',
  to: 'nikos@example.com',
  payload: { product_id: 'pro_founding', price: 49.99, renews: 69.99, period: 'year', store: 'APP_STORE', trial: true, ends_at: ENDS },
  first_name: 'Νίκος',
  gender: null,
  lang: 'el',
  unsubscribe_token: '11111111-2222-3333-4444-555555555555',
};
const winback = (payload: Record<string, unknown> = {}): DueEmail => ({
  ...base,
  kind: 'pro_winback',
  payload: { store: 'APP_STORE', code: 'ABC12345', code_expires_at: '2027-01-15T21:59:59+00:00', ...payload },
});
const PRO_KINDS = ['pro_welcome', 'pro_trial_day5', 'pro_cancel', 'pro_winback'];
const all = () => PRO_KINDS.map((kind) => (kind === 'pro_winback' ? winback() : { ...base, kind }));

describe('formatting', () => {
  it('writes prices the Greek way', () => {
    expect(euro(8.99)).toBe('8,99€');
    expect(euro(4.49)).toBe('4,49€');
    expect(euro(70)).toBe('70,00€');
  });
  it('writes the day in Athens, not UTC', () => {
    expect(dayMonth(ENDS)).toBe('24/11');
    // 23:30 UTC on 31/12 is already 1/1 in Athens
    expect(dayMonth('2026-12-31T23:30:00Z')).toBe('1/1');
  });
  it('says what each plan costs', () => {
    expect(planPrice({ price: 8.99, period: 'month' })?.full).toBe('8,99€ τον μήνα');
    expect(planPrice({ price: 69.99, renews: null, period: 'year' })?.full).toBe('69,99€ τον χρόνο');
    expect(planPrice({ price: 49.99, renews: 69.99, period: 'year' })?.full).toBe('49,99€ τον πρώτο χρόνο, 69,99€ από εκεί και πέρα');
    expect(planPrice({})).toBeNull();
  });
});

describe('the Pro emails', () => {
  it('are all registered', () => {
    for (const k of PRO_KINDS) expect(KNOWN_KINDS).toContain(k);
  });

  it.each(all().map((e) => [e.kind, e] as const))('%s follows the copy rules and carries the unsubscribe link', (_k, e) => {
    const m = renderDue(e)!;
    expect(m).not.toBeNull();
    expect(m.html).toContain('<!doctype html>');
    expect(m.unsubscribeUrl).toBe('https://www.netprophetapp.com/email/unsubscribe?t=11111111-2222-3333-4444-555555555555');
    for (const part of [m.subject, m.html, m.text]) {
      expect(part).not.toContain('—');
      expect(part).not.toMatch(/στοίχημα|απόδοση|ποντάρ|κέρδη|επίπεδο/);
      // gender unknown: no masculine-only forms
      expect(part).not.toMatch(/πρώτος|έτοιμος|σίγουρος/);
    }
    // one blue button at most
    expect((m.html.match(new RegExp(`background-color:${colors.blue};border-radius:999px`, 'g')) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('pro_welcome: the free week end date and the price after it', () => {
    const m = renderDue(base)!;
    expect(m.subject).toBe('Είσαι Pro!');
    expect(m.html).toContain('Καλωσήρθες στο Pro!');
    expect(m.text).toContain('Η δωρεάν εβδομάδα τελειώνει στις 24/11. Μετά 49,99€ τον πρώτο χρόνο, 69,99€ από εκεί και πέρα.');
    expect(m.text).toContain('Άνοιξε τις ειδοποιήσεις');
    expect(m.text).toContain('12 ερωτήσεις');
  });

  it('pro_welcome given from the admin: the gift and its end date, no store or price', () => {
    const m = renderDue({ ...base, payload: { given: true, ends_at: '2027-11-25T10:00:00+00:00' } })!;
    expect(m.subject).toBe('Έχεις Pro, δώρο από εμάς!');
    expect(m.html).toContain('Καλωσήρθες στο Pro!');
    expect(m.text).toContain('Σου ανοίξαμε το Pro δώρο.');
    expect(m.text).toContain('Το Pro σου ισχύει μέχρι τις 25 Νοεμβρίου 2027. Μετά γυρνάς στο δωρεάν, χωρίς καμία χρέωση.');
    expect(m.text).not.toMatch(/€|δωρεάν εβδομάδα/);
    const en = renderDue({ ...base, lang: 'en', payload: { given: true, ends_at: '2027-11-25T10:00:00+00:00' } })!;
    expect(en.subject).toBe('You’ve got Pro, on us!');
    expect(en.text).toContain('Your Pro runs until 25 November 2027.');
  });

  it('writes a full date', () => {
    expect(fullDate('2027-05-03T10:00:00Z')).toBe('3 Μαΐου 2027');
    expect(fullDate('2027-12-31T23:30:00Z', 'en')).toBe('1 January 2028');
  });

  it('pro_welcome: no free week line for a paid start', () => {
    const m = renderDue({ ...base, payload: { ...base.payload, trial: false } })!;
    expect(m.text).not.toContain('δωρεάν εβδομάδα');
  });

  it('pro_trial_day5: two days, the charge date and price, cancel in their store', () => {
    const m = renderDue({ ...base, kind: 'pro_trial_day5', payload: { ...base.payload, product_id: 'pro_monthly', price: 8.99, renews: null, period: 'month' } })!;
    expect(m.subject).toBe('2 μέρες ακόμα δωρεάν');
    expect(m.text).toContain('Στις 24/11 ξεκινάει η συνδρομή: 8,99€ τον μήνα.');
    expect(m.text).toContain('Ακύρωσέ το από τις συνδρομές του App Store πριν τις 24/11. Δεν πληρώνεις τίποτα.');
    expect(m.html).toContain('https://apps.apple.com/account/subscriptions');
    const play = renderDue({ ...base, kind: 'pro_trial_day5', payload: { ...base.payload, store: 'PLAY_STORE' } })!;
    expect(play.text).toContain('Google Play');
    expect(play.html).toContain('https://play.google.com/store/account/subscriptions');
    const web = renderDue({ ...base, kind: 'pro_trial_day5', payload: { ...base.payload, store: 'STRIPE' } })!;
    expect(web.text).toContain('από εκεί που το ξεκίνησες');
  });

  it('pro_trial_day5: no counts it cannot prove', () => {
    const m = renderDue({ ...base, kind: 'pro_trial_day5' })!;
    expect(m.text).not.toContain('Ως τώρα');
  });

  it('pro_cancel: plain, the end date, what stays free, the reply line, no offer', () => {
    const m = renderDue({ ...base, kind: 'pro_cancel', payload: { ...base.payload, trial: false, ends_at: '2026-12-24T10:00:00Z' } })!;
    expect(m.subject).toBe('Το Pro σου σταματάει στις 24/12');
    expect(m.text).toContain('Κάτι δεν σου άρεσε; Απάντησε σε αυτό το email. Το διαβάζει όλη η ομάδα.');
    expect(m.text).toContain('Μετά τις 24/12 μένουν δωρεάν:');
    expect(m.html).not.toMatch(/−50%|4,49€|offercodes/);
  });

  it('pro_winback: the half price, the redemption link with the code, the code as text', () => {
    const m = renderDue(winback())!;
    expect(m.subject).toBe('Το Pro σου έληξε. Γύρνα με τη μισή τιμή');
    expect(m.html).toContain('−50%');
    expect(m.html).toContain('4,49€');
    expect(m.html).toContain('<s>8,99€</s>');
    expect(m.html).toContain('href="https://apps.apple.com/redeem?ctx=offercodes&amp;id=6824998331&amp;code=ABC12345"');
    expect(m.text).not.toContain('Ο κωδικός σου');
    expect(m.html.split('ABC12345').length - 1).toBe(1); // only inside the button's link
    expect(m.text).toContain('ισχύει ως τις 15/1');
  });

  it('pro_winback: never without a code', () => {
    expect(renderDue(winback({ code: undefined }))).toBeNull();
    expect(renderDue(winback({ code: '  ' }))).toBeNull();
  });

  it('cannot state a date it does not have', () => {
    expect(renderDue({ ...base, kind: 'pro_trial_day5', payload: {} })).toBeNull();
    expect(renderDue({ ...base, kind: 'pro_cancel', payload: {} })).toBeNull();
  });

  it('escapes the code in the link', () => {
    expect(redeemUrl('A B&C')).toBe('https://apps.apple.com/redeem?ctx=offercodes&id=6824998331&code=A%20B%26C');
  });
});
