import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDraws, parseSheetExport } from './index';

/** The ΑΟΚ Κηφισιάς 2026 draw sheet (26 tabs): parser changes must keep these numbers. */
const FILE = join(__dirname, '../../../tools/match-data/fixtures/aok-kifisia-2026/AOK_KIFISIA_2026_draws.txt');

describe('ΑΟΚ Κηφισιάς 2026 draws', () => {
  const draws = parseDraws(parseSheetExport(readFileSync(FILE, 'utf8')), 2026);
  const all = draws.flatMap((d) => d.rounds.flat());

  it('every tab: 24 knockout draws and 2 round robins', () => {
    expect(draws).toHaveLength(26);
    expect(draws.filter((d) => d.format === 'knockout')).toHaveLength(24);
    expect(draws.filter((d) => d.format === 'round_robin').map((d) => d.tab)).toEqual(['MIXED MASTER', 'WD MEDIUM']);
  });

  it('round robin: two groups of three pairs, each played match once, scores team a first', () => {
    const d = draws.find((x) => x.tab === 'MIXED MASTER')!;
    expect(d.groups!.map((g) => [g.name, g.teams.length])).toEqual([['Όμιλος 1', 3], ['Όμιλος 2', 3]]);
    const g1 = d.groups![0]!;
    expect(g1.teams[0]!.people).toHaveLength(2);
    expect(g1.matches).toHaveLength(1);
    expect(g1.matches[0]).toMatchObject({ a: 1, b: 3, winner: 2 });
    expect(g1.matches[0]!.sets.map((s) => s.g)).toEqual([[6, 3], [4, 6], [6, 10]]);
    expect(g1.standings.find((s) => s.pos === 3)).toEqual({ pos: 3, won: 1, played: 1 });
    expect(d.entrants).toHaveLength(6);
  });

  it('round robin read from the lower half when the upper is empty', () => {
    const g2 = draws.find((x) => x.tab === 'WD MEDIUM')!.groups![1]!;
    expect(g2.matches.map((m) => [m.a, m.b, m.winner])).toEqual([[1, 2, 1]]);
  });

  it('every draw has as many entrants as its size, and log2(size) rounds', () => {
    for (const d of draws.filter((x) => x.format === 'knockout')) {
      expect(d.entrants).toHaveLength(d.size);
      expect(d.rounds).toHaveLength(Math.log2(d.size));
      expect(d.flags).toEqual([]);
    }
  });

  it('reads 448 matches, 86 decided, 43 with a day and time, and nothing it could not place', () => {
    expect(all).toHaveLength(448);
    expect(all.filter((m) => m.winner && !m.bye)).toHaveLength(86);
    expect(all.filter((m) => m.when)).toHaveLength(43);
    expect(all.filter((m) => m.flags.length)).toEqual([]);
  });

  it('a first round: names, seed, deadline, the winner and the score side 1 first', () => {
    const d = draws.find((x) => x.tab === 'Μ 40+')!;
    expect(d.discipline).toBe('MS');
    expect(d.level).toBe('40+');
    expect(d.entrants[0]).toMatchObject({ pos: 1, raw: 'ΠΡΩΤΟΝΟΤΑΡΙΟΣ ΓΙΑΝΝΗΣ', seed: 1, bye: false });
    expect(d.rounds[0]![0]).toMatchObject({
      round: 1, slot: 1, side1: 'ΠΡΩΤΟΝΟΤΑΡΙΟΣ ΓΙΑΝΝΗΣ', side2: 'ΓΙΑΝΝΟΠΟΥΛΟΣ ΛΑΜΠΡΟΣ', winner: 2, scoreRaw: '61 62', deadline: '2026-10-14',
    });
    expect(d.rounds[0]![0]!.sets.map((s) => s.g)).toEqual([[1, 6], [2, 6]]);
    expect(d.rounds[1]![0]).toMatchObject({ side1: 'ΓΙΑΝΝΟΠΟΥΛΟΣ ΛΑΜΠΡΟΣ', side2: 'ΠΑΠΑΝΙΚΟΛΑΟΥ ΚΩΣΤΑΣ', winner: null, deadline: '2026-10-17' });
  });

  it('byes go through without a match; a time waits in the next round', () => {
    const d = draws.find((x) => x.tab === 'Μ 70+')!;
    expect(d.rounds[0]![0]).toMatchObject({ bye: true, winner: 1, side2: null });
    expect(d.rounds[1]!.some((m) => m.when === 'ΤΕΤ 17.45')).toBe(true);
  });

  it('a retirement keeps the sets as far as they went', () => {
    const m = draws.find((x) => x.tab === 'M MASTER')!.rounds[0]![1]!;
    expect(m).toMatchObject({ winner: 2, retired: true });
    expect(m.sets.map((s) => s.g)).toEqual([[0, 6], [0, 3]]);
  });

  it('doubles pairs split into two people', () => {
    const d = draws.find((x) => x.tab === 'MD MASTER')!;
    expect(d.entrants[0]!.people).toHaveLength(2);
  });
});
