import { describe, expect, it } from 'vitest';
import { parseDraws } from './index';

/**
 * The TAF doubles draw file (19 Nov 2026), its own Google Sheet next to the singles draws: one knockout tab per
 * category («MD -40», «MIXED 40+», «WD MEDIUM», ...), the tab name on the first row, «MAIN DRAW (n)» on the header row
 * with a «Week of 14/02-08/03» template leftover under it, pairs written «ΣΟΥΡΝΑΜΕ Α/ΕΠΙΘΕΤΟ ΒΑΓ», byes as «ΒΥΕ».
 * The names here are made up; the layout is the file's.
 */
const W = 14;
const row = (cells: Record<number, string>) => Array.from({ length: W }, (_, i) => cells[i] ?? '');
function tafTab(name: string): { name: string; rows: string[][] } {
  return {
    name,
    rows: [
      row({ 9: name }),
      row({}),
      row({ 0: 'TAF TENNIS CLUB', 9: 'MAIN DRAW (4)' }),
      row({ 0: 'Week of', 5: 'City, Country' }),
      row({ 0: '14/02-08/03', 5: 'PALLINI' }),
      row({}),
      row({ 0: '1', 2: '1', 4: 'ΑΛΦΑΔΗΣ Γ/ΒΗΤΑΚΗΣ ΒΑΓ' }),
      row({ 6: 'ΑΛΦΑΔΗΣ Γ/ΒΗΤΑΚΗΣ ΒΑΓ' }),
      row({ 0: '2', 4: 'ΒΥΕ' }),
      row({ 8: 'ΚΥΡ 10.30' }),
      row({ 0: '3', 4: 'ΓΑΜΜΙΔΗΣ ΔΗΜ/ΔΕΛΤΟΥ ΝΙΚΟΣ' }),
      row({ 6: 'ΕΨΙΛΟΝ Φ./ΖΗΤΑΣ ΘΕΜΗΣ' }),
      row({ 0: '4', 2: '2', 4: 'ΕΨΙΛΟΝ Φ./ΖΗΤΑΣ ΘΕΜΗΣ', 6: '60 63' }),
      row({}),
      row({ 3: 'SEEDS', 8: 'ALTERNATES', 13: 'ΠΡΟΚΡΙΜΑΤΙΚΑ' }),
      row({ 3: '1' }),
    ],
  };
}

describe('TAF doubles draw file', () => {
  const tabs = ['MD -40', 'MD 40+', 'MD 110', 'WD', 'MIXED -40', 'MIXED 40+', 'MD MEDIUM', 'XD MEDIUM', 'WD MEDIUM'];
  const draws = parseDraws(tabs.map(tafTab), 2026);

  it('every tab is a knockout draw with its discipline and level from the tab name', () => {
    expect(draws.map((d) => [d.tab, d.discipline, d.level, d.format, d.size])).toEqual([
      ['MD -40', 'MD', '-40', 'knockout', 4],
      ['MD 40+', 'MD', '40+', 'knockout', 4],
      ['MD 110', 'MD', '110', 'knockout', 4],
      ['WD', 'WD', 'OPEN', 'knockout', 4],
      ['MIXED -40', 'XD', '-40', 'knockout', 4],
      ['MIXED 40+', 'XD', '40+', 'knockout', 4],
      ['MD MEDIUM', 'MD', 'MEDIUM', 'knockout', 4],
      ['XD MEDIUM', 'XD', 'MEDIUM', 'knockout', 4],
      ['WD MEDIUM', 'WD', 'MEDIUM', 'knockout', 4],
    ]);
  });

  it('the template «Week of» line is not an entrant; pairs are two people; ΒΥΕ is a bye', () => {
    const d = draws[0]!;
    expect(d.flags).toEqual([]);
    expect(d.entrants.map((e) => [e.pos, e.bye, e.people.length])).toEqual([
      [1, false, 2],
      [2, true, 0],
      [3, false, 2],
      [4, false, 2],
    ]);
    expect(d.entrants[0]!.seed).toBe(1);
    expect(d.entrants[0]!.people.map((p) => p.surname)).toEqual(['ΑΛΦΑΔΗΣ', 'ΒΗΤΑΚΗΣ']);
  });

  it('a bye goes through, a played match has its winner and score', () => {
    const [r1] = draws[0]!.rounds;
    expect(r1![0]).toMatchObject({ bye: true, winner: 1 });
    expect(r1![1]).toMatchObject({ bye: false, winner: 2, scoreRaw: '60 63' });
    expect(r1![1]!.sets.map((s) => s.g)).toEqual([
      [0, 6],
      [3, 6],
    ]);
  });
});
