/**
 * Read a tennis score the way people type it (admin desk, organiser sheets: docs/v2/match-data-automation.md),
 * always from side 1's point of view:
 *   "6-3 7-5", "63 76", "62 36 10 6", "75 16 14-16", "57-26", "64-46 10-8", "7-6(5) 6-4", "6-3 2-1 ret",
 *   "wo", "tbc".
 * Plain code, no guessing beyond these rules: a two-digit group is a set when it reads as one ("63");
 * otherwise numbers pair up ("10 6"). A third pair after 1-1 that is not a normal set is a match tie-break.
 */
import { isValidMatchTiebreak, isValidTennisSet } from './tennis';

export interface ParsedSet {
  /** games (or tie-break points) of side 1 and side 2 */
  a: number;
  b: number;
  /** tie-break points of the set, side 1 first: "7-6(5)" gives [7, 5] */
  tb?: [number, number];
  /** deciding match tie-break played instead of a third set */
  stb?: boolean;
}

export type ParsedScore =
  | { status: 'ok'; sets: ParsedSet[]; winner: 1 | 2; retired: boolean }
  /** walkover / to be confirmed: published with the raw text, settles nothing (brief: «wo», «tbc») */
  | { status: 'wo' | 'tbc'; raw: string }
  | { status: 'invalid'; raw: string; reason: string };

/** v2 match_results.sets: winner first. */
export interface WinnerFirstSet {
  w: number;
  l: number;
  tb?: [number, number];
  stb?: boolean;
}

const RET = /\b(ret|retired|απ|αποχ)\.?$/i;

export function parseTennisScore(input: string): ParsedScore {
  const raw = input.trim();
  const low = raw.toLowerCase();
  if (/^(w\/?o|walk ?over)$/.test(low)) return { status: 'wo', raw };
  if (/^(tbc|tba|-|)$/.test(low)) return { status: 'tbc', raw };

  const retired = RET.test(low);
  let text = low.replace(RET, ' ');

  // "7-6(5)" / "76(5)": the bracket is the loser's tie-break points of that set; tag it onto the number before
  text = text.replace(/\s*\((\d+)\)/g, '#$1');

  const groups = text.match(/\d+(#\d+)?/g) ?? [];
  const sets: ParsedSet[] = [];
  let i = 0;
  while (i < groups.length) {
    const [g, tbRaw] = groups[i]!.split('#') as [string, string | undefined];
    const digits = g.length === 2 ? [Number(g[0]), Number(g[1])] : null;
    const isSetPair = digits !== null && isValidTennisSet(digits[0]!, digits[1]!);
    if (isSetPair) {
      sets.push(withTb({ a: digits![0]!, b: digits![1]! }, tbRaw));
      i += 1;
      continue;
    }
    const next = groups[i + 1];
    if (next === undefined) return { status: 'invalid', raw, reason: `«${g}» has no partner` };
    const [n, nTb] = next.split('#') as [string, string | undefined];
    sets.push(withTb({ a: Number(g), b: Number(n) }, nTb ?? tbRaw));
    i += 2;
  }
  if (sets.length === 0) return { status: 'invalid', raw, reason: 'no score' };

  // classify: normal sets, and a match tie-break as the third pair after 1-1
  let s1 = 0;
  let s2 = 0;
  for (let k = 0; k < sets.length; k += 1) {
    const s = sets[k]!;
    const decider = k === 2 && s1 === 1 && s2 === 1;
    if (isValidTennisSet(s.a, s.b)) {
      // a 7-6 or 6-x is a set even at 1-1
    } else if (decider && isValidMatchTiebreak(s.a, s.b)) {
      s.stb = true;
    } else if (!(retired && k === sets.length - 1)) {
      return { status: 'invalid', raw, reason: `set ${k + 1} ${s.a}-${s.b} is not a valid score` };
    }
    if (retired && k === sets.length - 1 && !s.stb && !isValidTennisSet(s.a, s.b)) break; // unfinished set
    if (s.a > s.b) s1 += 1;
    else if (s.b > s.a) s2 += 1;
    if ((s1 === 2 || s2 === 2) && k < sets.length - 1) {
      return { status: 'invalid', raw, reason: 'sets continue after the match was decided' };
    }
  }

  if (!retired) {
    if (s1 === 2 && s2 <= 1) return { status: 'ok', sets, winner: 1, retired: false };
    if (s2 === 2 && s1 <= 1) return { status: 'ok', sets, winner: 2, retired: false };
    return { status: 'invalid', raw, reason: `no winner from ${s1}-${s2} sets` };
  }
  // retired: the player who did not retire wins; the score alone cannot say who, so the side ahead is assumed
  // and the desk asks to confirm (see admin)
  const winner: 1 | 2 = s1 >= s2 ? 1 : 2;
  return { status: 'ok', sets, winner, retired: true };
}

function withTb(set: ParsedSet, tbRaw: string | undefined): ParsedSet {
  if (tbRaw === undefined) return set;
  const loserTb = Number(tbRaw);
  // the bracket holds the loser's points; the winner of the set won the tie-break by 2 (7 at least)
  const winnerTb = Math.max(7, loserTb + 2);
  return { ...set, tb: set.a > set.b ? [winnerTb, loserTb] : [loserTb, winnerTb] };
}

/** Side-1 sets to v2's winner-first form (match_results.sets). */
export function toWinnerFirst(sets: ParsedSet[], winner: 1 | 2): WinnerFirstSet[] {
  return sets.map((s) => {
    const out: WinnerFirstSet = winner === 1 ? { w: s.a, l: s.b } : { w: s.b, l: s.a };
    if (s.tb) out.tb = winner === 1 ? s.tb : [s.tb[1], s.tb[0]];
    if (s.stb) out.stb = true;
    return out;
  });
}

/** «6-3, 7-6(5), 10-8» from side 1's point of view, for previews. */
export function formatSets(sets: ParsedSet[]): string {
  return sets
    .map((s) => `${s.a}-${s.b}${s.tb ? `(${Math.min(s.tb[0], s.tb[1])})` : ''}`)
    .join(', ');
}

/**
 * A stored result (winner first) as the scoreboard shows it: «6-4, 6-7(5), 10-8».
 * The bracket holds the set loser's tie-break points. The words for a retirement and a walkover come
 * from the copy package (core holds no display text).
 */
export function formatWinnerSets(
  sets: WinnerFirstSet[],
  opts: { retired?: boolean; walkover?: boolean },
  words: { retired: string; walkover: string },
): string {
  if (opts.walkover) return words.walkover;
  const text = sets
    .map((s) => `${s.w}-${s.l}${s.tb && !s.stb ? `(${Math.min(s.tb[0], s.tb[1])})` : ''}`)
    .join(', ');
  return opts.retired ? `${text} ${words.retired}` : text;
}
