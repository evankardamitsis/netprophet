import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { isTournamentSoftware, parseTournamentSoftwareDay, tournamentSoftwareBase, tournamentSoftwareDays, tournamentSoftwarePerson } from './tournamentSoftware';

/** itfmasters.tournamentsoftware.com as served on 2 Nov 2026: MT200 Athens Tatoi (finished, 4 to 11 Oct) and Queens (3 Nov) */
const dir = join(__dirname, '../../../tools/match-data/fixtures/tournamentsoftware-itf-masters');
const page = (f: string) => gunzipSync(readFileSync(join(dir, f))).toString('utf8');

describe('tournamentsoftware.com', () => {
  it('knows its links and the tournament base', () => {
    const url = 'https://itfmasters.tournamentsoftware.com/tournament/68cb54ac-6b10-4c39-905b-9b38cdaa4dd2/Matches';
    expect(isTournamentSoftware(url)).toBe(true);
    expect(isTournamentSoftware('https://www.athenstennis.gr/el/schedule')).toBe(false);
    expect(tournamentSoftwareBase(url)).toBe('https://itfmasters.tournamentsoftware.com/tournament/68cb54ac-6b10-4c39-905b-9b38cdaa4dd2');
  });

  it('reads the days of the selector', () => {
    expect(tournamentSoftwareDays(page('tatoi-matches.html.gz'))).toEqual(['20261004', '20261005', '20261006', '20261007', '20261008', '20261009', '20261010', '20261011']);
  });

  it('splits names: the capitals are the surname, seeds and entry tags dropped', () => {
    expect(tournamentSoftwarePerson('Konstantinos RAFTOPOULOS [2, DA]')).toMatchObject({ first: 'Konstantinos', surname: 'RAFTOPOULOS' });
    expect(tournamentSoftwarePerson('MINODORA ILIOPOULOU [DA]')).toMatchObject({ first: 'MINODORA', surname: 'ILIOPOULOU' });
    expect(tournamentSoftwarePerson('Anna DE LA CRUZ')).toMatchObject({ first: 'Anna', surname: 'DE LA CRUZ' });
  });

  it('reads the round of each match, and leaves «Round 1» unknown', () => {
    const count = (ms: { round?: string }[], r?: string) => ms.filter((m) => m.round === r).length;
    const queens = parseTournamentSoftwareDay(page('queens-20261103.html.gz'), '20261103');
    expect(count(queens, 'round16')).toBeGreaterThan(0);
    expect(count(queens, 'quarter')).toBeGreaterThan(0);
    expect(count(queens, undefined)).toBeGreaterThan(0);
    const finals = parseTournamentSoftwareDay(page('tatoi-20261011.html.gz'), '20261011');
    expect(finals.length).toBeGreaterThan(0);
    expect(finals.every((m) => m.round === 'final')).toBe(true);
  });

  it('reads tomorrow\'s schedule: time, event, court, no result', () => {
    const ms = parseTournamentSoftwareDay(page('queens-20261103.html.gz'), '20261103');
    expect(ms.length).toBeGreaterThan(20);
    const m = ms.find((x) => x.side1.startsWith('PATERAKI'))!;
    expect(m).toMatchObject({
      date: '2026-11-03',
      time: '14:30',
      discipline: 'WS',
      level: '30+',
      categoryRaw: 'WS30 - Singles Main Draw',
      side1: 'PATERAKI Natassa',
      side2: 'ILIOPOULOU MINODORA',
      venue: 'Court 1 · Queens Tennis Club Pallini',
      club: 'Queens Tennis Club Pallini',
      status: 'scheduled',
      winner: null,
    });
    expect(ms.every((x) => x.status === 'scheduled' && /^\d{2}:\d{2}$/.test(x.time))).toBe(true);
  });

  it('reads results: sets, the winner, a match tie-break, doubles, retirements and walkovers', () => {
    const all = ['20261004', '20261005', '20261011'].flatMap((d) => parseTournamentSoftwareDay(page(`tatoi-${d}.html.gz`), d));
    const qf = all.find((x) => x.side1.startsWith('KATOPIS PETROS') && x.categoryRaw.startsWith('MS65') && x.date === '2026-10-05' && x.status === 'completed' && x.sets.length === 2 && x.sets[0]!.g[0] === 3)!;
    expect(qf).toMatchObject({ time: '13:00', level: '65+', winner: 2, setsWon: '0-2', scoreRaw: '3-6 1-6' });
    const tb = all.find((x) => x.sets.some((s) => s.tb));
    expect(tb?.scoreRaw).toMatch(/\[\d+-\d+\]$/);
    const dbl = all.find((x) => x.discipline === 'MD' && x.status === 'completed')!;
    expect(dbl.players.side1).toHaveLength(2);
    expect(dbl.side1).toContain(' / ');
    expect(all.some((x) => x.discipline === 'XD')).toBe(true);
    const wo = all.filter((x) => x.status === 'walkover');
    expect(wo.length).toBeGreaterThan(0);
    expect(wo.every((x) => x.winner === null && x.sets.length === 0)).toBe(true);
    const ret = all.filter((x) => x.retired);
    expect(ret.every((x) => x.status === 'completed' && x.winner !== null && x.flags.includes('retired'))).toBe(true);
    // every finished match has a winner and its score
    expect(all.filter((x) => x.status === 'completed').every((x) => x.winner !== null && x.sets.length > 0)).toBe(true);
  });
});
