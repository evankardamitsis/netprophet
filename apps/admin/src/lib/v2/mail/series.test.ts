import { describe, expect, it } from 'vitest';
import { renderDue, type DueEmail } from './index';

const base: DueEmail = {
  id: '00000000-0000-0000-0000-000000000002',
  kind: 'day1_vote',
  group: 'game',
  to: 'nikos@example.com',
  payload: {},
  first_name: 'Νίκος',
  gender: null,
  lang: 'el',
  unsubscribe_token: '11111111-2222-3333-4444-555555555555',
};

const match = { date: '2027-03-11', time: '17:00', a: 'Γιώργος Μέμμος', b: 'Ηλίας Λάππας', tournament: 'Athens Tennis' };
const result = { date: '2027-03-05', winner: 'Σπύρος Σαπουντζής', loser: 'Παύλος Κλαμπάνης', score: '2-1', walkover: false, tournament: 'Taf Open' };

/** a payload like the one core.email_series_sweep writes, per kind */
const PAYLOADS: Record<string, Record<string, unknown>> = {
  day1_vote: { open: 14, matches: [match, { ...match, time: null, tournament: null }] },
  day3_follow: { players: [{ name: 'Γιώργος Μέμμος', matches: 12 }, { name: 'Ηλίας Μέμμος', matches: 0 }] },
  day7_week: { votes: 15, resolved: 14, correct: 9, streak: 4, points: 1210, ladder: { tier: 'bronze', place: 6, size: 20 } },
  day14_missed: {
    upsets: 3,
    upset_list: [{ ...result, share: 18 }],
    followed: [{ ...result, winner: 'Γιώργος Μέμμος', loser: 'Σπύρος Βλάσσης', score: '2-0', player: 'Γιώργος Μέμμος', won: true }],
  },
  monday: { date: '2027-03-08', votes: 17, resolved: 16, correct: 11, streak: 6, ladder: { tier: 'silver', place: 4, size: 20 }, followed: [match] },
  month_close: { month: '2026-11', tier: 'silver', place: 5, size: 20, points: 140, outcome: 'promoted', next_tier: 'gold', next_month: '2026-12' },
  away30: { days: 30, near: true, tournaments: 2, matches: 1312 },
};
const KINDS = Object.keys(PAYLOADS);

describe('the series and the weekly emails', () => {
  it.each(KINDS)('%s renders with a subject, html, text and the open-app button', (kind) => {
    const m = renderDue({ ...base, kind, payload: PAYLOADS[kind]! });
    expect(m).not.toBeNull();
    expect(m!.subject.length).toBeGreaterThan(5);
    expect(m!.html).toContain('<!doctype html>');
    expect(m!.html).toContain('https://www.netprophetapp.com/open');
    expect(m!.text).toContain('https://www.netprophetapp.com/open');
  });

  it.each(KINDS)('%s renders with an empty payload («Send me a test»)', (kind) => {
    const m = renderDue({ ...base, kind, payload: { player_name: 'Νίκος Παπαχρήστος', test: true }, first_name: null });
    expect(m).not.toBeNull();
    expect(m!.html).not.toMatch(/undefined|null|NaN/);
    expect(m!.text).not.toMatch(/undefined|null|NaN/);
  });

  it.each(KINDS)('%s follows the copy rules: no em dash, no betting words, no gendered place', (kind) => {
    const m = renderDue({ ...base, kind, payload: PAYLOADS[kind]! })!;
    for (const part of [m.subject, m.html, m.text]) {
      expect(part).not.toContain('—');
      expect(part).not.toMatch(/στοίχημα|απόδοση|ποντάρ|κέρδη|επίπεδο/i);
      expect(part).not.toMatch(/\d+ο[ςυ]?(?!\p{L})/u);
    }
  });

  it.each(KINDS)('%s is a game email with the one-click unsubscribe link', (kind) => {
    const m = renderDue({ ...base, kind, payload: PAYLOADS[kind]! })!;
    expect(m.unsubscribeUrl).toBe('https://www.netprophetapp.com/email/unsubscribe?t=11111111-2222-3333-4444-555555555555');
    expect(m.html).toContain('Διαγραφή');
  });

  it.each(KINDS)('%s has one blue button', (kind) => {
    const m = renderDue({ ...base, kind, payload: PAYLOADS[kind]! })!;
    expect(m.html.match(/padding:14px 28px/g)?.length).toBe(1);
  });

  it('formats numbers the Greek way', () => {
    expect(renderDue({ ...base, kind: 'day7_week', payload: PAYLOADS.day7_week! })!.html).toContain('1.210');
    expect(renderDue({ ...base, kind: 'away30', payload: PAYLOADS.away30! })!.text).toContain('1.312 ματς παίχτηκαν από τότε.');
  });

  it('escapes names from the database', () => {
    const evil = 'Α & <b>Β</b>';
    for (const [kind, payload] of [
      ['day1_vote', { open: 1, matches: [{ ...match, a: evil }] }],
      ['day3_follow', { players: [{ name: evil, matches: 1 }] }],
      ['day14_missed', { upsets: 1, upset_list: [{ ...result, winner: evil, share: 10 }], followed: [] }],
      ['monday', { followed: [{ ...match, b: evil }] }],
    ] as const) {
      const m = renderDue({ ...base, kind, payload: payload as Record<string, unknown> })!;
      expect(m.html).toContain('Α &amp; &lt;b&gt;Β&lt;/b&gt;');
      expect(m.html).not.toContain('<b>Β</b>');
    }
  });

  it('day1 counts the matches open today', () => {
    const m = renderDue({ ...base, kind: 'day1_vote', payload: PAYLOADS.day1_vote! })!;
    expect(m.subject).toBe('Σήμερα παίζονται 14 ματς. Ποιος το παίρνει;');
    expect(m.html).toContain('17:00 · ATHENS TENNIS');
    expect(m.html).toContain('Γιώργος Μέμμος - Ηλίας Λάππας');
  });

  it('day7 says how many places from a medal, without a gendered ordinal', () => {
    const m = renderDue({ ...base, kind: 'day7_week', payload: PAYLOADS.day7_week! })!;
    expect(m.subject).toBe('Η πρώτη σου εβδομάδα: 9 στις 14');
    expect(m.html).toContain('Είσαι 3 θέσεις από μετάλλιο.');
    expect(m.html).toContain('Είσαι στη θέση 6.');
    expect(m.html).toContain('Χάλκινη · 20 παίκτες');
  });

  it('day14 tells the upsets and the followed players', () => {
    const m = renderDue({ ...base, kind: 'day14_missed', payload: PAYLOADS.day14_missed! })!;
    expect(m.subject).toBe('Όσο έλειπες: 3 ανατροπές');
    expect(m.html).toContain('Μόνο το 18% το είδε');
    expect(m.html).toContain('Γιώργος Μέμμος: νίκη');
  });

  it('monday shows the week, the place as «4η» and the day of each match', () => {
    const m = renderDue({ ...base, kind: 'monday', payload: PAYLOADS.monday! })!;
    expect(m.subject).toBe('11 στις 16. Καλή εβδομάδα!');
    expect(m.html).toContain('ΔΕΥΤΕΡΑ · 8/3');
    expect(m.html).toContain('4η');
    expect(m.html).toContain('ΠΕΜΠΤΗ · 17:00');
  });

  it('month_close gives the place and the next Κατηγορία, never a medal', () => {
    const m = renderDue({ ...base, kind: 'month_close', payload: PAYLOADS.month_close! })!;
    expect(m.subject).toBe('Ο Νοέμβριος έκλεισε: θέση 5 από 20');
    expect(m.text).toContain('Ανεβαίνεις! Τον Δεκέμβριο παίζεις στη Χρυσή ↑.');
    expect(m.html).not.toMatch(/μετάλλιο/);
    const silver = renderDue({ ...base, kind: 'month_close', payload: { ...PAYLOADS.month_close!, outcome: 'stayed', next_tier: 'silver' } })!;
    expect(silver.text).toContain('Τον Δεκέμβριο μένεις στην Ασημένια.');
  });

  it('away30 greets by name and promises not to write again', () => {
    const m = renderDue({ ...base, kind: 'away30', payload: PAYLOADS.away30! })!;
    expect(m.subject).toBe('Πάει καιρός, Νίκο');
    expect(m.text).toContain('2 νέα τουρνουά ξεκίνησαν κοντά σου.');
    expect(m.text).toContain('Δεν θα σου ξαναγράψουμε');
  });
});
