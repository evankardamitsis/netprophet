import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetMyLevelResult } from '@netprophet/db';
import { mockLook } from '../mock/look';
import { buySheetOf, ctaOf, eur, findTile, hasNewLook, levelBackOf, previewOf, tagOf, tileName, tilesFor, withWorn } from './look';

const t = getCopy('el');
const look = mockLook();
const tile = (tab: 'frame' | 'background' | 'kit', key: string | null) => findTile(look, tab, key);

describe('tiles', () => {
  it('frames and backgrounds start with the «Χωρίς …» tile, kits do not', () => {
    expect(tilesFor(look, 'frame')[0]).toMatchObject({ key: null, item: null });
    expect(tileName(tilesFor(look, 'frame')[0]!, t)).toBe('Χωρίς frame');
    expect(tileName(tilesFor(look, 'background')[0]!, t)).toBe('Χωρίς φόντο');
    expect(tilesFor(look, 'kit')[0]!.key).toBe('kit_black');
    expect(tilesFor(look, 'kit')).toHaveLength(6);
    // gear and the win effect start with «Χωρίς …» too
    expect(tileName(tilesFor(look, 'gear')[0]!, t)).toBe('Χωρίς αξεσουάρ');
    expect(tileName(tilesFor(look, 'win_effect')[0]!, t)).toBe('Χωρίς πανηγυρισμό');
  });
  it('finds the worn tile by default', () => {
    expect(findTile(look, 'background', undefined).key).toBe('bg_night');
    expect(findTile(look, 'frame', undefined).key).toBeNull();
    expect(findTile(look, 'kit', undefined).key).toBe('kit_green');
  });
});

describe('tags', () => {
  it('free, earned, price and the earn rule', () => {
    expect(tagOf(tile('kit', 'kit_green'), t)).toEqual({ text: 'Δωρεάν', tone: 'free' });
    expect(tagOf(tile('kit', 'kit_white'), t)).toEqual({ text: '0,99€', tone: 'price' });
    expect(tagOf(tile('frame', 'frame_seven'), t)).toEqual({ text: 'Το κέρδισες', tone: 'earned' });
    expect(tagOf(tile('frame', 'frame_gold'), t)).toEqual({ text: '1,99€', tone: 'price' });
    expect(tagOf(tile('background', 'bg_hard'), t)).toEqual({ text: '0,99€', tone: 'price' });
    expect(tagOf(tile('frame', 'frame_ten'), t)).toEqual({ text: 'Το κερδίζεις με 10 σωστές στη σειρά', tone: 'locked' });
    expect(tagOf(tile('frame', null), t)).toBeNull();
  });
  it('an earned item is never for sale: what earns it until it is yours, then «Το κέρδισες»', () => {
    const earned = look.items.filter((i) => i.kind === 'earned');
    expect(earned.length).toBeGreaterThan(0);
    for (const item of earned) {
      const tl = { category: item.category, key: item.key, item };
      const tag = tagOf(tl, t)!;
      const cta = ctaOf(tl, look, t);
      if (item.owned) {
        expect(tag).toEqual({ text: 'Το κέρδισες', tone: 'earned' });
        expect(['wear', 'worn']).toContain(cta.kind);
      } else {
        expect(tag).toEqual({ text: item.earn_rule, tone: 'locked' });
        expect(item.earn_rule).toBeTruthy();
        expect(cta).toEqual({ kind: 'none' });
      }
    }
    // even if a price slipped onto an earned item, it still shows the way to earn it, never a buy button
    const priced = { ...earned.find((i) => !i.owned)!, price_eur: 1.99 };
    expect(tagOf({ category: priced.category, key: priced.key, item: priced }, t)!.tone).toBe('locked');
    expect(ctaOf({ category: priced.category, key: priced.key, item: priced }, look, t)).toEqual({ kind: 'none' });
  });
  it('formats euros with a comma', () => {
    expect(eur(1.99)).toBe('1,99');
    expect(eur(0.99)).toBe('0,99');
  });
});

describe('the button', () => {
  it('worn, wear, buy, and nothing for an earned item that is not yours', () => {
    expect(ctaOf(tile('background', 'bg_night'), look, t)).toEqual({ kind: 'worn' });
    expect(ctaOf(tile('background', 'bg_clay'), look, t)).toEqual({ kind: 'wear' });
    expect(ctaOf(tile('frame', null), look, t)).toEqual({ kind: 'worn' });
    expect(ctaOf(tile('background', null), look, t)).toEqual({ kind: 'wear' });
    expect(ctaOf(tile('frame', 'frame_gold'), look, t)).toEqual({ kind: 'buy', label: 'Αγόρασε · 1,99 €' });
    expect(ctaOf(tile('kit', 'kit_clay'), look, t)).toEqual({ kind: 'buy', label: 'Αγόρασε · 1,99 €' });
    expect(ctaOf(tile('frame', 'frame_week'), look, t)).toEqual({ kind: 'none' });
  });
  it('the buy sheet: words and price, per kind', () => {
    const gold = look.items.find((i) => i.key === 'frame_gold')!;
    expect(buySheetOf(gold, t)).toMatchObject({ title: 'Κορνίζα Χρυσό', price: '1,99 €', note: 'Μόνο στυλ. Δεν δείχνει πόσο καλός είσαι.' });
    const hard = look.items.find((i) => i.key === 'bg_hard')!;
    expect(buySheetOf(hard, t)).toMatchObject({ title: 'Φόντο Σκληρό γήπεδο', price: '0,99 €' });
    const pack = look.items.find((i) => i.key === 'kit_grass')!;
    expect(buySheetOf(pack, t)?.title).toBe('Ρούχα & ρακέτα');
    expect(buySheetOf(look.items.find((i) => i.key === 'frame_ten')!, t)).toBeNull();
  });
});

describe('wearing', () => {
  it('puts on and takes off, and keeps the flags in step', () => {
    const on = withWorn(look, 'frame', 'frame_seven');
    expect(on.equipped.frame).toBe('frame_seven');
    expect(on.items.filter((i) => i.category === 'frame' && i.equipped).map((i) => i.key)).toEqual(['frame_seven']);
    expect(on.equipped.background).toBe('bg_night');
    const off = withWorn(on, 'background', null);
    expect(off.equipped.background).toBeNull();
    expect(off.items.some((i) => i.category === 'background' && i.equipped)).toBe(false);
  });
  it('the preview shows the picked tile and the rest as worn', () => {
    expect(previewOf(look, 'frame', 'frame_gold')).toEqual({ frame: 'frame_gold', background: 'bg_night', kit: 'kit_green', gear: null, effect: null });
    expect(previewOf(look, 'background', null)).toEqual({ frame: null, background: null, kit: 'kit_green', gear: null, effect: null });
    expect(previewOf(look, 'gear', 'gear_cap')).toMatchObject({ gear: 'gear_cap', kit: 'kit_green' });
    expect(previewOf(look, 'kit', 'kit_clay').kit).toBe('kit_clay');
  });
  it('«Νέο» while something owned has not been seen', () => {
    expect(hasNewLook(look, new Set())).toBe(true);
    expect(hasNewLook(look, new Set(['frame_seven', 'bg_night', 'bg_clay']))).toBe(false);
    expect(hasNewLook(null, new Set())).toBe(false);
  });
});

describe('the back of the card', () => {
  const free: GetMyLevelResult = { claimed: true, pro: false, status: 'active', tier: 4, direction: 'up', matches: 7, votes: 23, value: null, week_ago: null, to_next: null, next_tier: 4.5 };
  it('free: the level and the counts, no value', () => {
    expect(levelBackOf(free, t)).toEqual({
      state: 'active', level: '4', arrow: '↑', word: 'Ανεβαίνεις', counts: '7 ματς · 23 ψήφοι', pro: false, value: null, toNext: null,
    });
  });
  it('Pro: the exact value and the gap to the next half', () => {
    const b = levelBackOf({ ...free, pro: true, tier: 4, value: 4.23, to_next: 0.27, next_tier: 4.5 }, t)!;
    expect(b.value).toBe('4,23');
    expect(b.toNext).toBe('Ως το level 4,5: +0,27');
  });
  it('pending: the crowd decides; one vote is singular', () => {
    const b = levelBackOf({ claimed: true, pro: false, status: 'pending', tier: null, direction: 'same', matches: 1, votes: 1, value: null, week_ago: null, to_next: null, next_tier: null }, t)!;
    expect(b.state).toBe('pending');
    expect(b.counts).toBe('1 ματς · 1 ψήφος');
    expect(levelBackOf({ claimed: false, pro: false }, t)?.state).toBe('pending');
    expect(levelBackOf(null, t)).toBeNull();
  });
});
