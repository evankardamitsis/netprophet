import { describe, expect, it } from 'vitest';
import type { PlayerTraits } from '@netprophet/db';
import { applyTraitVote, barWidth, cleanLabel, hasVoted, mockPlayerTraits, shareWidth, shownTraits, splitTraits, topCount, traitErrorKind, traitGender, traitLabel } from './traits';

const sample = (): PlayerTraits => mockPlayerTraits('p1', 'f');

describe('traits', () => {
  it('words the phrase by gender, English has one form', () => {
    const row = sample().traits[4]!;
    expect(traitLabel(row, 'm')).toBe('Φωνάζει στον εαυτό του');
    expect(traitLabel(row, 'f')).toBe('Φωνάζει στον εαυτό της');
    expect(traitLabel(row, 'f', 'en')).toBe('Talks to themselves');
  });

  it('takes the known gender, else guesses from the first name', () => {
    expect(traitGender('f', 'Νίκος')).toBe('f');
    expect(traitGender(null, 'Μαρία')).toBe('f');
    expect(traitGender(null, 'Νίκος')).toBe('m');
  });

  it('sizes the bars against the top count plus one', () => {
    expect(barWidth(23, 23)).toBe(96);
    expect(barWidth(3, 23)).toBe(13);
    expect(barWidth(0, 0)).toBe(0);
    expect(barWidth(5, 0)).toBe(100);
    expect(topCount(sample().traits)).toBe(23);
    expect(shareWidth(0.7)).toBe(70);
    expect(shareWidth(1.4)).toBe(100);
  });

  it('moves the count with my tap, both ways, once', () => {
    const on = applyTraitVote(sample(), 'mock-4', true);
    expect(on.traits[3]).toMatchObject({ mine: true, count: 10 });
    expect(hasVoted(on)).toBe(true);
    expect(applyTraitVote(on, 'mock-4', true).traits[3]!.count).toBe(10);
    const off = applyTraitVote(on, 'mock-4', false);
    expect(off.traits[3]).toMatchObject({ mine: false, count: 9 });
    expect(hasVoted(off)).toBe(false);
  });

  it('keeps my pending phrases apart and untouched by taps', () => {
    const p = sample();
    p.traits.push({ id: 'x', label_el: { m: 'Drop shot', f: 'Drop shot' }, label_en: 'Drop shot', count: null, mine: true, pending: true });
    const { shown, pending } = splitTraits(p.traits);
    expect(shown).toHaveLength(6);
    expect(pending.map((x) => x.id)).toEqual(['x']);
    expect(applyTraitVote(p, 'x', false)).toEqual(p);
    expect(hasVoted(p)).toBe(false);
  });

  it('cleans the typed phrase like the database', () => {
    expect(cleanLabel('  Παίζει   πολύ drop shot ')).toBe('Παίζει πολύ drop shot');
    expect(cleanLabel('ab')).toBeNull();
    expect(cleanLabel('x'.repeat(41))).toBeNull();
    expect(cleanLabel('x'.repeat(40))).not.toBeNull();
  });

  it('maps the database errors', () => {
    expect(traitErrorKind('not_allowed')).toBe('not_allowed');
    expect(traitErrorKind('rate_limited')).toBe('rate_limited');
    expect(traitErrorKind('too_many_pending')).toBe('too_many_pending');
    expect(traitErrorKind('not_played')).toBe('failed');
    expect(traitErrorKind('weird')).toBe('failed');
  });

  it('shows every phrase to tap, but only what people said to someone who cannot vote: never a row of zeros', () => {
    const p = sample();
    const withZero = { ...p, traits: [...p.traits, { ...p.traits[0]!, id: 'zero', count: 0 }] };
    expect(shownTraits(withZero).map((r) => r.id)).toContain('zero');
    expect(shownTraits({ ...withZero, can_vote: false }).map((r) => r.id)).not.toContain('zero');
    expect(shownTraits({ ...withZero, can_vote: false })).toHaveLength(6);
  });
});
