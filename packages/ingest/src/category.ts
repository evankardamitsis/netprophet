/**
 * Organiser categories into a discipline and a level, a port of parse_oop.py: «M MED/ADV», «M MED ADV»,
 * «MED/ADV» (no gender: men's singles, flagged), «M ROOKIES2» and «M ROOK 2» (ROOKIES 2), a Greek «Μ» that looks
 * like M (flagged). The raw text is kept too.
 */
export type Discipline = 'MS' | 'WS' | 'MD' | 'WD' | 'XD';

const LOOKALIKES: Record<string, string> = { Μ: 'M', Ε: 'E', Ν: 'N', Χ: 'X', Α: 'A', Ο: 'O', Τ: 'T', Ρ: 'P', Ι: 'I', Δ: 'D' };
const GENDERS: Record<string, Discipline> = { MD: 'MD', WD: 'WD', XD: 'XD', MIXED: 'XD', WOMEN: 'WS', M: 'MS', W: 'WS' };

export function parseCategory(raw: string): { discipline: Discipline; level: string; flags: string[] } {
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
