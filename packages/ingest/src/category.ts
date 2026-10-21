/**
 * Organiser categories into a discipline and a level, a port of parse_oop.py: «M MED/ADV», «M MED ADV»,
 * «MED/ADV» (no gender: men's singles, flagged), «M ROOKIES2» and «M ROOK 2» (ROOKIES 2), a Greek «Μ» that looks
 * like M (flagged). The raw text is kept too.
 */
export type Discipline = 'MS' | 'WS' | 'MD' | 'WD' | 'XD';

/*
 * One written form per category (18 Oct 2026: «60» and «60+» were the same age group on one schedule).
 * The database has the same function, core.normalize_category (supabase-v2/migrations/20270308000000), and both
 * run the vectors in packages/core/test-vectors/category.json, so keep the two in step.
 *   - spaces trimmed and collapsed, no space around «/»
 *   - senior age groups: «60», «60 +» → «60+» (a bare number only from 35 to 85 in steps of 5)
 *   - younger-than: «-40», «40-», «- 40», «U40» → «-40»; a range «40-54» keeps its dash
 *   - the words MASTER(S), MEDIUM, OPEN, ROOKIES, MED/ADV in capitals, with a Greek look-alike capital in a Latin
 *     word («ΜASTER») made Latin, a typed-twice letter («MMEDIUM») mended, MED → MEDIUM, ROOK(IE) 2 → ROOKIES 2
 *   - a Greek word with a Latin look-alike capital in it becomes all Greek
 * Everything else is left as it was written (dashes in «Regular Season 2026–27» included).
 */
const GREEK_LOOK = 'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ';
const LATIN_LOOK = 'ABEZHIKMNOPTYX';
const VOCAB = ['ADVANCED', 'MASTERS', 'ROOKIES', 'ROOKIE', 'MASTER', 'MEDIUM', 'OPEN', 'ROOK', 'ADV', 'MED'];
const DASH = '[-\u2212\u2013\u2014]';

const translate = (s: string, from: string, to: string): string => [...s].map((c) => { const i = from.indexOf(c); return i < 0 ? c : to[i]!; }).join('');
const squeeze = (s: string) => s.replace(/([A-Z])\1+/g, '$1');

function foldToken(t: string): string {
  const m = /^(\D*)(\d*)$/.exec(t);
  const word = m ? m[1]! : t;
  const digits = m ? m[2]! : '';
  const latin = translate(word, GREEK_LOOK, LATIN_LOOK).toUpperCase();
  if (/^[A-Z]+$/.test(latin)) {
    const exact = VOCAB.find((v) => v === latin);
    if (exact) return exact + digits;
    if (latin.length >= 5) {
      const near = VOCAB.find((v) => v.length >= 5 && squeeze(v) === squeeze(latin));
      if (near) return near + digits;
    }
  }
  // a Greek word (a Greek letter with no Latin twin in it): its Latin look-alikes become Greek
  if ([...t].some((c) => /[\u0370-\u03FF]/.test(c) && !GREEK_LOOK.includes(c))) return translate(t, LATIN_LOOK, GREEK_LOOK);
  return t;
}

export function normalizeCategory(raw: string): string {
  let s = raw.replace(/[\s\u00a0]+/g, ' ').trim();
  s = s.replace(/ ?\/ ?/g, '/');
  s = s.replace(/[^ /]+/g, foldToken);
  let m: RegExpExecArray | null;
  if ((m = /^(\d{2}) ?\+$/.exec(s))) return `${m[1]}+`;
  if ((m = /^(\d{2})$/.exec(s))) {
    const n = Number(m[1]);
    return n >= 35 && n <= 85 && n % 5 === 0 ? `${m[1]}+` : s;
  }
  if ((m = new RegExp(`^(\\d{2}) ?${DASH} ?(\\d{2})$`).exec(s))) return `${m[1]}-${m[2]}`;
  if ((m = new RegExp(`^${DASH} ?(\\d{2})$`).exec(s))) return `-${m[1]}`;
  if ((m = new RegExp(`^(\\d{2}) ?${DASH}$`).exec(s))) return `-${m[1]}`;
  if ((m = new RegExp(`^[Uu] ?${DASH}? ?(\\d{2})$`).exec(s))) return `-${m[1]}`;
  if ((m = /^ROOK(?:IES|IE)? ?(\d)?$/.exec(s))) return m[1] ? `ROOKIES ${m[1]}` : 'ROOKIES';
  if (/^MED[ /]ADV$/.test(s)) return 'MED/ADV';
  if (s === 'MED') return 'MEDIUM';
  return s;
}

const LOOKALIKES: Record<string, string> = { Μ: 'M', Ε: 'E', Ν: 'N', Χ: 'X', Α: 'A', Ο: 'O', Τ: 'T', Ρ: 'P', Ι: 'I', Δ: 'D' };
const GENDERS: Record<string, Discipline> = { MD: 'MD', WD: 'WD', XD: 'XD', MIXED: 'XD', WOMEN: 'WS', M: 'MS', W: 'WS' };

/**
 * The category as the sheet's words came out before normalizeCategory. Row fingerprints are built from this level,
 * so every match already stored under «date|disc|60|...» is still found; `parseCategory` is what everything else uses.
 */
export function parseCategoryRaw(raw: string): { discipline: Discipline; level: string; flags: string[] } {
  const flags: string[] = [];
  if (raw.includes('Μ')) flags.push('greek_mu_in_category');
  let s = [...raw].map((c) => LOOKALIKES[c] ?? c).join('').toUpperCase();
  s = s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
  const m = s.match(/^(MD|WD|XD|MIXED|WOMEN|M|W)(?![\p{L}\p{N}_])\s*(.*)$/u);
  let discipline: Discipline;
  let rest: string;
  if (m) {
    discipline = GENDERS[m[1]!]!;
    rest = m[2]!;
  } else {
    discipline = 'MS';
    rest = s;
    flags.push('gender_missing');
  }
  rest = rest.trim();
  const rookies = rest.match(/^ROOK(?:IES)?\s*(\d)$/);
  const level = rookies
    ? `ROOKIES ${rookies[1]}`
    : rest === 'MED/ADV' || rest === 'MED ADV'
      ? 'MED/ADV'
      : rest === 'MED'
        ? 'MEDIUM'
        : rest === ''
          ? 'OPEN'
          : rest;
  return { discipline, level, flags };
}

export function parseCategory(raw: string): { discipline: Discipline; level: string; flags: string[] } {
  const c = parseCategoryRaw(raw);
  return { ...c, level: normalizeCategory(c.level) };
}
