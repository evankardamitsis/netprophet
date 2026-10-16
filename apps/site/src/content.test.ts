import { describe, expect, it } from 'vitest';
import { el, en } from './content';
import { privacy, support } from './legal';

/** every string on the site, flattened */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

const all = [...strings(el), ...strings(en), ...strings(privacy), ...strings(support)];
const greek = [...strings(el), ...strings(privacy.el), ...strings(support.el)];

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
    expect(en.feed.points).toHaveLength(el.feed.points.length);
    expect(en.pro.items).toHaveLength(el.pro.items.length);
    expect(en.more.items).toHaveLength(el.more.items.length);
    expect(en.faq.items).toHaveLength(el.faq.items.length);
    expect(privacy.en.sections).toHaveLength(privacy.el.sections.length);
    expect(support.en.sections).toHaveLength(support.el.sections.length);
  });
});
