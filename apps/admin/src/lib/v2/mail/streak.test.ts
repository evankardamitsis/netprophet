import { describe, expect, it } from 'vitest';
import { KNOWN_KINDS, renderDue, type DueEmail } from './index';
import { mondayStreakLines } from './streak';

const base: DueEmail = {
  id: '00000000-0000-0000-0000-000000000003',
  kind: 'streak_lost',
  group: 'game',
  to: 'nikos@example.com',
  payload: {},
  first_name: 'Νίκος',
  gender: null,
  lang: 'el',
  unsubscribe_token: '11111111-2222-3333-4444-555555555555',
};

/** payloads like the ones core.streak_email_sweep writes */
const PAYLOADS: Record<string, Record<string, unknown>> = {
  streak_lost: { n: 7, best: 12, day: '2027-01-21' },
  streak_milestone: { n: 30, frame: 'frame_month' },
  streak_reminder_email: { n: 4, day: '2027-01-21' },
};
const KINDS = Object.keys(PAYLOADS);
const render = (kind: string, payload: Record<string, unknown>) => renderDue({ ...base, kind, payload })!;

describe('the daily σερί emails', () => {
  it('are registered', () => {
    for (const k of KINDS) expect(KNOWN_KINDS).toContain(k);
  });

  it.each(KINDS)('%s renders with a subject, html, text, the open-app button and the unsubscribe link', (kind) => {
    const m = render(kind, PAYLOADS[kind]!);
    expect(m.subject.length).toBeGreaterThan(5);
    expect(m.html).toContain('<!doctype html>');
    expect(m.html).toContain('https://www.netprophetapp.com/open');
    expect(m.text).toContain('https://www.netprophetapp.com/open');
    expect(m.unsubscribeUrl).toContain('/email/unsubscribe');
  });

  it.each(KINDS)('%s renders with an empty payload («Send me a test»)', (kind) => {
    const m = renderDue({ ...base, kind, payload: { test: true }, first_name: null })!;
    expect(m).not.toBeNull();
    for (const part of [m.subject, m.html, m.text]) expect(part).not.toMatch(/undefined|null|NaN/);
  });

  it.each(KINDS)('%s follows the copy rules', (kind) => {
    const m = render(kind, PAYLOADS[kind]!);
    for (const part of [m.subject, m.html, m.text]) {
      expect(part).not.toContain('\u2014');
      expect(part).not.toMatch(/στοίχημα|απόδοση|ποντάρ|κέρδη|επίπεδο/i);
    }
  });

  it('streak_lost: the board texts', () => {
    const m = render('streak_lost', PAYLOADS.streak_lost!);
    expect(m.subject).toBe('Το σερί σου έσπασε στις 7 μέρες');
    expect(m.html).toContain('Ένα tap σήμερα και ξεκινάς νέο.');
    expect(m.html).toContain('ΤΟ ΣΕΡΙ ΣΟΥ');
    expect(m.html).toContain('7 μέρες. Πάμε για 8;');
    expect(m.html).toContain('Χθες δεν έπαιξες και δεν είχες Ασφάλεια.');
    expect(m.text).toContain('Το ρεκόρ σου είναι 12 μέρες και κανείς δεν σου το παίρνει. Μία ψήφος ή το quiz σήμερα και ξεκινάς νέο σερί.');
    expect(m.html).toContain('Ξεκίνα νέο σερί');
  });

  it('streak_milestone: 30 and 100', () => {
    const month = render('streak_milestone', { n: 30 });
    expect(month.subject).toBe('Ένας μήνας στη σειρά!');
    expect(month.text).toContain('Ένα ολόκληρο μήνα, κάθε μέρα. Το Frame «Μήνας» είναι ήδη στον Baller σου.');
    expect(month.html).toContain('μέρες στη σειρά!');
    expect(month.html).toContain('Δες το Frame');
    const hundred = render('streak_milestone', { n: 100 });
    expect(hundred.subject).toBe('Εκατό μέρες στη σειρά!');
    expect(hundred.text).toContain('Εκατό μέρες, κάθε μέρα. Το Frame «Εκατό» είναι ήδη στον Baller σου.');
  });

  it('streak_reminder_email: the push texts, σερί 1 too', () => {
    const m = render('streak_reminder_email', { n: 4 });
    expect(m.subject).toBe('Το σερί σου κινδυνεύει');
    expect(m.text).toContain('4 μέρες στη σειρά. Μία ψήφος ή το quiz και το κρατάς.');
    expect(render('streak_reminder_email', { n: 1 }).text).toContain('Ξεκίνησες σερί χθες. Παίξε και σήμερα να γίνει 2.');
  });
});

describe('the Monday σερί line', () => {
  it('the σερί and the days played last week', () => {
    expect(mondayStreakLines({ days: { n: 6, played: 6, frozen: [] } })).toEqual(['6 μέρες στη σειρά · 6 από 7 την περασμένη εβδομάδα']);
    expect(mondayStreakLines({ days: { n: 1, played: 1, frozen: [] } })).toEqual(['1 μέρα στη σειρά · 1 από 7 την περασμένη εβδομάδα']);
  });
  it('the days a freeze covered, with the right article', () => {
    expect(mondayStreakLines({ days: { n: 6, played: 6, frozen: ['2027-03-04'] } })).toEqual([
      '6 μέρες στη σειρά · 6 από 7 την περασμένη εβδομάδα',
      'Η Ασφάλεια κάλυψε την Πέμπτη.',
    ]);
    expect(mondayStreakLines({ days: { n: 5, played: 5, frozen: ['2027-03-01', '2027-03-06'] } })?.[1]).toBe(
      'Η Ασφάλεια κάλυψε τη Δευτέρα και το Σάββατο.',
    );
  });
  it('nothing while the daily σερί is off, and the Monday email shows the line when it is on', () => {
    expect(mondayStreakLines({})).toBeNull();
    const m = render('monday', { date: '2027-03-08', votes: 5, resolved: 4, correct: 3, streak: 6, days: { n: 6, played: 6, frozen: ['2027-03-04'] } });
    expect(m.text).toContain('6 μέρες στη σειρά · 6 από 7 την περασμένη εβδομάδα');
    expect(m.html).toContain('Η Ασφάλεια κάλυψε την Πέμπτη.');
    expect(render('monday', { date: '2027-03-08', votes: 5 }).text).not.toContain('στη σειρά');
  });
});
