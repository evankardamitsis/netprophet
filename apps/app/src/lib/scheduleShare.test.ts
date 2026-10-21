import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { SHARE_MAX_ROWS, scheduleMessage, shareView, sideName } from './scheduleShare';
import { dayLong, type ScheduleRow } from './tournaments';

const t = getCopy('el');
const row = (i: number, over: Partial<ScheduleRow> = {}): ScheduleRow => ({
  id: `m${i}`, time: '10:00', meta: 'Μ 40+ · Απλό', score: null, mine: false, postponed: false, movedFrom: null, place: 'Court 1', club: null,
  sides: [
    { people: [{ id: 'a', first: 'Νίκος', surname: 'Ροδίτης' }], winner: false },
    { people: [{ id: 'b', first: 'Γιώργος', surname: 'Δεσύπρης' }, { id: 'c', first: 'Άννα', surname: 'Παπά' }], winner: false },
  ],
  ...over,
});

describe('schedule share', () => {
  it('names are short, doubles join, nobody named is a dash', () => {
    expect(sideName(row(1).sides[0]!, '–')).toBe('Ροδίτης Ν.');
    expect(sideName(row(1).sides[1]!, '–')).toBe('Δεσύπρης Γ. & Παπά Ά.');
    expect(sideName({ people: [], winner: false }, '–')).toBe('–');
  });
  it('a short day shows every match', () => {
    const v = shareView([row(1), row(2)], '–');
    expect(v.rows.map((r) => r.id)).toEqual(['m1', 'm2']);
    expect(v.more).toBe(0);
    expect(v.rows[0]).toMatchObject({ time: '10:00', place: 'Court 1', a: 'Ροδίτης Ν.' });
  });
  it('a long day is cut and counts the rest', () => {
    const rows = Array.from({ length: SHARE_MAX_ROWS + 4 }, (_, i) => row(i));
    const v = shareView(rows, '–');
    expect(v.rows).toHaveLength(SHARE_MAX_ROWS);
    expect(v.more).toBe(4);
  });
  it('a masked side stays masked', () => {
    const v = shareView([row(1, { sides: [{ people: [], winner: false }, { people: [], winner: false }] })], '–');
    expect(v.rows[0]).toMatchObject({ a: '–', b: '–' });
  });
  it('the day and the message', () => {
    expect(dayLong('2026-10-25', t)).toBe('Κυριακή 25/10');
    expect(scheduleMessage(t, 'Open', '2026-10-25')).toContain('Open · Κυριακή 25/10');
  });
});
