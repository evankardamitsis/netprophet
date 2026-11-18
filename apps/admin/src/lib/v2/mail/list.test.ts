import { describe, expect, it } from 'vitest';
import { renderDue, type DueEmail } from './index';
import { LAUNCH_FEATURES, launchEmail, sideName } from './list';

const TOKEN = '11111111-2222-3333-4444-555555555555';
const base: DueEmail = {
  id: '00000000-0000-0000-0000-000000000002',
  kind: 'site_confirm',
  group: 'list',
  to: 'anna@example.com',
  payload: { subscriber_id: '99999999-0000-0000-0000-000000000000' },
  first_name: null,
  gender: null,
  lang: 'el',
  unsubscribe_token: TOKEN,
};

const WEEK = {
  played: 148,
  upsets: 12,
  titles_count: 3,
  upset: {
    tournament: 'Open Γλυφάδας',
    round: 'quarter',
    winner: [{ first: 'ΛΕΩΝΙΔΑΣ', surname: 'ΠΕΥΚΑΚΟΣ' }],
    loser: [{ first: 'Μάριος', surname: 'Ρεματάς' }],
    sets: [{ w: 4, l: 6 }, { w: 6, l: 3 }, { w: 7, l: 5 }],
    pct: 31,
    votes: 42,
  },
  titles: [
    { tournament: 'Taf Open', category: '40+', round: 'final', winner: [{ first: 'Φώτης', surname: 'Συμεωνίδης' }], loser: [{ first: 'Πάνος', surname: 'Κουμιτζέλης' }], sets: [{ w: 6, l: 2 }, { w: 6, l: 4 }] },
  ],
  next: 22,
  next_tournament: 'Athens Tennis',
  next_tournament_n: 22,
};

const all = () => [
  renderDue(base)!,
  renderDue({ ...base, lang: 'en' })!,
  renderDue({ ...base, kind: 'site_weekly', payload: WEEK })!,
  renderDue({ ...base, kind: 'site_weekly', payload: WEEK, lang: 'en' })!,
  renderDue({ ...base, kind: 'site_weekly', payload: { played: 5 } })!,
  launchEmail(),
];

describe('the website list emails', () => {
  it('are registered with the other kinds', () => {
    for (const kind of ['site_confirm', 'site_weekly', 'launch_v1', 'welcome']) expect(renderDue({ ...base, kind })).not.toBeNull();
  });

  it('follow the copy rules: no em dash, no betting words, no επίπεδο', () => {
    for (const m of all()) {
      for (const part of [m.subject, m.html, m.text]) {
        expect(part).not.toContain('—');
        expect(part).not.toMatch(/στοίχημα|στοιχημ|απόδοση|ποντάρ|κέρδη|επίπεδ|\bbet(s|ting)?\b|\bodds\b/i);
      }
    }
  });

  it('site_confirm: one button to the confirm page with the token, and the list unsubscribe', () => {
    const m = renderDue(base)!;
    expect(m.subject).toBe('Ένα tap ακόμα');
    expect(m.html).toContain(`/email/confirm?t=${TOKEN}`);
    expect(m.html).toContain('Ναι, θέλω τα αποτελέσματα');
    expect(m.html).toContain('Αγνόησέ το');
    expect(m.unsubscribeUrl).toBe(`https://www.netprophetapp.com/email/unsubscribe?t=${TOKEN}&k=list`);
    const en = renderDue({ ...base, lang: 'en' })!;
    expect(en.subject).toBe('One more tap');
    expect(en.html).toContain(`/email/confirm?t=${TOKEN}&amp;l=en`);
    expect(en.unsubscribeUrl).toContain('&k=list&l=en');
  });

  it('site_weekly: the upset leads, with names, score and how few saw it', () => {
    const m = renderDue({ ...base, kind: 'site_weekly', payload: WEEK })!;
    expect(m.subject).toBe('Μόνο το 31% το είδε να έρχεται');
    expect(m.html).toContain('Η ανατροπή της εβδομάδας');
    expect(m.html).toContain('148 ματς, 12 ανατροπές, 3 τίτλοι.');
    expect(m.html).toContain('Πευκακος Λ.');
    expect(m.html).toContain('4-6, 6-3, 7-5 · Μόνο το 31% το είδε να έρχεται');
    expect(m.html).toContain('Open Γλυφάδας · Προημιτελικά');
    expect(m.html).toContain('Taf Open · 40+ · Τελικός');
    expect(m.html).toContain('22 ματς στο Athens Tennis.');
    expect(m.text).toContain('✓ Συμεωνίδης Φ.');
  });

  it('site_weekly in English: Latin names', () => {
    const m = renderDue({ ...base, kind: 'site_weekly', payload: WEEK, lang: 'en' })!;
    expect(m.subject).toBe('Only 31% saw it coming');
    expect(m.html).not.toMatch(/Συμεωνίδης/);
    expect(m.html).toContain('22 matches at Athens Tennis.');
  });

  it('site_weekly drops every line without data', () => {
    const m = renderDue({ ...base, kind: 'site_weekly', payload: { played: 5 } })!;
    expect(m.subject).toBe('5 ματς την περασμένη εβδομάδα');
    expect(m.html).not.toContain('ΑΝΑΤΡΟΠΗ');
    expect(m.html).not.toContain('ΤΙΤΛΟΣ');
    expect(m.html).not.toContain('Αυτή την εβδομάδα');
    expect(m.html).not.toContain('undefined');
    const next = renderDue({ ...base, kind: 'site_weekly', payload: { next: 9, next_tournament: 'Taf Open', next_tournament_n: 6 } })!;
    expect(next.subject).toBe('Τι έρχεται αυτή την εβδομάδα');
    expect(next.html).toContain('9 ματς, τα περισσότερα στο Taf Open.');
  });

  it('escapes what comes from the database', () => {
    const m = renderDue({
      ...base,
      kind: 'site_weekly',
      payload: { ...WEEK, upset: { ...WEEK.upset, tournament: '<script>x</script>', winner: [{ first: 'A', surname: '<b>"Bad"</b>' }] } },
    })!;
    expect(m.html).not.toContain('<script>');
    expect(m.html).not.toContain('<b>"Bad"');
    expect(m.html).toContain('&lt;script&gt;');
  });

  it('names a pair as two short names', () => {
    expect(sideName([{ first: 'Νίκος', surname: 'Παπαχρήστος' }, { first: 'Μαρία', surname: 'Λάππα' }], 'el')).toBe('Παπαχρήστος Ν. & Λάππα Μ.');
  });

  it('launch_v1: the founder’s line, six features with app screens from the site, Resend’s unsubscribe', () => {
    const m = launchEmail();
    expect(m.subject).toBe('Το NetProphet άλλαξε. Έλα να το ανακαλύψεις.');
    expect(m.html).toContain('Δεν πιστεύω να νόμιζες ότι σταματήσαμε. Ίσα ίσα, το φτιάξαμε όλο από την αρχή και τώρα είναι έτοιμο να το κατεβάσεις.');
    expect(LAUNCH_FEATURES).toHaveLength(6);
    for (const [img] of LAUNCH_FEATURES) expect(m.html).toContain(`https://www.netprophetapp.com/email/screens/${img}.jpg`);
    expect(m.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(m.text).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(m.html).toContain('/email/art/launch.png');
  });
});
