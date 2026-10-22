import { describe, expect, it } from 'vitest';
import { el, en } from './content';
import { deleteAccount, privacy, support } from './legal';

/** every string on the site, flattened */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

const all = [...strings(el), ...strings(en), ...strings(privacy), ...strings(support), ...strings(deleteAccount)];
const greek = [...strings(el), ...strings(privacy.el), ...strings(support.el), ...strings(deleteAccount.el)];

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
  it('has dropped what the app no longer has', () => {
    const gone = /Για σένα|«For you»|Αναίρεση|\bUndo\b|lock-in|locked in/;
    expect(all.filter((s) => gone.test(s))).toEqual([]);
  });
});
