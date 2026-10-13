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

export interface Draw {
  tab: string;
  title: string;
  discipline: Discipline;
  level: string;
  format: 'knockout' | 'round_robin';
  size: number;
  entrants: DrawEntrant[];
  rounds: DrawMatch[][];
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
  if (/ROUND ROBIN/i.test(title)) return { ...base, format: 'round_robin', size: 0, flags: ['round_robin_not_read'] };

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

/** every draw tab of a sheet; tabs that are not draws (no MAIN DRAW / ROUND ROBIN title) are skipped */
export function parseDraws(tabs: { name: string; rows: string[][] }[], seasonStartYear: number): Draw[] {
  return tabs.filter((t) => t.rows.some((r) => r.some((c) => /MAIN DRAW|ROUND ROBIN/i.test(c)))).map((t) => parseDraw(t, seasonStartYear));
}
