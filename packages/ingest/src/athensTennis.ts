import { normalizeCategory, type Discipline } from './category';
import { sheetKey, type SheetPerson } from './names';
import type { SheetMatch } from './oop';
import type { SheetSet } from './score';

/**
 * athenstennis.gr/el/schedule (founder, 14 Oct): the Athens Tennis league's next days and every result of the season,
 * all in the one page the site renders. The page carries its data as a React Server Components payload
 * (`self.__next_f.push([1, "..."])`); this reads that payload, not the HTML, so a class name or layout change on the
 * site matters less. Upcoming matches come from the «Επόμενοι Αγώνες» days (date, club, rows); results from the
 * «Πρόσφατα Αποτελέσματα» days (one block per match, the phone layout read, the desktop copy skipped).
 * Every match becomes a SheetMatch, so the sheet runs' rows, name matching and results apply unchanged.
 */

type Node = unknown;
type El = ['$', string, string | null, Record<string, unknown>];

const DISCIPLINES: [RegExp, Discipline][] = [
  [/^men'?s singles/i, 'MS'],
  [/^women'?s singles/i, 'WS'],
  [/^men'?s doubles/i, 'MD'],
  [/^women'?s doubles/i, 'WD'],
  [/^mixed doubles/i, 'XD'],
];

const isEl = (n: Node): n is El => Array.isArray(n) && n.length === 4 && n[0] === '$' && typeof n[1] === 'string' && typeof n[3] === 'object' && n[3] !== null;
const cls = (n: El): string => (typeof n[3].className === 'string' ? n[3].className : '');

/** the RSC lines of the page: id → parsed JSON (text chunks and module lines that are not JSON are left out) */
export function rscLines(html: string): Map<string, Node> {
  let payload = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) payload += JSON.parse(`"${m[1]}"`) as string;
  // rows are `id:json\n`, except text rows `id:T<hex byte length>,<text>` that end where their length says (no newline)
  const bytes = new TextEncoder().encode(payload);
  const dec = new TextDecoder();
  const lines = new Map<string, Node>();
  let i = 0;
  while (i < bytes.length) {
    const colon = bytes.indexOf(0x3a, i);
    if (colon < 0) break;
    const id = dec.decode(bytes.subarray(i, colon)).trim();
    if (bytes[colon + 1] === 0x54) {
      const comma = bytes.indexOf(0x2c, colon);
      const len = parseInt(dec.decode(bytes.subarray(colon + 2, comma)), 16);
      i = comma + 1 + (Number.isFinite(len) ? len : 0);
      continue;
    }
    let end = bytes.indexOf(0x0a, colon);
    if (end < 0) end = bytes.length;
    const body = dec.decode(bytes.subarray(colon + 1, end));
    if (/^[0-9a-f]+$/.test(id) && /^[[{"]/.test(body)) {
      try {
        lines.set(id, JSON.parse(body) as Node);
      } catch {
        // a module or hint row: not one we read
      }
    }
    i = end + 1;
  }
  return lines;
}

/** walk a tree in document order, following "$L.." references to other lines */
function walk(n: Node, lines: Map<string, Node>, f: (n: Node) => boolean | void, seen = new Set<string>()): void {
  if (typeof n === 'string') {
    const ref = /^\$L([0-9a-f]+)$/.exec(n);
    if (ref && !seen.has(ref[1]!) && lines.has(ref[1]!)) {
      seen.add(ref[1]!);
      walk(lines.get(ref[1]!), lines, f, seen);
      return;
    }
    f(n);
    return;
  }
  if (f(n) === false) return;
  if (Array.isArray(n)) for (const x of n) walk(x, lines, f, seen);
  else if (n && typeof n === 'object') for (const x of Object.values(n)) walk(x, lines, f, seen);
}

/** the text a tree shows (element children only, never tags or class names) */
function texts(n: Node, lines: Map<string, Node>, seen = new Set<string>()): string[] {
  if (typeof n === 'number') return [String(n)];
  if (typeof n === 'string') {
    const ref = /^\$L([0-9a-f]+)$/.exec(n);
    if (ref) {
      if (seen.has(ref[1]!) || !lines.has(ref[1]!)) return [];
      seen.add(ref[1]!);
      return texts(lines.get(ref[1]!), lines, seen);
    }
    return n.startsWith('$') ? [] : [n];
  }
  if (isEl(n)) return texts(n[3].children, lines, seen);
  if (Array.isArray(n)) return n.flatMap((x) => texts(x, lines, seen));
  return [];
}

interface SitePlayer {
  id: string;
  name: string;
}

/** «Πρατσας Ιωαννης» (surname first), «Κ. Κοροπουλη» (initial, surname); the H2H links give the real split when they have it */
function person(p: SitePlayer, known: Map<string, { first: string; last: string }>): SheetPerson {
  const k = known.get(p.id);
  let surname: string;
  let first: string;
  if (k) {
    surname = k.last.trim();
    first = k.first.trim();
  } else if (/^\p{L}{1,2}\.\s*/u.test(p.name)) {
    const m = /^(\p{L}{1,2}\.)\s*(.+)$/u.exec(p.name)!;
    first = m[1]!;
    surname = m[2]!.trim();
  } else {
    const [s, ...rest] = p.name.trim().split(/\s+/);
    surname = s ?? '';
    first = rest.join(' ');
  }
  return { surname, first, key: sheetKey(`${surname} ${first}`) };
}

/** «Men's Singles | Regular Season | 2026–27»; the AT Knockouts say only «ATRP 2.5 — AT 250 @ PRC» (singles or doubles by the sides) */
function category(raw: string, perSide: number): { discipline: Discipline; level: string; flags: string[] } | null {
  const t = raw.trim();
  const ko = /^ATRP\s*([\d.]+)\s*[—–-]\s*(.+)$/i.exec(t);
  if (ko) return { discipline: perSide > 1 ? 'MD' : 'MS', level: `${ko[2]!.trim()} ATRP ${ko[1]}`, flags: ['discipline_from_sides'] };
  for (const [re, d] of DISCIPLINES) {
    if (re.test(t)) {
      const level = t.replace(re, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      return { discipline: d, level, flags: [] };
    }
  }
  return null;
}

interface RowParts {
  time: string;
  sides: [SitePlayer[], SitePlayer[]];
  winner: 1 | 2 | null;
  sets: SheetSet[];
  categoryRaw: string;
  court: string;
}

function players(n: Node, lines: Map<string, Node>): SitePlayer[] {
  const out: SitePlayer[] = [];
  walk(n, lines, (x) => {
    if (isEl(x) && typeof x[3].href === 'string') {
      const m = /^\/(?:el|en)\/players\/(\d+)$/.exec(x[3].href);
      if (m && typeof x[3].children === 'string' && !out.some((p) => p.id === m[1])) out.push({ id: m[1]!, name: x[3].children });
    }
  });
  return out;
}

function readRow(row: Node, lines: Map<string, Node>): RowParts | null {
  let time = '';
  let categoryRaw = '';
  let court = '';
  const containers: El[] = [];
  const sets: SheetSet[] = [];
  let vsSplit: [SitePlayer[], SitePlayer[]] | null = null;
  walk(row, lines, (x) => {
    if (typeof x === 'string') {
      if (x.startsWith('$')) return;
      if (!time && /^\d{1,2}:\d{2}$/.test(x)) time = x.padStart(5, '0');
      if (!categoryRaw && (/(singles|doubles)/i.test(x) || /^ATRP\s*[\d.]+\s*[—–-]/i.test(x)) && x.length < 80) categoryRaw = x;
      return;
    }
    if (!isEl(x)) return;
    const c = cls(x);
    if (c.startsWith('space-y-0.5')) {
      containers.push(x);
      return false;
    }
    if (c === 'flex items-center gap-2' && Array.isArray(x[3].children) && Array.isArray((x[3].children as Node[])[0]) && !isEl((x[3].children as Node[])[0])) {
      const [main, stb] = x[3].children as Node[];
      for (const s of Array.isArray(main) ? main : []) {
        const n = texts(s, lines).filter((v) => /^\d+$/.test(v)).map(Number);
        if (n.length >= 2) sets.push({ g: [n[0]!, n[1]!], tb: false });
      }
      if (stb) {
        const n = texts(stb, lines).filter((v) => /^\d+$/.test(v)).map(Number);
        if (n.length >= 2) sets.push({ g: [n[0]!, n[1]!], tb: true });
      }
      return false;
    }
    if (!court && /text-gray-500/.test(c) && /(break-words|text-right)/.test(c)) {
      const t = texts(x, lines).join('').trim();
      if (t && !/:/.test(t)) court = t.replace(/\s*·\s*$/, '');
    }
    return undefined;
  });
  let sides: [SitePlayer[], SitePlayer[]];
  let winner: 1 | 2 | null = null;
  if (containers.length >= 2) {
    sides = [players(containers[0], lines), players(containers[1], lines)];
    const won = containers.slice(0, 2).map((c) => {
      let w = false;
      walk(c, lines, (x) => {
        if (isEl(x) && /font-semibold text-gray-900/.test(cls(x))) w = true;
      });
      return w;
    });
    if (won[0] !== won[1]) winner = won[0] ? 1 : 2;
  } else {
    // upcoming rows: the people either side of «vs»
    const seq: (SitePlayer | 'vs')[] = [];
    walk(row, lines, (x) => {
      if (isEl(x) && x[3].children === 'vs') seq.push('vs');
      else if (isEl(x) && typeof x[3].href === 'string') {
        const m = /^\/(?:el|en)\/players\/(\d+)$/.exec(x[3].href);
        if (m && typeof x[3].children === 'string') seq.push({ id: m[1]!, name: x[3].children });
      }
    });
    const at = seq.indexOf('vs');
    if (at < 0) return null;
    vsSplit = [seq.slice(0, at) as SitePlayer[], seq.slice(at + 1).filter((p): p is SitePlayer => p !== 'vs')];
    sides = vsSplit;
  }
  if (sides[0].length === 0 || sides[1].length === 0) return null;
  if (!winner && sets.length > 0) {
    const won = sets.reduce((a, s) => a + (s.g[0] > s.g[1] ? 1 : s.g[0] < s.g[1] ? -1 : 0), 0);
    winner = won > 0 ? 1 : won < 0 ? 2 : null;
  }
  return { time, sides, winner, sets, categoryRaw, court };
}

function toMatch(date: string, club: string, r: RowParts, known: Map<string, { first: string; last: string }>): SheetMatch | null {
  const n = r.sides[0].length;
  // uneven sides: not a match we can record
  if (n !== r.sides[1].length || n > 2) return null;
  const cat = category(r.categoryRaw, n);
  if (!cat) return null;
  // the site sometimes files a singles match under a doubles category (28 Sep, «Men's Doubles», one player a side):
  // the people decide
  const doublesBySides = n === 2;
  if ((cat.discipline === 'MS' || cat.discipline === 'WS') !== !doublesBySides) {
    const swap: Record<Discipline, Discipline> = { MS: 'MD', WS: 'WD', MD: 'MS', WD: 'WS', XD: 'MS' };
    cat.discipline = swap[cat.discipline];
    if (!cat.flags.includes('discipline_from_sides')) cat.flags = [...cat.flags, 'discipline_from_sides'];
  }
  const side1 = r.sides[0].map((p) => person(p, known));
  const side2 = r.sides[1].map((p) => person(p, known));
  const k1 = side1.map((p) => p.key).join(' / ');
  const k2 = side2.map((p) => p.key).join(' / ');
  // a retirement shows the score where it stopped («1-6 0-0», «4-6 4-3 [0-0]»): no result, flagged for staff
  const finished = (st: SheetSet) => {
    const [hi, lo] = [Math.max(...st.g), Math.min(...st.g)];
    return st.tb ? hi >= 10 && hi - lo >= 2 : (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6));
  };
  const retired = r.sets.length > 0 && (!r.sets.every(finished) || Math.max(r.sets.filter((st) => st.g[0] > st.g[1]).length, r.sets.filter((st) => st.g[1] > st.g[0]).length) < 2);
  const done = r.sets.length > 0 && r.winner !== null && !retired;
  const scoreRaw = r.sets.map((s) => (s.tb ? `[${s.g[0]}-${s.g[1]}]` : `${s.g[0]}-${s.g[1]}`)).join(' ');
  const won1 = r.sets.filter((s) => s.g[0] > s.g[1]).length;
  const won2 = r.sets.filter((s) => s.g[1] > s.g[0]).length;
  const venue = [r.court, club].filter(Boolean).join(' · ');
  return {
    tab: club,
    date,
    time: r.time,
    venue,
    discipline: cat.discipline,
    level: normalizeCategory(cat.level),
    categoryRaw: r.categoryRaw.trim(),
    side1: side1.map((p) => `${p.surname} ${p.first}`.trim()).join(' / '),
    side2: side2.map((p) => `${p.surname} ${p.first}`.trim()).join(' / '),
    players: { side1, side2 },
    scoreRaw,
    sets: r.sets,
    setsWon: done ? `${won1}-${won2}` : '',
    winner: done ? r.winner : null,
    status: done ? 'completed' : retired ? 'incomplete' : 'scheduled',
    fingerprint: ['at', date, cat.discipline, cat.level, ...[k1, k2].sort()].join('|'),
    flags: retired ? [...cat.flags, 'retired'] : cat.flags,
    ...(club ? { club } : {}),
    ...(r.court ? { court: r.court } : {}),
  };
}

/** every upcoming match and every result on the page, oldest first */
export function parseAthensTennis(html: string): SheetMatch[] {
  const lines = rscLines(html);
  const known = new Map<string, { first: string; last: string }>();
  const out: SheetMatch[] = [];
  const seen = new Set<string>();
  const add = (m: SheetMatch | null) => {
    if (m && !seen.has(m.fingerprint)) {
      seen.add(m.fingerprint);
      out.push(m);
    }
  };
  // the H2H buttons name both players properly (first and last name apart)
  for (const n of lines.values()) {
    walk(n, lines, (x) => {
      if (isEl(x) && x[3].player1 && x[3].player2) {
        for (const i of [1, 2] as const) {
          const id = x[3][`player${i}Id`];
          const p = x[3][`player${i}`] as { firstName?: string; lastName?: string };
          if (id != null && p?.lastName) known.set(String(id), { first: p.firstName ?? '', last: p.lastName });
        }
      }
    });
  }
  for (const n of lines.values()) {
    walk(n, lines, (x) => {
      // results: one block per day, keyed by the date
      if (isEl(x) && x[1] === 'div' && typeof x[2] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x[2]) && Array.isArray(x[3].children)) {
        const date = x[2];
        for (const ref of x[3].children as Node[]) {
          let mobile: Node = ref;
          walk(ref, lines, (y) => {
            if (isEl(y) && cls(y).startsWith('sm:hidden')) {
              mobile = y;
              return false;
            }
            return undefined;
          });
          const r = readRow(mobile, lines);
          if (!r) continue;
          // the club follows the court: «Court 1 PRC · PRC (Μαρούσι)»
          const [court, club] = r.court.includes('·') ? r.court.split('·').map((s) => s.trim()) : [r.court, ''];
          add(toMatch(date, club ?? '', { ...r, court: court ?? '' }, known));
        }
        return false;
      }
      // upcoming: {dateKey, venues: [{club, rows}]}
      if (x && typeof x === 'object' && !Array.isArray(x) && Array.isArray((x as Record<string, unknown>).days)) {
        for (const day of (x as { days: { dateKey?: string; venues?: { club?: string; rows?: Node[] }[] }[] }).days) {
          if (!day.dateKey) continue;
          for (const v of day.venues ?? []) {
            for (const row of v.rows ?? []) {
              const r = readRow(row, lines);
              if (r) add(toMatch(day.dateKey, v.club ?? '', r, known));
            }
          }
        }
        return false;
      }
      return undefined;
    });
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
