import { describe, expect, it } from 'vitest';
import type { Draw } from './draw';
import type { SheetMatch } from './oop';
import { roundFromLabel, roundsFromDraws } from './rounds';

const person = (surname: string) => ({ surname, first: '', key: surname }) as SheetMatch['players']['side1'][number];
const row = (a: string, b: string, extra: Partial<SheetMatch> = {}) =>
  ({ discipline: 'MS', level: '40+', players: { side1: [person(a)], side2: [person(b)] }, ...extra }) as SheetMatch;
const slot = (side1: string | null, side2: string | null, bye = false) => ({ side1, side2, bye });
const draw = {
  format: 'knockout',
  discipline: 'MS',
  level: '40+',
  rounds: [
    [slot('ΑΛΦΑ Γ.', 'ΒΗΤΑ Ν.'), slot('ΓΑΜΜΑ', 'ΔΕΛΤΑ'), slot('ΖΗΤΑ', 'ΗΤΑ'), slot('ΘΗΤΑ', null, true)],
    [slot('ΑΛΦΑ Γ.', 'ΓΑΜΜΑ'), slot('ΖΗΤΑ', 'ΘΗΤΑ')],
    [slot('ΑΛΦΑ Γ.', 'ΖΗΤΑ')],
  ],
} as unknown as Draw;

describe('roundFromLabel', () => {
  it('knows the labels of the sources', () => {
    expect(roundFromLabel('Round of 32')).toBe('round32');
    expect(roundFromLabel('Round of 16')).toBe('round16');
    expect(roundFromLabel('Quarter final')).toBe('quarter');
    expect(roundFromLabel('Semi-final')).toBe('semi');
    expect(roundFromLabel('Semi final')).toBe('semi');
    expect(roundFromLabel('Final')).toBe('final');
    expect(roundFromLabel('ΗΜΙΤΕΛΙΚΟΣ')).toBe('semi');
    expect(roundFromLabel('Προημιτελικός')).toBe('quarter');
    expect(roundFromLabel('ΤΕΛΙΚΟΣ')).toBe('final');
  });

  it('leaves what says nothing for sure', () => {
    expect(roundFromLabel('Round 1')).toBeNull();
    expect(roundFromLabel('6-4 6-2')).toBeNull();
    expect(roundFromLabel('')).toBeNull();
    expect(roundFromLabel(undefined)).toBeNull();
  });
});

describe('roundsFromDraws', () => {
  it('counts from the last round of the draw', () => {
    const [f, s, q] = roundsFromDraws([row('ΑΛΦΑ', 'ΖΗΤΑ'), row('ΓΑΜΜΑ', 'ΑΛΦΑ'), row('ΓΑΜΜΑ', 'ΔΕΛΤΑ')], [draw]);
    expect(f!.round).toBe('final');
    expect(s!.round).toBe('semi');
    expect(q!.round).toBe('quarter');
  });

  it('keeps what the source said, and never guesses', () => {
    expect(roundsFromDraws([row('ΑΛΦΑ', 'ΖΗΤΑ', { round: 'semi' })], [draw])[0]!.round).toBe('semi');
    expect(roundsFromDraws([row('ΑΛΦΑ', 'ΔΕΛΤΑ')], [draw])[0]!.round).toBeUndefined();
    expect(roundsFromDraws([row('ΑΛΦΑ', 'ΖΗΤΑ', { level: '50+' })], [draw])[0]!.round).toBeUndefined();
  });
});
