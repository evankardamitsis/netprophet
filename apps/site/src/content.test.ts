import { describe, expect, it } from 'vitest';
import { el, en } from './content';
import { deleteAccount, privacy, support, terms } from './legal';

/** every string on the site, flattened */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

const all = [...strings(el), ...strings(en), ...strings(privacy), ...strings(support), ...strings(deleteAccount), ...strings(terms)];
const greek = [...strings(el), ...strings(privacy.el), ...strings(support.el), ...strings(deleteAccount.el), ...strings(terms.el)];

describe('the site copy', () => {
  it('has no em dashes', () => {
    expect(all.filter((s) => s.includes('—'))).toEqual([]);
  });
  it('has no betting words', () => {
    const bad = /στοίχημα|στοιχημ|απόδοση|αποδόσεις|ποντάρ|κέρδη|\bbet(s|ting)?\b|\bodds\b|\bwager/i;
    expect(all.filter((s) => bad.test(s))).toEqual([]);
  });
  it('says level, never επίπεδο', () => {
    expect(greek.filter((s) => /επίπεδ/i.test(s))).toEqual([]);
  });
  it('writes Greek capitals without accents', () => {
    const caps = greek.filter((s) => s === s.toUpperCase() && /[Α-Ω]{3}/.test(s));
    expect(caps.filter((s) => /[ΆΈΉΊΌΎΏ]/.test(s))).toEqual([]);
  });
  it('has the same shape in both languages', () => {
    expect(en.questions.map((q) => q.points.length)).toEqual(el.questions.map((q) => q.points.length));
    expect(en.game.steps).toHaveLength(el.game.steps.length);
    expect(en.tournament.points).toHaveLength(el.tournament.points.length);
    expect(en.pro.items).toHaveLength(el.pro.items.length);
    expect(en.more.items).toHaveLength(el.more.items.length);
    expect(en.faq.items).toHaveLength(el.faq.items.length);
    expect(privacy.en.sections).toHaveLength(privacy.el.sections.length);
    expect(support.en.sections).toHaveLength(support.el.sections.length);
    expect(deleteAccount.en.sections).toHaveLength(deleteAccount.el.sections.length);
    expect(terms.en.sections).toHaveLength(terms.el.sections.length);
  });
  it('matches the app: Τουρνουά is the home tab, no Σήμερα tab', () => {
    expect(el.screens.tabBar).toEqual(['Τουρνουά', 'Αποτελέσματα', 'Κατάταξη', 'Εγώ']);
    expect(en.screens.tabBar).toHaveLength(4);
    expect(el.screens.home.title).toBe('Σήμερα');
  });
  it('says the home the way the app does', () => {
    const h = el.screens.home;
    expect(h.resultsTitle).toBe('3 αποτελέσματα από χθες');
    expect(h.resultsBtn).toBe('Δες τα ›');
    expect([h.yours, h.quizTitle, h.vote, h.tournaments, h.playing, h.addMatch]).toEqual([
      'Οι δικοί σου',
      'Quiz της ημέρας',
      'Ψήφισε σήμερα',
      'Τουρνουά σήμερα',
      'Παίζεις',
      '+ Ματς',
    ]);
    expect(el.screens.tournament.tabs).toEqual(['Σήμερα', 'Ταμπλό', 'Πρόγραμμα']);
    expect(el.screens.tournament.ifWins).toBe('Αν κερδίσει');
  });
  it('has the hold section the founder wrote, and says it once', () => {
    expect(el.hold.eyebrow).toBe('ΚΡΑΤΑ ΠΑΤΗΜΕΝΟ');
    expect(el.hold.title).toBe('Κράτα πατημένο ένα όνομα.');
    expect(el.hold.lines[0]).toBe('Βλέπεις την πορεία του παίκτη σε όλο το τουρνουά, σε κάθε κατηγορία που παίζει, και ποιον θα βρει αν κερδίσει.');
    expect(el.hold.lines[1]).toBe('Σήμερα, Ταμπλό και Πρόγραμμα, ένα πάτημα μακριά. Ακολούθησε ένα τουρνουά και μαθαίνεις δωρεάν για την κλήρωση και τον τελικό.');
    expect(en.hold.lines).toHaveLength(2);
    expect(en.hold.title).not.toBe('');
    // the tournament section no longer carries a bullet about the hold
    expect(el.tournament.points.filter((p) => /πατημένο/.test(p))).toEqual([]);
    expect(en.tournament.points.filter((p) => /Hold a name/.test(p))).toEqual([]);
  });
  it('draws the player run like the app: held category open, the others closed, won rounds ticked', () => {
    const p = el.screens.player;
    expect(p.name).toBe('Φορχάντης');
    expect(p.held).toBe('Διπλό Ανδρών 45+ με τον Ρήγα');
    expect(p.other).toBe('Μονό Ανδρών 45+');
    expect(p.ifWins).toMatch(/^Αν κερδίσει/);
    expect(p.rows.length).toBeGreaterThan(0);
    expect(en.screens.player.rows).toHaveLength(p.rows.length);
  });
  it('shows the home as the app does: PRO pill, strip, dates and retirements', () => {
    expect(el.screens.proPill).toBe('PRO');
    expect(el.screens.home.all).toBe('Όλα ›');
    expect(el.screens.home.more).toBe('Περισσότερα ›');
    expect(el.screens.home.proBtn).toBe('Δες τον με Pro ›');
    expect(el.screens.results.retired).toBe('ret');
    expect(strings(el.screens).filter((x) => /χωρίς ώρα/.test(x))).toEqual([]);
  });
  it('states the Pro prices and never sells advantage', () => {
    const text = strings(el).join(' ');
    expect(text).toContain('8,99€');
    expect(text).toContain('69,99€');
    expect(text).toContain('49,99€');
    expect(text).toContain('31/12');
    expect(text).toContain('7 μέρες δωρεάν');
    expect(text).toMatch(/Δεν αγοράζει/);
    const enText = strings(en).join(' ');
    expect(enText).toContain('€69.99');
    expect(enText).toContain('€49.99');
  });
  it('has terms that say what NetProphet is, the age rule, the publisher and the Pro terms', () => {
    const el = strings(terms.el).join(' ');
    const en = strings(terms.en).join(' ');
    for (const [text, street, first, then] of [
      [el, 'Αμφικτυόνων 28', '49,99€', '69,99€'],
      [en, 'Amfiktyonon 28', '€49.99', '€69.99'],
    ] as const) {
      expect(text).toContain('MONAD LABS');
      expect(text).toContain(street);
      expect(text).toContain('hello@monadlabs.gr');
      expect(text).toContain(first);
      expect(text).toContain(then);
      expect(text).toContain('31');
      expect(text).toMatch(/15/);
      expect(text).toMatch(/24/);
    }
    expect(el).toMatch(/Αθηνών/);
    expect(en).toMatch(/Athens/);
    expect(el).toMatch(/δεν αγοράζονται/);
    expect(en).toMatch(/cannot be bought/);
  });
  it('links every site page to the terms, and names RevenueCat and sponsored banners in the privacy text', () => {
    expect(el.nav.terms).toBe('Όροι χρήσης');
    expect(en.nav.terms).toBe('Terms of use');
    for (const l of ['el', 'en'] as const) {
      const text = strings(privacy[l]).join(' ');
      expect(text).toContain('RevenueCat');
      expect(text).toMatch(/SDK/);
    }
    expect(strings(support.el).join(' ')).toContain('netprophetapp.com/terms');
    expect(strings(support.en).join(' ')).toContain('netprophetapp.com/en/terms');
  });
  it('says the founding plan is 49,99 for the first year, then 69,99 (founder, 22 Oct)', () => {
    expect(strings(el).join(' ')).toContain('49,99€ τον πρώτο χρόνο, μετά 69,99€');
    expect(strings(en).join(' ')).toContain('€49.99 for the first year, then €69.99');
    expect(strings(el).join(' ')).not.toMatch(/49,99€ τον χρόνο/);
    expect(strings(en).join(' ')).not.toMatch(/€49\.99 a year/);
    const help = JSON.stringify(support.el) + JSON.stringify(support.en);
    expect(help).toContain('49,99€ τον πρώτο χρόνο και μετά 69,99€');
    expect(help).toContain('renews automatically');
  });
  it('has dropped what the app no longer has', () => {
    const gone = /Για σένα|«For you»|Αναίρεση|\bUndo\b|lock-in|locked in/;
    expect(all.filter((s) => gone.test(s))).toEqual([]);
  });
});
