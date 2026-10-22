import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { categoryCase, resultStrip, type CardResult } from './feed';

const t = getCopy('el');

describe('categoryCase', () => {
  it('turns an organiser sheet\'s capitals into a normal case', () => {
    expect(categoryCase('MEDIUM')).toBe('Medium');
    expect(categoryCase('MEDIUM · Γυναικών')).toBe('Medium · Γυναικών');
    expect(categoryCase('ADVANCED 40+')).toBe('Advanced 40+');
    expect(categoryCase('ROOKIES 2')).toBe('Rookies 2');
    expect(categoryCase('MASTER')).toBe('Master');
  });
  it('keeps acronyms and short forms in capitals', () => {
    for (const s of ['ITF', 'ITF 40+', 'ATRP 2.5', 'AT 250 @ PRC ATRP 2.0', 'MED/ADV', 'ADV']) {
      expect(categoryCase(s)).toBe(s);
    }
  });
  it('leaves the rest as it is', () => {
    for (const s of ['40+', '-45 · Γυναικών', 'Μ 50+', 'Medium', 'Open', 'Μικτό', 'ΑΝΔΡΩΝ', 'U14', 'A1', 'ΜΕ', 'MD']) {
      expect(categoryCase(s)).toBe(s);
    }
  });
  it('does not touch a Latin word mixed with Greek or digits', () => {
    expect(categoryCase('MEDIUM2')).toBe('MEDIUM2');
    expect(categoryCase('ΑMEDIUM')).toBe('ΑMEDIUM');
  });
});

const result = (over: Partial<CardResult> = {}): CardResult => ({
  kind: 'result',
  id: 'r1',
  at: '2026-10-09T20:00:00Z',
  matchId: 'm1',
  ok: true,
  points: 10,
  streakBefore: 1,
  streak: 2,
  frozen: false,
  winnerSurname: 'Δρουλιάς',
  winnerFirst: 'Γιώργος',
  line: '',
  sets: '6-3, 6-4',
  pill: '+10 · σερί 2',
  ...over,
});

describe('resultStrip', () => {
  it('a right call: ✓, the winner and the pill', () => {
    expect(resultStrip(result(), t)).toEqual({ tick: true, name: 'Δρουλιάς', pill: '+10 · σερί 2' });
  });
  it('a miss says who won, neutral', () => {
    expect(resultStrip(result({ ok: false, pill: null }), t)).toEqual({ tick: false, name: 'Δρουλιάς κέρδισε', pill: null });
  });
  it('a doubles miss uses the plural', () => {
    expect(resultStrip(result({ ok: false, pill: null, winnerSurname: 'Δρουλιάς & Πράτσας' }), t).name).toBe('Δρουλιάς & Πράτσας κέρδισαν');
  });
});
