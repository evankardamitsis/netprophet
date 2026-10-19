import type { Discipline } from './category';
import type { Draw } from './draw';
import { sheetKey, type SheetPerson } from './names';
import type { SheetMatch } from './oop';

/**
 * The category of a doubles row, checked against the draw sheet (founder, 18 Oct 2026). ΑΟΚ wrote «Μ 50+» on a row
 * whose sides are pairs («ΧΑΜΑΜΗΣ ΧΑΜΑΜΗΣ» vs «ΣΑΡΙΔΑΚΗΣ ΣΑΡΙΔΑΚΗΣ»): a singles label, so the parser made it MD 50+
 * (flag discipline_from_slash), while the pair is in the MD MASTER draw. A singles label on a doubles row says the
 * gender, not the category; the draw that holds the pairs says the category.
 *
 * For each such row: the doubles draws of its discipline that list both sides as entrants. Exactly one, and not the
 * written category's own draw: the row takes that draw's level, flagged level_from_draw. When no draw lists both, one
 * side found in exactly one draw is enough, as long as the written category's draw lists neither. The fingerprint stays
 * as it was (the row's identity); the database moves an imported match to the corrected category in place.
 */

const fold = (s: string) => sheetKey(s).replace(/[^\p{L}]/gu, '');

/** two people are one entrant's two: same surnames, and first names (when both are written) start alike */
function samePair(side: SheetPerson[], entrant: SheetPerson[]): boolean {
  if (side.length !== 2 || entrant.length !== 2) return false;
  const fits = (a: SheetPerson, b: SheetPerson) => {
    if (fold(a.surname) !== fold(b.surname) || fold(a.surname) === '') return false;
    const fa = fold(a.first);
    const fb = fold(b.first);
    return fa === '' || fb === '' || fa[0] === fb[0];
  };
  return (fits(side[0]!, entrant[0]!) && fits(side[1]!, entrant[1]!)) || (fits(side[0]!, entrant[1]!) && fits(side[1]!, entrant[0]!));
}

/** how many of the row's two sides a draw lists as entrants */
function sidesIn(m: SheetMatch, d: Draw): number {
  const has = (side: SheetPerson[]) => d.entrants.some((e) => !e.bye && samePair(side, e.people));
  return (has(m.players.side1) ? 1 : 0) + (has(m.players.side2) ? 1 : 0);
}

const DOUBLES: Discipline[] = ['MD', 'WD', 'XD'];

export function levelFromDraws(matches: SheetMatch[], draws: Draw[]): SheetMatch[] {
  const doublesDraws = draws.filter((d) => DOUBLES.includes(d.discipline) && d.entrants.length > 0);
  if (doublesDraws.length === 0) return matches;
  return matches.map((m) => {
    if (!m.flags.includes('discipline_from_slash') || !DOUBLES.includes(m.discipline)) return m;
    const pool = doublesDraws.filter((d) => d.discipline === m.discipline);
    const own = pool.find((d) => d.level === m.level);
    const hits = pool.map((d) => ({ d, n: sidesIn(m, d) }));
    if (own && sidesIn(m, own) > 0) return m;
    const both = hits.filter((h) => h.n === 2);
    const one = hits.filter((h) => h.n >= 1);
    const pick = both.length === 1 ? both[0]!.d : both.length === 0 && one.length === 1 ? one[0]!.d : null;
    if (!pick || pick.level === m.level) return m;
    return { ...m, level: pick.level, flags: [...new Set([...m.flags, 'level_from_draw'])].sort() };
  });
}
