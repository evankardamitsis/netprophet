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
  /** «46 34 ret»: the match stopped; the winner is the side ahead when it stopped */
  retired?: boolean;
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

/**
 * A match tie-break written without a separator, «810», «107», «1210» (ΑΟΚ, 23 Oct): the one way to cut the digits
 * into a valid match tie-break, else null («1010» or «66» are not one).
 */
export function gluedTb(t: string): [number, number] | null {
  if (!isDigits(t) || t.length < 3 || t.length > 4) return null;
  const cuts: [number, number][] = [];
  for (let k = 1; k < t.length; k += 1) {
    const a = t.slice(0, k);
    const b = t.slice(k);
    // «07» is not how anyone writes 7 points
    if ((a.length > 1 && a[0] === '0') || (b.length > 1 && b[0] === '0')) continue;
    if (validTb(+a, +b)) cuts.push([+a, +b]);
  }
  return cuts.length === 1 ? cuts[0]! : null;
}

/**
 * «36-64-10-8», «63-5710-5» (ΑΟΚ): sets and the match tie-break run together with dashes. The leading two-digit
 * sets, then the tie-break as the last two numbers; a four-digit part that starts with a set is that set and the
 * tie-break's first number. Null when it does not read that way.
 */
function dashedRun(t: string): SheetSet[] | null {
  const raw = t.split('-');
  if (raw.length < 3 || !raw.every(isDigits)) return null;
  const parts: string[] = [];
  raw.forEach((p, i) => {
    if (p.length === 4 && i < raw.length - 1 && validSet(+p[0]!, +p[1]!)) parts.push(p.slice(0, 2), p.slice(2));
    else parts.push(p);
  });
  const sets: SheetSet[] = [];
  let i = 0;
  const isSet = (p: string | undefined) => p !== undefined && p.length === 2 && validSet(+p[0]!, +p[1]!);
  while (isSet(parts[i]) && (parts.length - i !== 2 || isSet(parts[i + 1]))) {
    sets.push({ g: [+parts[i]![0]!, +parts[i]![1]!], tb: false });
    i += 1;
  }
  const rest = parts.slice(i);
  if (rest.length === 2) sets.push({ g: [+rest[0]!, +rest[1]!], tb: true });
  else if (rest.length !== 0) return null;
  return sets.length >= 2 ? sets : null;
}

const finishedSet = (st: SheetSet) => (st.tb ? validTb(st.g[0], st.g[1]) : validSet(st.g[0], st.g[1]));

/**
 * A retirement, «46 34 ret», «26-01 RET», «3-0 ret», «06 03 ret»: the games as far as they went (the last set may be
 * unfinished, a single-digit «3-0» is games, not a tie-break). The winner is the side ahead when play stopped: more
 * finished sets, else more games in the unfinished last set; level is for staff. This is how staff decided all six
 * ΑΟΚ retirements by hand (10 to 22 Oct), and the draw sheet agrees where it has the match.
 */
function parseRetired(s: string): SheetScore {
  const flags = new Set<string>(['retired']);
  const toks = s.replace(/\bret(ired)?\b\.?/g, ' ').trim().split(/\s+/).filter(Boolean);
  const sets: SheetSet[] = [];
  const add = (a: number, b: number) => sets.push({ g: [a, b], tb: sets.length === 2 && Math.max(a, b) >= 8 });
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i]!;
    const parts = t.split('-');
    if (!parts.every(isDigits)) {
      flags.add('unparsed_score');
      continue;
    }
    if (parts.length === 1 && t.length === 2) add(+t[0]!, +t[1]!);
    else if (parts.length === 1 && t.length === 1 && i + 1 < toks.length && /^\d{1,2}$/.test(toks[i + 1]!)) {
      add(+t, +toks[i + 1]!);
      i += 1;
    } else if (parts.length === 2 && parts.every((p) => p.length === 2) && validSet(+parts[0]![0]!, +parts[0]![1]!)) {
      // «26-01»: a set, then the games of the next
      add(+parts[0]![0]!, +parts[0]![1]!);
      add(+parts[1]![0]!, +parts[1]![1]!);
    } else if (parts.length === 2 && parts.every((p) => p.length <= 2)) add(+parts[0]!, +parts[1]!);
    else if (parts.length > 2 && parts.every((p) => p.length === 2)) parts.forEach((p) => add(+p[0]!, +p[1]!));
    else flags.add('unparsed_score');
  }
  const won: [number, number] = [0, 0];
  sets.forEach((st) => {
    if (finishedSet(st)) won[st.g[0] > st.g[1] ? 0 : 1] += 1;
  });
  let winner: 1 | 2 | null = null;
  if (won[0] !== won[1]) winner = won[0] > won[1] ? 1 : 2;
  else {
    const last = sets[sets.length - 1];
    if (last && !finishedSet(last) && last.g[0] !== last.g[1]) winner = last.g[0] > last.g[1] ? 1 : 2;
  }
  if (sets.length === 0 || sets.length > 3 || flags.has('unparsed_score')) winner = null;
  if (winner === null) flags.add('retired_winner_unknown');
  return { sets, status: 'completed', winner, won, flags: [...flags], retired: true };
}

export function parseScore(raw: string | undefined): SheetScore {
  const flags = new Set<string>();
  let s = (raw ?? '').trim().toLowerCase();
  if (!s) return { sets: [], status: 'scheduled', winner: null, won: [0, 0], flags: [] };
  if (s.startsWith('wo')) return { sets: [], status: 'walkover', winner: null, won: [0, 0], flags: ['walkover_winner_unknown'] };
  // words, not a score («ΤΕΛΙΚΟΣ», «ΗΜΙΤΕΛΙΚΟΣ» over a match still to play)
  if (!/\d/.test(s)) return { sets: [], status: 'scheduled', winner: null, won: [0, 0], flags: [] };
  if (/\bret(ired)?\b/.test(s)) return parseRetired(s);
  const inc = s.includes('tbc');
  s = s.replace(/tbc/g, '').trim();
  const toks = s.split(/\s+/).filter(Boolean);
  const sets: SheetSet[] = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i]!;
    const run = t.split('-').length > 2 ? dashedRun(t) : null;
    const glued = sets.length === 2 && i === toks.length - 1 ? gluedTb(t) : null;
    if (run) sets.push(...run);
    else if (glued) sets.push({ g: glued, tb: true });
    else if (t.includes('-')) {
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
