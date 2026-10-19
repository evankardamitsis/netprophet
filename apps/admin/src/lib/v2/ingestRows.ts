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

/**
 * The questions on a held match: one per unclear name, or one per place on the card when one spelling is two people
 * (a doubles with two «ΚΑΛΙΒΡΟΥΣΗΣ», founder 15 Oct). `key` keys the choice; `slot` («side:index») goes with the
 * decision so each place gets its own answer.
 */
export interface ReviewQuestion<U> {
  key: string;
  u: U;
  slot: string | null;
  label: string;
}

const placeWord = (n: number) => (n === 0 ? 'first' : n === 1 ? 'second' : `no. ${n + 1}`);

export function reviewQuestions<U extends { raw: string; slot?: string }>(
  row: { side1: { raw?: string }[]; side2: { raw?: string }[] },
  unclear: U[],
): ReviewQuestion<U>[] {
  // held since 15 Feb 2027: each held name knows its place («side:index»), one question each
  if (unclear.length > 0 && unclear.every((u) => !!u.slot)) {
    return unclear.map((u) => {
      const [side, index] = u.slot!.split(':');
      const twin = unclear.filter((o) => o.raw === u.raw && o.slot!.startsWith(`${side}:`)).length > 1;
      return { key: u.slot!, u, slot: u.slot!, label: twin ? `${u.raw} (${placeWord(Number(index))}, side ${side})` : u.raw };
    });
  }
  return unclear.flatMap((u): ReviewQuestion<U>[] => {
    const slots = ([1, 2] as const).flatMap((s) => (s === 1 ? row.side1 : row.side2).flatMap((p, i) => (p.raw === u.raw ? [`${s}:${i}`] : [])));
    if (slots.length <= 1) return [{ key: u.raw, u, slot: null, label: u.raw }];
    return slots.map((slot, n) => ({ key: slot, u, slot, label: `${u.raw} (${placeWord(n)}, side ${slot[0]})` }));
  });
}

/** a roster player offered for a held name, with what the database knows about them (newest holds only) */
export interface ReviewCandidate {
  id: string;
  first_name: string;
  surname: string;
  score: number;
  area_id?: string | null;
  /** score plus the context: same category, this tournament, the partner or opponent on the row */
  rank?: number;
  why?: string[];
  matches?: number;
  last_match?: string | null;
  categories?: { name: string; n: number }[];
  partners?: { id: string; name: string; n: number }[];
  same_category?: number;
  /** this entry has no matches and its first name starts the other's (or the other way round) */
  likely_duplicate_of?: string | null;
}

/** best first: the database's rank, else the name score */
export function rankCandidates<C extends { score: number; rank?: number }>(cands: C[]): C[] {
  return [...cands].sort((a, b) => (b.rank ?? b.score) - (a.rank ?? a.score));
}

const shortDay = (d: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T00:00:00Z`));

/** what tells two people with one surname apart, in a line: the categories they played, the last match, partners */
export function candidateContext(c: ReviewCandidate): string {
  if (c.matches === undefined) return '';
  if (c.matches === 0) return 'No matches yet';
  const cats = (c.categories ?? []).map((x) => `${x.name} ×${x.n}`).join(', ');
  const parts = [cats ? `Played ${cats}` : `${c.matches} ${c.matches === 1 ? 'match' : 'matches'}`];
  if (c.last_match) parts.push(`last ${shortDay(c.last_match)}`);
  if (c.partners && c.partners.length > 0) parts.push(`with ${c.partners.map((p) => (p.n > 1 ? `${p.name} (${p.n})` : p.name)).join(', ')}`);
  return parts.join(' · ');
}

/** two held places on one side with the same spelling (brothers): they can be answered together */
export function twinQuestions<U extends { raw: string }>(qs: ReviewQuestion<U>[]): [ReviewQuestion<U>, ReviewQuestion<U>][] {
  const out: [ReviewQuestion<U>, ReviewQuestion<U>][] = [];
  for (let i = 0; i < qs.length; i += 1)
    for (let j = i + 1; j < qs.length; j += 1) {
      const a = qs[i]!;
      const b = qs[j]!;
      if (a.slot && b.slot && a.slot[0] === b.slot[0] && a.u.raw === b.u.raw) out.push([a, b]);
    }
  return out;
}

/**
 * the pairs to offer for two places with one spelling, «Νίκος and Γιώργος»: partners who played together first,
 * then the best ranked; at most `max`
 */
export function pairOptions(cands: ReviewCandidate[], max = 3): { a: ReviewCandidate; b: ReviewCandidate; together: number }[] {
  const list = rankCandidates(cands);
  const pairs: { a: ReviewCandidate; b: ReviewCandidate; together: number; weight: number }[] = [];
  for (let i = 0; i < list.length; i += 1)
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i]!;
      const b = list[j]!;
      const together = a.partners?.find((p) => p.id === b.id)?.n ?? b.partners?.find((p) => p.id === a.id)?.n ?? 0;
      pairs.push({ a, b, together, weight: (a.rank ?? a.score) + (b.rank ?? b.score) });
    }
  return pairs
    .sort((x, y) => y.together - x.together || y.weight - x.weight)
    .slice(0, max)
    .map(({ a, b, together }) => ({ a, b, together }));
}

export type ReviewAnswer = { raw: string; slot?: string; player_id: string } | { raw: string; slot?: string; new: true };

/** one decision per question; `choice` holds a player id or `newKey` */
export function reviewAnswers<U extends { raw: string; slot?: string }>(qs: ReviewQuestion<U>[], choice: Record<string, string>, newKey: string): ReviewAnswer[] {
  return qs.map((q) => {
    const at = q.slot ? { slot: q.slot } : {};
    return choice[q.key] === newKey ? { raw: q.u.raw, ...at, new: true as const } : { raw: q.u.raw, ...at, player_id: choice[q.key]! };
  });
}
