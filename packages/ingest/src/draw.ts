import { parseCategory, type Discipline } from './category';
import { parseSheetSide, sheetKey, type SheetPerson } from './names';
import { parseScore, type SheetSet } from './score';

/**
 * Organiser draw sheets: one tab per category («Μ 40+», «MD MASTER», «MIXED 45+»), each a knockout bracket the way
 * tennis draws are written (ΑΟΚ Κηφισιάς 2026, tools/match-data/fixtures/aok-kifisia-2026):
 * - the header row has the draw («Μ 40+ MAIN DRAW (32)») and each round's last day («ΕΩΣ 14/10») over its column;
 * - round 1 lists the entrants by draw number (column A), with the seed, «alt» and the name (column E); «ΒΥΕ» is a bye;
 * - each next round sits two columns to the right: the winner written between the pair, the score under it, or
 *   the match's day and time («ΔΕΥ 18.30») while it is still to play;
 * - SEEDS, ALTERNATES and ΠΡΟΚΡΙΜΑΤΙΚΑ below the bracket are ignored.
 * Round robin tabs («ROUND ROBIN») are recognised and left for later. Nothing here links a name to a player.
 */

export interface DrawEntrant {
  /** draw position, 1-based */
  pos: number;
  raw: string;
  people: SheetPerson[];
  seed: number | null;
  bye: boolean;
}

export interface DrawMatch {
  /** 1 = the first round */
  round: number;
  /** 1-based within the round, top to bottom */
  slot: number;
  side1: string | null;
  side2: string | null;
  /** 1 or 2 once the sheet writes who went through */
  winner: 1 | 2 | null;
  /** a bye: the other side goes through without playing */
  bye: boolean;
  scoreRaw: string;
  /** side 1 first */
  sets: SheetSet[];
  walkover: boolean;
  retired: boolean;
  /** «ΔΕΥ 18.30» as written, when the match is still to play */
  when: string;
  /** the round's last day, «2026-10-14» */
  deadline: string | null;
  flags: string[];
}

export interface GroupTeam {
  /** place in the group grid, 1-based */
  pos: number;
  raw: string;
  people: SheetPerson[];
}

export interface GroupMatch {
  /** positions of the two teams in the group */
  a: number;
  b: number;
  scoreRaw: string;
  /** team a first */
  sets: SheetSet[];
  /** 1 = team a, 2 = team b */
  winner: 1 | 2 | null;
  walkover: boolean;
  flags: string[];
}

export interface DrawGroup {
  /** «Όμιλος 1», by order (sheets often label every group «GROUP 1») */
  name: string;
  teams: GroupTeam[];
  matches: GroupMatch[];
  /** wins and played per team position, from the matches read */
  standings: { pos: number; won: number; played: number }[];
}

export interface Draw {
  tab: string;
  title: string;
  discipline: Discipline;
  level: string;
  format: 'knockout' | 'round_robin';
  size: number;
  entrants: DrawEntrant[];
  rounds: DrawMatch[][];
  /** round robin only */
  groups?: DrawGroup[];
  flags: string[];
}

const WEEKDAY = /^(ΔΕΥΤ|ΔΕΥ|ΤΡΙΤ|ΤΡΙ|ΤΡ|ΤΕΤ|ΠΕΜ|ΠΑΡ|ΣΑΒ|ΚΥΡ)(?=$|[\s.\d])/i;
const isBye = (s: string) => /^(bye|βυε|ΒΥΕ|BYE)$/i.test(s.trim()) || sheetKey(s) === 'βυε';
const isScore = (s: string) => /^\s*(w\.?o\.?|wo\b)/i.test(s) || /^[\d\s\-/()]+(ret\.?|r)?\s*$/i.test(s.trim());
const isWhen = (s: string) => WEEKDAY.test(s.trim()) || /^\d{1,2}[.:]\d{2}$/.test(s.trim());
const cell = (rows: string[][], r: number, c: number) => (rows[r]?.[c] ?? '').replace(/\s+/g, ' ').trim();

/** the season year of a «dd/mm» in a draw: Aug to Dec the start year, Jan to Jul the next */
function dayOf(ddmm: string, seasonStartYear: number): string | null {
  const m = ddmm.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = mo >= 8 ? seasonStartYear : seasonStartYear + 1;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** does a winner's name belong to this side (the sheet may shorten or respell it a little) */
function sameSide(name: string, side: string | null): boolean {
  if (!side) return false;
  const a = sheetKey(name).replace(/[^α-ωa-z/ ]/g, '');
  const b = sheetKey(side).replace(/[^α-ωa-z/ ]/g, '');
  if (a === b) return true;
  const first = (s: string) => s.split(/[ /]/).filter(Boolean)[0] ?? '';
  return first(a) !== '' && first(a) === first(b);
}

export function parseDraw(tab: { name: string; rows: string[][] }, seasonStartYear: number): Draw {
  const rows = tab.rows;
  const cat = parseCategory(tab.name);
  const flags: string[] = [];
  const head = rows.findIndex((r) => r.some((c) => /MAIN DRAW|ROUND ROBIN/i.test(c)));
  const title = head >= 0 ? (rows[head]!.find((c) => /MAIN DRAW|ROUND ROBIN/i.test(c)) ?? '').replace(/\s+/g, ' ').trim() : '';
  const base = { tab: tab.name, title, discipline: cat.discipline, level: cat.level, entrants: [] as DrawEntrant[], rounds: [] as DrawMatch[][] };
  if (/ROUND ROBIN/i.test(title) || rows.some((r) => /^GROUP\b/i.test((r[2] ?? '').trim()))) {
    const groups = parseGroups(rows);
    const entrants: DrawEntrant[] = groups.flatMap((g) => g.teams.map((t) => ({ pos: t.pos, raw: t.raw, people: t.people, seed: null, bye: false })));
    return { ...base, title: title || `${tab.name} ROUND ROBIN`, format: 'round_robin', size: entrants.length, entrants, groups, flags: groups.length ? [] : ['round_robin_empty'] };
  }

  // the deadlines over the round columns
  const deadline = new Map<number, string>();
  if (head >= 0) rows[head]!.forEach((c, i) => { const m = c.match(/ΕΩΣ\s*(\d{1,2}\s*\/\s*\d{1,2})/); if (m) deadline.set(i, dayOf(m[1]!, seasonStartYear) ?? ''); });

  // entrants: a draw number in column A and a name (or bye) in column E, above SEEDS / ALTERNATES
  const stop = rows.findIndex((r) => r.some((c) => /^(SEEDS|ALTERNATES)$/i.test(c.trim())));
  const entrantRows: { pos: number; row: number }[] = [];
  for (let r = 0; r < (stop >= 0 ? stop : rows.length); r += 1) {
    const n = cell(rows, r, 0);
    if (/^\d{1,3}$/.test(n) && r !== head) entrantRows.push({ pos: Number(n), row: r });
  }
  const sized = title.match(/\((\d+)\)/);
  const size = sized ? Number(sized[1]) : entrantRows.length;
  if (entrantRows.length !== size) flags.push('entrant_count_mismatch');
  const entrants: DrawEntrant[] = entrantRows.map(({ pos, row }) => {
    const raw = cell(rows, row, 4);
    const bye = raw === '' || isBye(raw);
    const seed = /^\d{1,2}$/.test(cell(rows, row, 2)) ? Number(cell(rows, row, 2)) : null;
    return { pos, raw: bye ? '' : raw, people: bye ? [] : parseSheetSide(raw).people, seed, bye };
  });

  // rounds: pair the slots, read the winner, score or time two columns to the right, between the pair
  type Slot = { name: string | null; bye: boolean; row: number };
  let slots: Slot[] = entrants.map((e, i) => ({ name: e.bye ? null : e.raw, bye: e.bye, row: entrantRows[i]!.row }));
  const rounds: DrawMatch[][] = [];
  for (let k = 1, col = 6; slots.length >= 2; k += 1, col += 2) {
    const next: Slot[] = [];
    const matches: DrawMatch[] = [];
    for (let i = 0; i + 1 < slots.length; i += 2) {
      const a = slots[i]!;
      const b = slots[i + 1]!;
      const lo = Math.min(a.row, b.row);
      const hi = Math.max(a.row, b.row);
      let winnerName = '';
      let winnerRow = Math.round((lo + hi) / 2);
      let scoreRaw = '';
      let when = '';
      for (let r = lo; r <= hi; r += 1) {
        const v = cell(rows, r, col);
        if (!v) continue;
        if (isScore(v)) scoreRaw = v;
        else if (isWhen(v)) when = v;
        else if (!winnerName) { winnerName = v; winnerRow = r; }
      }
      const m: DrawMatch = {
        round: k, slot: i / 2 + 1, side1: a.name, side2: b.name, winner: null, bye: a.bye || b.bye,
        scoreRaw, sets: [], walkover: false, retired: false, when, deadline: deadline.get(col) ?? null, flags: [],
      };
      if (m.bye) {
        m.winner = a.bye && !b.bye ? 2 : !a.bye && b.bye ? 1 : null;
      } else if (winnerName) {
        if (sameSide(winnerName, a.name)) m.winner = 1;
        else if (sameSide(winnerName, b.name)) m.winner = 2;
        else m.flags.push('winner_not_in_pair');
      }
      if (scoreRaw) {
        m.walkover = /^\s*w\.?o/i.test(scoreRaw);
        m.retired = /ret|\br\b/i.test(scoreRaw);
        if (!m.walkover) {
          let sets: SheetSet[];
          if (m.retired) {
            // a retirement: the sets as far as they went, the last one unfinished
            sets = (scoreRaw.replace(/ret\.?/gi, ' ').match(/\d+/g) ?? [])
              .filter((t) => t.length === 2)
              .map((t) => ({ g: [Number(t[0]), Number(t[1])] as [number, number], tb: false }));
          } else {
            const sc = parseScore(scoreRaw);
            sets = sc.sets;
            m.flags.push(...sc.flags);
          }
          // draws write the winner's games first: turn that into side 1 first
          m.sets = m.winner === 2 ? sets.map((s) => ({ ...s, g: [s.g[1], s.g[0]] as [number, number] })) : sets;
        }
      }
      if (!m.bye && m.winner === null && scoreRaw) m.flags.push('score_without_winner');
      matches.push(m);
      const through = m.winner === 1 ? a : m.winner === 2 ? b : null;
      next.push({ name: through ? through.name : null, bye: false, row: winnerRow });
    }
    rounds.push(matches);
    slots = next;
  }
  return { ...base, format: 'knockout', size, entrants, rounds, flags };
}

/**
 * Round robin groups: a «GROUP n» header row with the team numbers across, then one row per team (number in column
 * B, name in C, a pair split over two lines), and in the grid the score of the row team against the column team
 * (the row team's games first). Each pair is read once, from the upper half of the grid, or the lower half mirrored.
 */
function parseGroups(rows: string[][]): DrawGroup[] {
  const groups: DrawGroup[] = [];
  const raw = (r: number, c: number) => (rows[r]?.[c] ?? '').trim();
  for (let r = 0; r < rows.length; r += 1) {
    if (!/^GROUP\b/i.test(raw(r, 2))) continue;
    const cols: number[] = [];
    for (let c = 3; c < (rows[r]?.length ?? 0); c += 1) if (/^\d{1,2}$/.test(raw(r, c))) cols.push(c);
    const teams: GroupTeam[] = [];
    const teamRow = new Map<number, number>();
    for (let k = r + 1; k < rows.length && !/^GROUP\b/i.test(raw(k, 2)); k += 1) {
      const n = raw(k, 1);
      if (!/^\d{1,2}$/.test(n)) continue;
      const name = raw(k, 2).split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join(' / ');
      teamRow.set(Number(n), k);
      if (name) teams.push({ pos: Number(n), raw: name, people: parseSheetSide(name).people });
    }
    const colOf = (pos: number) => cols[pos - 1];
    const matches: GroupMatch[] = [];
    for (const ta of teams)
      for (const tb of teams) {
        if (tb.pos <= ta.pos) continue;
        const upper = colOf(tb.pos) !== undefined ? raw(teamRow.get(ta.pos)!, colOf(tb.pos)!) : '';
        const lower = colOf(ta.pos) !== undefined ? raw(teamRow.get(tb.pos)!, colOf(ta.pos)!) : '';
        const own = upper || lower;
        if (!own || !isScore(own)) continue;
        const flip = !upper;
        const wo = /^\s*w\.?o/i.test(own);
        const sc = wo ? null : parseScore(own);
        let sets = sc ? sc.sets : [];
        let winner: 1 | 2 | null = sc ? sc.winner : null;
        if (flip) {
          sets = sets.map((x) => ({ ...x, g: [x.g[1], x.g[0]] as [number, number] }));
          winner = winner === 1 ? 2 : winner === 2 ? 1 : null;
        }
        matches.push({ a: ta.pos, b: tb.pos, scoreRaw: own, sets, winner, walkover: wo, flags: sc ? sc.flags : wo ? ['walkover_winner_unknown'] : [] });
      }
    const standings = teams.map((t) => ({
      pos: t.pos,
      won: matches.filter((m) => (m.a === t.pos && m.winner === 1) || (m.b === t.pos && m.winner === 2)).length,
      played: matches.filter((m) => (m.a === t.pos || m.b === t.pos) && m.winner !== null).length,
    }));
    groups.push({ name: `Όμιλος ${groups.length + 1}`, teams, matches, standings });
  }
  return groups;
}

/** every draw tab of a sheet; tabs that are not draws (no MAIN DRAW / ROUND ROBIN title) are skipped */
export function parseDraws(tabs: { name: string; rows: string[][] }[], seasonStartYear: number): Draw[] {
  return tabs.filter((t) => t.rows.some((r) => r.some((c) => /MAIN DRAW|ROUND ROBIN/i.test(c)))).map((t) => parseDraw(t, seasonStartYear));
}
