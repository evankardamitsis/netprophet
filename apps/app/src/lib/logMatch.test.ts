import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { emptyForm, otherDays, peopleDone, peopleLabel, quickDays, ready, shortDay, toInput, topLine, type LogForm } from './logMatch';

const t = getCopy('el');
const now = new Date('2026-10-12T09:00:00Z');
const nik = { kind: 'player' as const, id: 'nik', first: 'Νίκος', surname: 'Ροδίτης', sub: '' };
const newbie = { kind: 'new' as const, first: ' Νέος ', surname: 'Αντίπαλος ' };

describe('days', () => {
  it('quick days by mode, then five more', () => {
    expect(quickDays('played', now, t)).toEqual([
      { key: '2026-10-12', label: 'Σήμερα' },
      { key: '2026-10-11', label: 'Χθες' },
    ]);
    expect(quickDays('soon', now, t)[1]).toEqual({ key: '2026-10-13', label: 'Αύριο' });
    expect(otherDays('played', now)[0]).toEqual({ key: '2026-10-10', label: 'Σάβ 10/10' });
    expect(shortDay('2026-10-02')).toBe('Παρ 2/10');
  });
});

describe('the people', () => {
  it('partner first for doubles, then two opponents', () => {
    const f: LogForm = { ...emptyForm('played'), format: 'doubles' };
    expect(peopleLabel(f, t)).toBe('Ο παρτενέρ σου');
    expect(peopleLabel({ ...f, format: 'mixed' }, t)).toBe('Η παρτενέρ σου');
    expect(peopleLabel({ ...f, partner: nik, opponents: [newbie] }, t)).toBe('Απέναντι · διάλεξε δύο · ένας ακόμα');
    expect(peopleDone({ ...f, partner: nik, opponents: [newbie] })).toBe(false);
    expect(peopleDone({ ...f, partner: nik, opponents: [newbie, nik] })).toBe(true);
  });
});

describe('ready and the input', () => {
  const base: LogForm = { ...emptyForm('played'), date: '2026-10-12', tournament: { kind: 'friendly' }, format: 'singles', opponents: [nik] };
  it('a played match needs who won and the sets', () => {
    expect(ready(base)).toBe(false);
    expect(ready({ ...base, won: true, sets: '2-1' })).toBe(true);
    expect(ready({ ...base, mode: 'soon' })).toBe(true);
    expect(ready({ ...base, mode: 'soon', tournament: { kind: 'other', name: ' ' } })).toBe(false);
  });
  it('what the database gets', () => {
    expect(toInput({ ...base, won: true, sets: '2-1', opponents: [newbie] })).toEqual({
      mode: 'played',
      date: '2026-10-12',
      format: 'singles',
      tournament_id: null,
      tournament_suggestion: null,
      opponents: [{ new: { first: 'Νέος', surname: 'Αντίπαλος' } }],
      result: { won: true, sets: '2-1' },
    });
    expect(toInput({ ...base, mode: 'soon' }, 'm1').match_id).toBe('m1');
  });
  it('the summary line', () => {
    expect(topLine(base, now, t)).toBe('Σήμερα · Φιλικό · Μονό');
  });
});
