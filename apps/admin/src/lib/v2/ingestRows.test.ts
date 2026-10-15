import { describe, expect, it } from 'vitest';
import type { SheetPerson } from '@netprophet/ingest';
import { reviewAnswers, reviewQuestions, sameTwice } from './ingestRows';

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

describe('the questions on a held match', () => {
  const row = { side1: [{ raw: 'ΚΑΛΙΒΡΟΥΣΗΣ' }, { raw: 'ΚΑΛΙΒΡΟΥΣΗΣ' }], side2: [{ raw: 'ΦΛΑΜΠΟΥΡΑΣ' }, { raw: 'ΣΑΝΙΔΑΣ' }] };
  it('asks once per place when one spelling is two people', () => {
    const qs = reviewQuestions(row, [{ raw: 'ΚΑΛΙΒΡΟΥΣΗΣ' }]);
    expect(qs.map((q) => q.key)).toEqual(['1:0', '1:1']);
    expect(reviewAnswers(qs, { '1:0': 'a', '1:1': 'new' }, 'new')).toEqual([
      { raw: 'ΚΑΛΙΒΡΟΥΣΗΣ', slot: '1:0', player_id: 'a' },
      { raw: 'ΚΑΛΙΒΡΟΥΣΗΣ', slot: '1:1', new: true },
    ]);
  });
  it('asks once per name otherwise, with no slot', () => {
    const qs = reviewQuestions(row, [{ raw: 'ΣΑΝΙΔΑΣ' }]);
    expect(qs).toHaveLength(1);
    expect(reviewAnswers(qs, { ΣΑΝΙΔΑΣ: 'b' }, 'new')).toEqual([{ raw: 'ΣΑΝΙΔΑΣ', player_id: 'b' }]);
  });
});
