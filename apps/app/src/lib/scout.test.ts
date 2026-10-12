import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { mockScout } from '../mock/scout';
import { record, toScoutView } from './scout';

const t = getCopy('el');

describe('toScoutView', () => {
  it('turns the results into lines', () => {
    const v = toScoutView(mockScout('m')!.opponents[0]!, { glyfada: 'Γλυφάδα' }, t);
    expect(v.sub).toBe('level 5 · Γλυφάδα · αριστερό χέρι');
    expect(v.year).toBe('Φέτος 11-4');
    expect(v.h2h).toEqual({ record: '1-2', line: 'Την τελευταία φορά έχασες 1-2.' });
    expect(v.common[0]).toEqual({ id: 'nik', name: 'Νίκος Ροδίτης', me: '2-1', them: '0-2' });
  });

  it('a first meeting and empty records', () => {
    const p = { ...mockScout('m').opponents[0]!, h2h: { w: 0, l: 0, last: null }, deciding: { w: 0, l: 0 } };
    const v = toScoutView(p, {}, t);
    expect(v.h2h).toEqual({ record: null, line: 'Πρώτη φορά απέναντι.' });
    expect(v.deciding).toBe('Τίποτα ακόμα');
    expect(record({ w: 3, l: 0 }, t)).toBe('3-0');
  });
});
