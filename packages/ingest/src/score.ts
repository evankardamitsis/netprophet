/**
 * Organiser scores, a port of parse_oop.py (tools/match-data/fixtures). Scores are written from side 1's point
 * of view: «63 76», «62 36 10 6», «75 16 14-16», «57 64 3-10», «57-26», «64-46 10-8», «wo», «44 tbc».
 * A two-digit token is one set; «57-26» is two sets; any other pair is a tie-break set (a match tie-break).
 */
export interface SheetSet {
  /** games, side 1 first */
  g: [number, number];
  /** a tie-break set (10-6, 14-16), not a 7-6 set */
  tb: boolean;
}

export type ScoreStatus = 'scheduled' | 'completed' | 'incomplete' | 'walkover';

export interface SheetScore {
  sets: SheetSet[];
  status: ScoreStatus;
  /** null for scheduled, incomplete, walkover (its winner is not in the sheet) and invalid scores */
  winner: 1 | 2 | null;
  /** sets won by side 1 and side 2 */
  won: [number, number];
  flags: string[];
}

const isDigits = (s: string) => /^\d+$/.test(s);

export function validSet(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6));
}

function validTb(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return hi >= 10 && hi - lo >= 2 && (hi === 10 || hi - lo === 2);
}

export function parseScore(raw: string | undefined): SheetScore {
  const flags = new Set<string>();
  let s = (raw ?? '').trim().toLowerCase();
  if (!s) return { sets: [], status: 'scheduled', winner: null, won: [0, 0], flags: [] };
  if (s.startsWith('wo')) return { sets: [], status: 'walkover', winner: null, won: [0, 0], flags: ['walkover_winner_unknown'] };
  const inc = s.includes('tbc');
  s = s.replace(/tbc/g, '').trim();
  const toks = s.split(/\s+/).filter(Boolean);
  const sets: SheetSet[] = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i]!;
    if (t.includes('-')) {
      const at = t.indexOf('-');
      const a = t.slice(0, at);
      const b = t.slice(at + 1);
      if (a.length === 2 && b.length === 2 && isDigits(a) && isDigits(b) && validSet(+a[0]!, +a[1]!) && validSet(+b[0]!, +b[1]!)) {
        sets.push({ g: [+a[0]!, +a[1]!], tb: false }, { g: [+b[0]!, +b[1]!], tb: false });
      } else if (isDigits(a) && isDigits(b)) sets.push({ g: [+a, +b], tb: true });
      else flags.add('unparsed_score');
    } else if (isDigits(t) && t.length === 2 && validSet(+t[0]!, +t[1]!)) {
      sets.push({ g: [+t[0]!, +t[1]!], tb: false });
    } else if (isDigits(t) && i + 1 < toks.length && isDigits(toks[i + 1]!)) {
      sets.push({ g: [+t, +toks[i + 1]!], tb: true });
      i += 1;
    } else flags.add('unparsed_score');
  }
  const won: [number, number] = [0, 0];
  sets.forEach((st, k) => {
    const [a, b] = st.g;
    let ok = st.tb ? validTb(a, b) : validSet(a, b);
    if (st.tb && k < 2) ok = false;
    if (!ok && !(inc && k === sets.length - 1)) flags.add('implausible_set');
    won[a > b ? 0 : 1] += a !== b ? 1 : 0;
  });
  if (inc) {
    flags.delete('unparsed_score');
    flags.add('incomplete_score');
    return { sets, status: 'incomplete', winner: null, won, flags: [...flags] };
  }
  let winner: 1 | 2 | null = null;
  if (Math.max(...won) === 2 && sets.length <= 3 && won[0] !== won[1]) winner = won[0] === 2 ? 1 : 2;
  else flags.add('invalid_match_outcome');
  return { sets, status: 'completed', winner, won, flags: [...flags] };
}

/** the database's shape: winner-first sets, a 7-6 marked tb, the match tie-break marked stb */
export interface DbSet {
  w: number;
  l: number;
  tb?: true;
  stb?: true;
}

export function toDbSets(sets: SheetSet[], winner: 1 | 2): DbSet[] {
  return sets.map((s) => {
    const [a, b] = s.g;
    const w = winner === 1 ? a : b;
    const l = winner === 1 ? b : a;
    if (s.tb) return { w, l, stb: true as const };
    return Math.max(w, l) === 7 && Math.min(w, l) === 6 ? { w, l, tb: true as const } : { w, l };
  });
}
