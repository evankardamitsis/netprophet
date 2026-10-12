import { fold } from './text';
import { splitSide } from './names';
import { parseScore, type ParsedScore } from './score';
import { parseTime } from './time';

/**
 * One day of an organiser's order of play (one sheet tab, or one CSV): columns are found by their header
 * name (ΩΡΑ, ΚΑΤΗΓΟΡΙΑ, PLAYER 1, PLAYER 2, ΑΠΟΤΕΛΕΣΜΑ), never by position. The category stays as the
 * organiser wrote it; only singles vs doubles is derived («/» in a side). A blank time inherits the row above.
 */
export type Column = 'time' | 'category' | 'side1' | 'side2' | 'score' | 'court';

const HEADERS: Record<Column, string[]> = {
  time: ['ωρα', 'time', 'ωρα εναρξησ'],
  category: ['κατηγορια', 'category', 'κατ'],
  side1: ['player 1', 'player1', 'παικτησ 1', 'παικτησ1', 'αθλητησ 1', 'ομαδα 1'],
  side2: ['player 2', 'player2', 'παικτησ 2', 'παικτησ2', 'αθλητησ 2', 'ομαδα 2'],
  score: ['αποτελεσμα', 'score', 'result', 'σκορ'],
  court: ['γηπεδο', 'court', 'γηπ'],
};

export function findColumns(header: string[]): Partial<Record<Column, number>> {
  const out: Partial<Record<Column, number>> = {};
  header.forEach((h, i) => {
    const f = fold(h).replace(/[^α-ωa-z0-9 ]/g, '').trim();
    for (const [col, names] of Object.entries(HEADERS) as [Column, string[]][]) {
      if (out[col] === undefined && names.includes(f)) out[col] = i;
    }
  });
  return out;
}

export interface OopRow {
  /** 1-based row in the file, header included (for the review table and provenance) */
  row: number;
  time: string | null;
  categoryRaw: string;
  court: string | null;
  format: 'singles' | 'doubles';
  side1: string[];
  side2: string[];
  scoreRaw: string;
  score: ParsedScore;
}

export interface OopDay {
  rows: OopRow[];
  /** e.g. «missing column: PLAYER 2», «row 7: one side is empty» */
  warnings: string[];
}

export function parseDay(table: string[][]): OopDay {
  const warnings: string[] = [];
  const headerAt = table.findIndex((r) => {
    const c = findColumns(r);
    return c.side1 !== undefined && c.side2 !== undefined;
  });
  if (headerAt < 0) return { rows: [], warnings: ['missing columns: PLAYER 1 / PLAYER 2'] };
  const cols = findColumns(table[headerAt]!);
  if (cols.time === undefined) warnings.push('missing column: ΩΡΑ');
  const cell = (r: string[], c: Column) => (cols[c] === undefined ? '' : (r[cols[c]!] ?? '').trim());

  const rows: OopRow[] = [];
  let lastTime: string | null = null;
  table.slice(headerAt + 1).forEach((r, i) => {
    const rowNo = headerAt + i + 2;
    const s1 = cell(r, 'side1');
    const s2 = cell(r, 'side2');
    lastTime = parseTime(cell(r, 'time'), lastTime);
    if (s1 === '' && s2 === '') return;
    if (s1 === '' || s2 === '') {
      warnings.push(`row ${rowNo}: one side is empty`);
      return;
    }
    const side1 = splitSide(s1);
    const side2 = splitSide(s2);
    const scoreRaw = cell(r, 'score');
    rows.push({
      row: rowNo,
      time: lastTime,
      categoryRaw: cell(r, 'category'),
      court: cell(r, 'court') || null,
      format: side1.length > 1 || side2.length > 1 ? 'doubles' : 'singles',
      side1,
      side2,
      scoreRaw,
      score: parseScore(scoreRaw),
    });
  });
  return { rows, warnings };
}
