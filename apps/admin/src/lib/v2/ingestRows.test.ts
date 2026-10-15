import { describe, expect, it } from 'vitest';
import type { SheetPerson } from '@netprophet/ingest';
import { sameTwice } from './ingestRows';

const person = (surname: string, first = ''): SheetPerson => ({ surname, first, key: `${surname}|${first}` }) as SheetPerson;

describe('the same player twice in a match', () => {
  it('finds two placeholders that resolve to one player', () => {
    const m = { players: { side1: [person('Παπάς', 'Νίκος'), person('ΣΥΜΠΑΙΚΤΗΣ')], side2: [person('Λάμπρου', 'Άννα'), person('ΣΥΜΠΑΙΚΤΗΣ')] } };
    expect(sameTwice(m, (p) => (p.surname === 'ΣΥΜΠΑΙΚΤΗΣ' ? 'id-placeholder' : `new:${p.key}`))).toBe('ΣΥΜΠΑΙΚΤΗΣ');
  });
  it('finds two names picked as the same player', () => {
    const m = { players: { side1: [person('Δανιάς', 'Βαγγέλης')], side2: [person('Δανιάς', 'Ευάγγελος')] } };
    expect(sameTwice(m, () => 'id-1')).toBe('Δανιάς Ευάγγελος');
  });
  it('lets four different people through', () => {
    const m = { players: { side1: [person('Α', 'α'), person('Β', 'β')], side2: [person('Γ', 'γ'), person('Δ', 'δ')] } };
    expect(sameTwice(m, (p) => `new:${p.key}`)).toBeNull();
  });
});
