import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv, parseSheet } from './index';

/**
 * The TAF RACE 2026-2027 sheet against parse_oop.py's own output (tools/match-data/fixtures). Every column of
 * every match must agree; parser changes must keep this passing.
 */
const DIR = join(__dirname, '../../../tools/match-data/fixtures/taf-race-2026-2027');

describe('TAF RACE 2026-2027 against parse_oop.py', () => {
  const manifest = JSON.parse(readFileSync(join(DIR, 'tabs/manifest.json'), 'utf8')) as { file: string; tab: string }[];
  const tabs = manifest.map((m) => ({ name: m.tab, rows: parseCsv(readFileSync(join(DIR, 'tabs', m.file), 'utf8'), ',') }));
  const ours = parseSheet(tabs, 2026);
  const [head, ...rows] = parseCsv(readFileSync(join(DIR, 'expected_matches.csv'), 'utf8'), ',');
  const expected = rows.map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i] ?? ''])));

  it('the same 54 matches', () => {
    expect(expected).toHaveLength(54);
    expect(ours).toHaveLength(expected.length);
  });

  it.each(expected.map((e, i) => [i + 1, e] as const))('match %i', (i, e) => {
    const o = ours[i - 1]!;
    expect({
      tab: o.tab,
      date: o.date,
      time: o.time,
      venue: o.venue,
      discipline: o.discipline,
      level: o.level,
      side1: o.side1,
      side2: o.side2,
      score_raw: o.scoreRaw,
      sets: o.sets,
      sets_won: o.setsWon,
      winner: o.winner === null ? '' : String(o.winner),
      status: o.status,
      fingerprint: o.fingerprint,
      players: o.players,
      flags: o.flags.join(';'),
    }).toEqual({ ...e, sets: JSON.parse(e.sets!), players: JSON.parse(e.players!) });
  });
});
