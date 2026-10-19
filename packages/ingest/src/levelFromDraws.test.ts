import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { levelFromDraws, parseDraws, parseSheet, parseSheetExport } from './index';

/**
 * ΑΟΚ Tennis Open, tab «ΤΡΙ 20/10» (founder, 18 Oct 2026): a doubles row written with a singles label «Μ 50+», no time
 * (it follows the 17:00 row), one pair with «/», the other by space (the flags on the held row). The pair is in the
 * MD MASTER draw, so the row is MD MASTER.
 */
const DRAWS = join(__dirname, '../../../tools/match-data/fixtures/aok-kifisia-2026/AOK_KIFISIA_2026_draws.txt');
const draws = parseDraws(parseSheetExport(readFileSync(DRAWS, 'utf8')), 2026);

const HEAD = ['', '', '', '', 'ΩΡΑ', 'ΑΓΩΝΕΣ', '', 'ΚΑΤΗΓΟΡΙΑ', 'PLAYER 1', '', 'PLAYER 2', 'ΑΠΟΤΕΛΕΣΜΑ', ''];
const tab = {
  name: 'ΤΡΙ 20/10',
  rows: [
    ['', '', '', '', '', 'ΤΡΙ 20/10 ΑΟΚ', '', '', '', '', '', '', ''],
    HEAD,
    ['', '', '', '', '17.00', '', '1', 'Μ 50+', 'ΕΥΤΑΞΙΑΣ ΓΙΑΝΝΗΣ', '', 'ΚΡΑΝΙΔΗΣ ΜΑΝΟΣ', '', ''],
    ['', '', '', '', '', '', '2', 'Μ 50+', 'ΧΑΜΑΜΗΣ/ΧΑΜΑΜΗΣ', '', 'ΣΑΡΙΔΑΚΗΣ ΣΑΡΙΔΑΚΗΣ', '', ''],
    ['', '', '', '', '18.00', '', '3', 'MD 50+', 'ΛΑΝΤΖΗΣ / ΚΟΥΝΕΛΗΣ', '', 'ΑΡΜΑΟΣ / ΣΑΚΑΛΟΓΛΟΥ', '', ''],
    ['', '', '', '', '18.30', '', '4', 'Μ 50+', 'ΑΓΝΩΣΤΟΣ/ΑΛΦΑ', '', 'ΑΓΝΩΣΤΟΣ/ΒΗΤΑ', '', ''],
  ],
};
const parsed = parseSheet([tab], 2026);
const fixed = levelFromDraws(parsed, draws);
const row = (side1: string) => fixed.find((m) => m.side1 === side1)!;

describe('the category of a doubles row from the draws', () => {
  it('reproduces the read: «Μ 50+» on a pair row is MD 50+ by the label alone', () => {
    const before = parsed.find((m) => m.side1 === 'ΧΑΜΑΜΗΣ/ΧΑΜΑΜΗΣ')!;
    expect(before).toMatchObject({ discipline: 'MD', level: '50+', categoryRaw: 'Μ 50+', time: '17:00' });
    expect(before.flags).toEqual(expect.arrayContaining(['discipline_from_slash', 'greek_mu_in_category', 'pair_by_space', 'time_inherited']));
  });

  it('the Χαμάμης pair is in the MD MASTER draw: the row is MD MASTER, same fingerprint', () => {
    const m = row('ΧΑΜΑΜΗΣ/ΧΑΜΑΜΗΣ');
    const before = parsed.find((x) => x.side1 === 'ΧΑΜΑΜΗΣ/ΧΑΜΑΜΗΣ')!;
    expect(m).toMatchObject({ discipline: 'MD', level: 'MASTER', categoryRaw: 'Μ 50+' });
    expect(m.flags).toContain('level_from_draw');
    expect(m.fingerprint).toBe(before.fingerprint);
  });

  it('a doubles label stays as written', () => {
    expect(row('ΛΑΝΤΖΗΣ / ΚΟΥΝΕΛΗΣ')).toMatchObject({ level: '50+' });
    expect(row('ΛΑΝΤΖΗΣ / ΚΟΥΝΕΛΗΣ').flags).not.toContain('level_from_draw');
  });

  it('singles rows and pairs no draw lists are left alone', () => {
    expect(row('ΕΥΤΑΞΙΑΣ ΓΙΑΝΝΗΣ')).toMatchObject({ discipline: 'MS', level: '50+' });
    const unknown = row('ΑΓΝΩΣΤΟΣ/ΑΛΦΑ');
    expect(unknown.level).toBe('50+');
    expect(unknown.flags).not.toContain('level_from_draw');
  });

  it('a pair the written category’s draw lists keeps that category', () => {
    const t = { name: 'ΤΡΙ 20/10', rows: [HEAD, ['', '', '', '', '20.00', '', '1', 'Μ 50+', 'ΛΑΝΤΖΗΣ/ΚΟΥΝΕΛΗΣ', '', 'ΧΑΜΑΜΗΣ ΧΑΜΑΜΗΣ', '', '']] };
    const [m] = levelFromDraws(parseSheet([t], 2026), draws);
    expect(m).toMatchObject({ level: '50+' });
  });

  it('no draws: nothing changes', () => {
    expect(levelFromDraws(parsed, [])).toEqual(parsed);
  });
});
