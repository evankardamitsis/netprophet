import { parseCategory, type Discipline } from './category';
import { parseSheetSide, type SheetPerson } from './names';
import { parseScore, type ScoreStatus, type SheetSet } from './score';

/**
 * Organiser order-of-play sheets, a port of parse_oop.py (tools/match-data/fixtures), checked against its
 * output on the TAF RACE 2026-2027 sheet. One tab per day, named «ΣΑΒ 26/09»; above the header row sit a
 * title with the date and the venue («... TENNIS ...»); the header row has ΩΡΑ, ΚΑΤΗΓΟΡΙΑ, PLAYER 1,
 * PLAYER 2, ΑΠΟΤΕΛΕΣΜΑ. Rows keep flags for the admin's review; nothing here decides a link to a player.
 */
const WEEKDAY: Record<string, number> = { ΔΕΥ: 0, ΔΕΥΤ: 0, ΤΡ: 1, ΤΡΙ: 1, ΤΡΙΤ: 1, ΤΕΤ: 2, ΠΕΜ: 3, ΠΑΡ: 4, ΣΑΒ: 5, ΚΥΡ: 6 };

export interface TabDay {
  weekday: string;
  /** «2026-09-26» */
  date: string;
  /** Monday 0 to Sunday 6 */
  dow: number;
}

/** «ΣΑΒ 26/09» in the season starting `seasonStartYear`: Aug to Dec that year, Jan to Jul the next */
export function tabDay(name: string, seasonStartYear: number): TabDay | null {
  const m = name.match(/^\s*([^\d\s]+)\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
  if (!m) return null;
  const d = Number(m[2]);
  const mo = Number(m[3]);
  const y = mo >= 8 && mo <= 12 ? seasonStartYear : seasonStartYear + 1;
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return { weekday: m[1]!, date: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dow: (t.getUTCDay() + 6) % 7 };
}

/** «20.30», «΄20:30», «21.00»: HH:MM, or null when there is no time */
export function sheetTime(s: string): string | null {
  const m = (s ?? '').match(/(\d{1,2})\s*[.:]\s*(\d{2})/);
  return m ? `${String(Number(m[1])).padStart(2, '0')}:${m[2]}` : null;
}

export interface SheetMatch {
  tab: string;
  date: string;
  time: string;
  venue: string;
  discipline: Discipline;
  level: string;
  categoryRaw: string;
  side1: string;
  side2: string;
  players: { side1: SheetPerson[]; side2: SheetPerson[] };
  scoreRaw: string;
  sets: SheetSet[];
  /** «2-1» */
  setsWon: string;
  winner: 1 | 2 | null;
  status: ScoreStatus;
  /** date|discipline|level|sides: the same match on any run gets the same fingerprint */
  fingerprint: string;
  /** sorted; see parse_oop.py for the list */
  flags: string[];
  /** set with possible_duplicate: the tab that has the same match and score */
  duplicateOf?: string;
  /** the club the match is played at, when the source names it (athenstennis.gr): its surface is the club's */
  club?: string;
  /** the court within the club («Court 1 PRC») */
  court?: string;
}

interface TabInput {
  name: string;
  /** the tab's rows as CSV cells */
  rows: string[][];
}

export function parseSheet(tabs: TabInput[], seasonStartYear: number): SheetMatch[] {
  const out: (SheetMatch & { dk: string })[] = [];
  for (const tab of tabs) {
    const day = tabDay(tab.name, seasonStartYear);
    if (!day) continue;
    let venue: string | null = null;
    let title: string | null = null;
    let header: string[] | null = null;
    let headerAt = -1;
    for (let i = 0; i < tab.rows.length; i += 1) {
      const cells = tab.rows[i]!.map((c) => c.trim());
      if (cells.some((c) => c === 'ΩΡΑ')) {
        header = cells;
        headerAt = i;
        break;
      }
      for (const c of cells) {
        if (/TENNIS/.test(c.toUpperCase())) venue = c;
        else if (/\d{1,2}\s*\/\s*\d{1,2}/.test(c) && title === null) title = c;
      }
    }
    const tabFlags = new Set<string>();
    const wd = WEEKDAY[day.weekday];
    if (wd === undefined) tabFlags.add('weekday_unknown');
    else if (wd !== day.dow) tabFlags.add('weekday_mismatch');
    if (title) {
      const m = title.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
      const [, mm, dd] = day.date.split('-');
      if (m && (Number(m[1]) !== Number(dd) || Number(m[2]) !== Number(mm))) tabFlags.add('title_date_mismatch');
    }
    if (!header) continue;
    const col = (...names: string[]) => {
      for (const n of names) {
        const i = header!.indexOf(n);
        if (i >= 0) return i;
      }
      return null;
    };
    const ci = { t: col('ΩΡΑ'), c: col('ΚΑΤΗΓΟΡΙΑ'), p1: col('PLAYER 1', 'ΠΑΙΚΤΗΣ 1'), p2: col('PLAYER 2', 'ΠΑΙΚΤΗΣ 2'), s: col('ΑΠΟΤΕΛΕΣΜΑ') };
    let prev: string | null = null;
    for (const r of tab.rows.slice(headerAt + 1)) {
      const cells = r.map((c) => c.trim());
      const g = (k: keyof typeof ci) => (ci[k] === null ? '' : cells[ci[k]!] ?? '');
      let t = sheetTime(g('t'));
      const p1 = g('p1');
      const p2 = g('p2');
      if (!p1 && !p2) {
        if (t) prev = t;
        continue;
      }
      const f = new Set(tabFlags);
      if (!t) {
        t = prev;
        f.add(prev ? 'time_inherited' : 'time_missing');
      } else prev = t;
      if (!p1 || !p2) f.add('missing_player');
      const cat = parseCategory(g('c'));
      let discipline = cat.discipline;
      cat.flags.forEach((x) => f.add(x));
      if (!g('c')) f.add('category_missing');
      // a doubles category, or the other side written with «/»: two words on a side are two players
      const doubles = discipline === 'MD' || discipline === 'WD' || discipline === 'XD' || p1.includes('/') || p2.includes('/');
      const a = parseSheetSide(p1, doubles);
      const b = parseSheetSide(p2, doubles);
      [...a.flags, ...b.flags].forEach((x) => f.add(x));
      if (a.pair !== b.pair) f.add('side_type_mismatch');
      if (a.pair || b.pair) {
        if (discipline === 'MS' || discipline === 'WS') {
          discipline = discipline === 'MS' ? 'MD' : 'WD';
          f.add('discipline_from_slash');
        }
      } else if (discipline === 'MD' || discipline === 'WD' || discipline === 'XD') f.add('discipline_side_mismatch');
      const score = parseScore(g('s'));
      score.flags.forEach((x) => f.add(x));
      const k1 = a.people.map((p) => p.key).sort().join('+');
      const k2 = b.people.map((p) => p.key).sort().join('+');
      const scoreRaw = g('s').replace(/\s+/g, ' ');
      out.push({
        tab: tab.name,
        date: day.date,
        time: t ?? '',
        venue: venue ?? '',
        discipline,
        level: cat.level,
        categoryRaw: g('c'),
        side1: p1,
        side2: p2,
        players: { side1: a.people, side2: b.people },
        scoreRaw,
        sets: score.sets,
        setsWon: `${score.won[0]}-${score.won[1]}`,
        winner: score.winner,
        status: score.status,
        fingerprint: [day.date, discipline, cat.level, ...[k1, k2].sort()].join('|'),
        flags: [...f],
        dk: JSON.stringify([discipline, cat.level, [k1, k2].sort(), scoreRaw.toLowerCase()]),
      });
    }
  }
  // the venue most rows share is this tournament; rows from another venue belong to another one
  const counts = new Map<string, number>();
  out.forEach((r) => counts.set(r.venue, (counts.get(r.venue) ?? 0) + 1));
  let major = '';
  let best = -1;
  counts.forEach((n, v) => {
    if (n > best) {
      best = n;
      major = v;
    }
  });
  const seen = new Map<string, string>();
  return out.map(({ dk, ...r }) => {
    const flags = new Set(r.flags);
    if (r.venue !== major) flags.add('other_tournament');
    let duplicateOf: string | undefined;
    if (seen.has(dk) && r.scoreRaw) {
      flags.add('possible_duplicate');
      duplicateOf = seen.get(dk);
    } else if (r.scoreRaw) seen.set(dk, r.tab);
    return { ...r, flags: [...flags].sort(), ...(duplicateOf ? { duplicateOf } : {}) };
  });
}
