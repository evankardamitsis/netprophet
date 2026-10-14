import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { placeLine } from './place';

const el = getCopy('el');
const en = getCopy('en');

describe('placeLine', () => {
  it('club and surface', () => expect(placeLine({ club: 'PRC (Μαρούσι)', surface: 'hard' }, el)).toBe('PRC (Μαρούσι) · Σκληρό'));
  it('the court first on a schedule', () =>
    expect(placeLine({ club: 'PRC (Μαρούσι)', court: 'Court 1 PRC', surface: 'clay' }, el, true)).toBe('Court 1 PRC · PRC (Μαρούσι) · Χώμα'));
  it('the surface alone (a tournament with no club named)', () => expect(placeLine({ surface: 'grass' }, en)).toBe('Grass'));
  it('nothing known: no line', () => {
    expect(placeLine({}, el)).toBeNull();
    expect(placeLine({ club: ' ', surface: 'unknown' }, el)).toBeNull();
  });
});
