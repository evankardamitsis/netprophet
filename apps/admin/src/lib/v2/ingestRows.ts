import { everydayFirst, toDbSets, type SheetMatch, type SheetPerson } from '@netprophet/ingest';

/**
 * The one place a parsed sheet match becomes the row the database takes (api.admin_import_matches,
 * api.admin_ingest_run, api.ingest_cron_run). Pure: used by the import desk and the scheduled/staff runs.
 */

/** the sheet's own spelling of a person, which the database remembers as an alias */
export const personName = (p: SheetPerson): string => `${p.surname} ${p.first}`.trim();

/** a person nobody has decided: the database links, queues for review or makes a new player */
export function unresolvedPerson(p: SheetPerson): object {
  return { raw: personName(p), surname: p.surname, first: p.first, first_alt: everydayFirst(p.first) };
}

/** rows another venue or a possible duplicate are left out unless staff tick them on the desk */
export function skippedByDefault(m: SheetMatch): boolean {
  return m.flags.includes('possible_duplicate') || m.flags.includes('other_tournament');
}

export interface RowOptions {
  /** the row number kept with the match for the review (the desk uses the position in the file plus one) */
  row: number;
  /** how a person is sent: the runs use unresolvedPerson, the desk sends its own decision */
  person: (p: SheetPerson) => object;
  /**
   * a walkover: 1 or 2 is the winner staff picked, 'queue' sends it without a winner (the database queues it for
   * staff), null or undefined sends no result.
   */
  walkover?: 1 | 2 | 'queue' | null;
}

type DbResult = { winner_side: 1 | 2; sets: ReturnType<typeof toDbSets>; walkover: boolean } | { walkover: true } | null;

function resultOf(m: SheetMatch, walkover: RowOptions['walkover']): DbResult {
  if (m.status === 'completed' && m.winner) return { winner_side: m.winner, sets: toDbSets(m.sets, m.winner), walkover: false };
  if (m.status === 'walkover') {
    if (walkover === 1 || walkover === 2) return { winner_side: walkover, sets: [], walkover: true };
    if (walkover === 'queue') return { walkover: true };
  }
  return null;
}

export function sheetMatchToRow(m: SheetMatch, opts: RowOptions) {
  return {
    fingerprint: m.fingerprint,
    date: m.date,
    time: m.time,
    discipline: m.discipline,
    level: m.level,
    category_raw: m.categoryRaw,
    tab: m.tab,
    row: opts.row,
    flags: m.flags,
    score_raw: m.scoreRaw,
    // the club decides the surface when the source names it; else the tournament's surface stands
    club: m.club ?? null,
    court: m.court ?? null,
    // the organiser wrote that the match is off for now (rain, a moved day): postponed until it comes back
    postponed: /αναβολ|βροχ|ακυρ|postpon|rain/.test(m.scoreRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
    side1: m.players.side1.map(opts.person),
    side2: m.players.side2.map(opts.person),
    result: resultOf(m, opts.walkover),
  };
}

/** the rows for a run: everything not skipped by default, people unresolved, a walkover queued for staff */
export function runRows(matches: SheetMatch[]) {
  return matches.flatMap((m, i) => (skippedByDefault(m) ? [] : [sheetMatchToRow(m, { row: i + 1, person: unresolvedPerson, walkover: 'queue' })]));
}

/**
 * The name that appears twice in one match once each person is resolved (`pick` gives a player id, or a key of its
 * own for a new player): two «ΣΥΜΠΑΙΚΤΗΣ» in a doubles row, or a wrong pick. The database refuses such a match.
 */
export function sameTwice(m: Pick<SheetMatch, 'players'>, pick: (p: SheetPerson) => string): string | null {
  const seen = new Set<string>();
  for (const p of [...m.players.side1, ...m.players.side2]) {
    const k = pick(p);
    if (seen.has(k)) return personName(p);
    seen.add(k);
  }
  return null;
}
