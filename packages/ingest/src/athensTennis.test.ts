import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseAthensTennis } from './athensTennis';

/** athenstennis.gr/el/schedule as served on 14 Oct 2026 (tools/match-data/fixtures/athenstennis-2026) */
const html = gunzipSync(readFileSync(join(__dirname, '../../../tools/match-data/fixtures/athenstennis-2026/schedule-2026-10-14.html.gz'))).toString('utf8');
const all = parseAthensTennis(html);
const find = (date: string, surname: string) => all.find((m) => m.date === date && [...m.players.side1, ...m.players.side2].some((p) => p.surname === surname));

describe('parseAthensTennis', () => {
  it('reads every result of the season and the next days', () => {
    expect(all.length).toBe(283);
    expect(all.filter((m) => m.status === 'completed').length).toBe(268);
    expect(all.filter((m) => m.status === 'incomplete').length).toBe(4);
    expect(all.filter((m) => m.status === 'scheduled').length).toBe(11);
    expect(all.every((m) => /^\d{2}:\d{2}$/.test(m.time) && m.venue !== '')).toBe(true);
    expect(all.filter((m) => m.status === 'completed').every((m) => m.winner !== null && m.sets.length >= 2)).toBe(true);
  });

  it('a singles result: names split, score, winner, court and club', () => {
    const m = find('2026-10-13', 'Τσερος')!;
    expect(m).toMatchObject({
      time: '21:00',
      discipline: 'MS',
      level: 'Regular Season 2026–27',
      venue: 'ACE Στεγασμένο 1 · ACE Tennis Club',
      scoreRaw: '6-3 6-0',
      winner: 1,
      status: 'completed',
    });
    expect(m.players.side1[0]).toMatchObject({ surname: 'Τσερος', first: 'Αλεξανδρος' });
    expect(m).toMatchObject({ club: 'ACE Tennis Club', court: 'ACE Στεγασμένο 1' });
  });

  it('doubles keep both people a side; an initial stays an initial', () => {
    const m = find('2026-10-13', 'Κοροπουλη')!;
    expect(m.discipline).toBe('XD');
    expect(m.players.side1.map((p) => [p.surname, p.first])).toEqual([['Κοροπουλη', 'Κ.'], ['Πηλιχος', 'Γιωργος']]);
  });

  it('a super tie-break is the third set', () => {
    const m = all.find((x) => x.sets.some((s) => s.tb))!;
    expect(m.sets).toHaveLength(3);
    expect(m.scoreRaw).toMatch(/^\d+-\d+ \d+-\d+ \[\d+-\d+\]$/);
  });

  it('a retirement keeps its score but gives no result', () => {
    const m = find('2026-09-20', 'Φακιδαρης')!;
    expect(m).toMatchObject({ status: 'incomplete', winner: null, scoreRaw: '1-6 0-0' });
    expect(m.flags).toContain('retired');
  });

  it('AT Knockouts: singles or doubles from the sides, the event as the level', () => {
    const m = find('2026-09-18', 'Δημακακος')!;
    expect(m).toMatchObject({ discipline: 'MS', level: 'AT 250 @ PRC ATRP 2.5', flags: ['discipline_from_sides'] });
  });

  it('a singles match filed under doubles goes by the people', () => {
    const m = all.find((x) => x.date === '2026-09-28' && x.players.side1[0]?.surname === 'Μεμμος')!;
    expect(m).toMatchObject({ discipline: 'MS', categoryRaw: "Men's Doubles | Regular Season | 2026–27" });
    expect(m.flags).toContain('discipline_from_sides');
    expect(all.every((x) => x.players.side1.length === x.players.side2.length && x.discipline.endsWith('D') === (x.players.side1.length === 2))).toBe(true);
  });

  it('upcoming matches: club, court and time, no score', () => {
    const m = find('2026-10-14', 'Κυριάκος')!;
    expect(m).toMatchObject({ time: '18:30', venue: 'Court 1 PRC · PRC (Μαρούσι)', club: 'PRC (Μαρούσι)', court: 'Court 1 PRC', status: 'scheduled', winner: null, scoreRaw: '' });
  });

  it('the same match gets the same fingerprint, whatever the time', () => {
    expect(new Set(all.map((m) => m.fingerprint)).size).toBe(all.length);
    expect(find('2026-10-14', 'Κυριάκος')!.fingerprint).toBe('at|2026-10-14|MS|Regular Season 2026–27|κυριακοσ δημητρησ|μαυροσ γιαννησ');
  });
});
