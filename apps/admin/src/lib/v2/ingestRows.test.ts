import { describe, expect, it } from 'vitest';
import type { SheetPerson } from '@netprophet/ingest';
import { candidateContext, pairOptions, rankCandidates, reviewAnswers, reviewQuestions, sameTwice, twinQuestions, type ReviewCandidate } from './ingestRows';

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

describe('held names that know their place (smart names, 18 Oct)', () => {
  const row = { side1: [{ raw: 'ΧΑΜΑΜΗΣ' }, { raw: 'ΧΑΜΑΜΗΣ' }], side2: [{ raw: 'ΣΚΙΑΔΑΣ' }] };
  const unclear = [
    { raw: 'ΧΑΜΑΜΗΣ', slot: '1:0' },
    { raw: 'ΧΑΜΑΜΗΣ', slot: '1:1' },
    { raw: 'ΣΚΙΑΔΑΣ', slot: '2:0' },
  ];
  it('one question per held place, no more', () => {
    const qs = reviewQuestions(row, unclear);
    expect(qs.map((q) => [q.key, q.label])).toEqual([
      ['1:0', 'ΧΑΜΑΜΗΣ (first, side 1)'],
      ['1:1', 'ΧΑΜΑΜΗΣ (second, side 1)'],
      ['2:0', 'ΣΚΙΑΔΑΣ'],
    ]);
  });
  it('the two places of one spelling on a side are twins, answered together', () => {
    const qs = reviewQuestions(row, unclear);
    const twins = twinQuestions(qs);
    expect(twins.map(([a, b]) => [a.key, b.key])).toEqual([['1:0', '1:1']]);
    expect(reviewAnswers(qs, { '1:0': 'nikos', '1:1': 'giorgos', '2:0': 'new' }, 'new')).toEqual([
      { raw: 'ΧΑΜΑΜΗΣ', slot: '1:0', player_id: 'nikos' },
      { raw: 'ΧΑΜΑΜΗΣ', slot: '1:1', player_id: 'giorgos' },
      { raw: 'ΣΚΙΑΔΑΣ', slot: '2:0', new: true },
    ]);
  });
  it('a place picked by a rule is not asked again', () => {
    const held = { side1: [{ raw: 'ΧΑΜΑΜΗΣ' }, { raw: 'ΧΑΜΑΜΗΣ' }], side2: [{ raw: 'Χ' }] };
    expect(reviewQuestions(held, [{ raw: 'ΧΑΜΑΜΗΣ', slot: '1:1' }]).map((q) => [q.key, q.label])).toEqual([['1:1', 'ΧΑΜΑΜΗΣ']]);
  });
});

describe('candidates with context', () => {
  const a: ReviewCandidate = { id: 'a', first_name: 'Α.', surname: 'Σαριδάκης', score: 0.85, rank: 1.15, matches: 3,
    categories: [{ name: 'MASTER', n: 2 }, { name: '50+', n: 1 }], last_match: '2026-10-12', partners: [{ id: 'p', name: 'Πάολο Σαριδάκης', n: 2 }] };
  const p: ReviewCandidate = { id: 'p', first_name: 'Πάολο', surname: 'Σαριδάκης', score: 0.85, rank: 1.15, matches: 2,
    categories: [{ name: 'MASTER', n: 2 }], last_match: '2026-10-12', partners: [{ id: 'a', name: 'Α. Σαριδάκης', n: 2 }] };
  const g: ReviewCandidate = { id: 'g', first_name: 'Αγγ.', surname: 'Σαριδάκης', score: 0.85, rank: 1.2, matches: 1, categories: [{ name: 'MASTER', n: 1 }] };
  const empty: ReviewCandidate = { id: 'e', first_name: 'Θαν', surname: 'Τζαφλέρης', score: 0.85, rank: 0.85, matches: 0, likely_duplicate_of: 'x' };
  it('best first by rank', () => {
    expect(rankCandidates([a, empty, g]).map((c) => c.id)).toEqual(['g', 'a', 'e']);
  });
  it('a line that tells them apart', () => {
    expect(candidateContext(a)).toBe('Played MASTER ×2, 50+ ×1 · last 12 Oct 2026 · with Πάολο Σαριδάκης (2)');
    expect(candidateContext(empty)).toBe('No matches yet');
    expect(candidateContext({ id: 'o', first_name: 'Ο', surname: 'Π', score: 1 })).toBe('');
  });
  it('pairs for a same-surname side: the two who played together first', () => {
    const pairs = pairOptions([g, a, p]);
    expect(pairs[0]).toMatchObject({ a: { id: 'a' }, b: { id: 'p' }, together: 2 });
    expect(pairs).toHaveLength(3);
  });
});
