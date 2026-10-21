import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { scheduleMessage, shareRoom, shareRowHeight, shareView, shortName, sideName } from './scheduleShare';
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
  it('no first name: just the surname, no stray dot or space', () => {
    expect(shortName({ first: '', surname: 'Λάγου' })).toBe('Λάγου');
    expect(shortName({ first: '  ', surname: 'Ιωάννου ' })).toBe('Ιωάννου');
    expect(sideName({ people: [{ id: 'a', first: '', surname: 'Λάγου' }, { id: 'b', first: '', surname: 'Ιωάννου' }], winner: false }, '–')).toBe('Λάγου & Ιωάννου');
  });
  it('a doubles match is marked, and is taller than a singles one', () => {
    const v = shareView([row(1), row(2, { sides: [row(1).sides[0]!, row(1).sides[0]!] })], '–');
    expect(v.rows[0]!.double).toBe(true);
    expect(v.rows[1]!.double).toBe(false);
    expect(shareRowHeight(v.rows[0]!)).toBeGreaterThan(shareRowHeight(v.rows[1]!));
  });
  it('the category stays as the schedule shows it', () => {
    expect(shareView([row(1, { meta: 'Μ 60+ · Απλό' }), row(2, { meta: 'Μ 60 · Απλό' })], '–').rows.map((r) => r.meta)).toEqual(['Μ 60+ · Απλό', 'Μ 60 · Απλό']);
  });
  it('a long day is cut to what fits above the footer and counts the rest', () => {
    const rows = Array.from({ length: 30 }, (_, i) => row(i));
    const v = shareView(rows, '–', 'Open');
    expect(v.rows.length).toBeGreaterThan(0);
    expect(v.rows.length + v.more).toBe(30);
    expect(v.more).toBeGreaterThan(0);
    const used = v.rows.reduce((n, r) => n + shareRowHeight(r), 0);
    // the rows and the «+N ακόμα» line are inside the room
    expect(used + 23).toBeLessThanOrEqual(shareRoom('Open'));
  });
  it('doubles take more room, so fewer fit', () => {
    const singles = Array.from({ length: 30 }, (_, i) => row(i, { sides: [row(1).sides[0]!, row(1).sides[0]!] }));
    const doubles = Array.from({ length: 30 }, (_, i) => row(i));
    expect(shareView(doubles, '–', 'Open').rows.length).toBeLessThan(shareView(singles, '–', 'Open').rows.length);
  });
  it('a long tournament name leaves less room', () => {
    expect(shareRoom('Πανελλήνιο Πρωτάθλημα Βετεράνων Ανοιχτών Γηπέδων 2026')).toBeLessThan(shareRoom('Open'));
  });
  it('a day that fits shows no «more» and an empty day shows nothing', () => {
    expect(shareView([row(1), row(2), row(3)], '–', 'Open').more).toBe(0);
    expect(shareView([], '–')).toEqual({ rows: [], more: 0 });
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
