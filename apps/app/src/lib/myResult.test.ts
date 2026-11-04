import { describe, expect, it } from 'vitest';
import type { MyResultCelebration } from '@netprophet/db';
import { copy } from '../i18n';
import { myResultView } from './myResult';

const t = copy;
const item = (win: boolean, at: string, over: Partial<MyResultCelebration['payload']> = {}): MyResultCelebration => ({
  id: at,
  created_at: at,
  payload: {
    type: 'my_result', match_id: 'm', win, score: '6-4 6-2', opponent: 'τον Π. Βλάχο',
    year_wins: 12, year_losses: 4, wins_in_row: win ? 3 : 0, h2h_wins: 2, h2h_losses: 1, ...over,
  },
});

describe('myResultView', () => {
  it('a win', () => {
    expect(myResultView([item(true, '2026-11-04T10:00:00Z')], t)).toEqual({
      win: true, label: 'ΝΙΚΗ', title: 'Το πήρες!', line: '6-4 6-2 με τον Π. Βλάχο',
      facts: ['Φέτος 12-4', '3 νίκες στη σειρά', 'Μεταξύ σας 2-1'],
    });
  });

  it('a loss: no run to speak of, a first meeting is not a record', () => {
    const v = myResultView([item(false, '2026-11-04T10:00:00Z', { h2h_wins: 0, h2h_losses: 1 })], t);
    expect(v.win).toBe(false);
    expect(v.label).toBe('ΤΟ ΜΑΤΣ ΣΟΥ');
    expect(v.title).toBe('Δεν βγήκε αυτή τη φορά');
    expect(v.facts).toEqual(['Φέτος 12-4']);
  });

  it('several: one screen, the latest match and how they went', () => {
    const v = myResultView([item(false, '2026-11-04T12:00:00Z', { opponent: 'τον Ν. Παππά' }), item(true, '2026-11-04T10:00:00Z'), item(true, '2026-11-04T11:00:00Z')], t);
    expect(v.win).toBe(true);
    expect(v.label).toBe('ΤΑ ΜΑΤΣ ΣΟΥ');
    expect(v.title).toBe('2 νίκες, 1 ήττα');
    expect(v.line).toBe('6-4 6-2 με τον Ν. Παππά');
    expect(v.facts).toEqual(['Φέτος 12-4']);
  });

  it('a doubles match has no record between you', () => {
    expect(myResultView([item(true, '2026-11-04T10:00:00Z', { h2h_wins: null, h2h_losses: null, wins_in_row: 1 })], t).facts).toEqual(['Φέτος 12-4']);
  });
});
