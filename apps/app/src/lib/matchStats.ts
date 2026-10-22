import { stripAccents, type Copy } from '@netprophet/copy';
import type { MatchStatsMore, MatchStatsPeriod, MyMatchStats, StatsPerson } from '@netprophet/db';
import { ROUND_KEYS, roundLabel } from './feed';
import { scoreText } from './season';
import { fmt } from './votes';

/**
 * «Τα στατιστικά σου»: your real matches as words, numbers and bar lengths. Pure; the screen only lays these out.
 * The database decides what is known (api.my_match_stats); a block it sends as null or empty is left out, so the
 * screen never shows an empty box. Votes, points and σερί never come here: they live on «Οι προβλέψεις σου».
 * Founder, 20 Oct 2026: a Pro feature, in detail, pro player like; every block in its own form.
 */

export type StatsFormat = 'singles' | 'doubles';
export const PERIODS: readonly MatchStatsPeriod[] = ['all', 'year', '12m'];
export const FORMATS: readonly StatsFormat[] = ['singles', 'doubles'];

/** a won-lost line with its bar */
export interface BarRow {
  key: string;
  label: string;
  /** «5-2» */
  value: string;
  /** «71%», or null */
  pct: string | null;
  /** the share won (0 to 1); null: no bar */
  share: number | null;
  /** a quiet line under the label */
  note: string | null;
}

/** one tile of «Στιγμές πίεσης»: «4/6» (won of played), «2-1» or a count */
export interface PressureTile {
  key: string;
  label: string;
  value: string;
  /** the share won, for the thin bar; null when it is a plain count */
  share: number | null;
  note: string;
}

export interface RoundRow {
  key: string;
  label: string;
  won: number;
  lost: number;
  value: string;
  /** how far up the draw: 0 first round, 1 the final; organisers' own words sit at 0 */
  depth: number;
}

export interface MonthBar {
  key: string;
  /** «Οκτ» */
  label: string;
  won: number;
  lost: number;
  /** the column's height against the busiest month (0 to 1) */
  height: number;
}

export interface PersonRow {
  key: string;
  name: string;
  /** «ΧΚ» for the ball */
  initials: string;
  /** «3 ματς μαζί» */
  meta: string;
  value: string;
  share: number | null;
}

export interface BestWin {
  key: string;
  /** the other side */
  names: string;
  score: string;
  /** tournament · round · date */
  meta: string | null;
  /** «Παρτενέρ: Π. Δρόσος» in doubles */
  partner: string | null;
}

export interface TournamentRow {
  key: string;
  name: string;
  /** «2026 · 5 ματς» */
  meta: string;
  value: string;
  /** «Ημιτελικός · ήττα»; null when no round is known */
  line: string | null;
  champion: boolean;
}

export type StatBlock =
  | { kind: 'sets'; key: 'sets'; title: string; rows: BarRow[] }
  | { kind: 'pressure'; key: 'pressure'; title: string; tiles: PressureTile[] }
  | { kind: 'surface'; key: 'surface'; title: string; rows: (BarRow & { surface: string })[] }
  | { kind: 'splits'; key: 'category'; title: string; rows: BarRow[] }
  | { kind: 'rounds'; key: 'rounds'; title: string; note: string; rows: RoundRow[] }
  | { kind: 'kinds'; key: 'kinds'; title: string; rows: BarRow[] }
  | { kind: 'months'; key: 'months'; title: string; note: string; bars: MonthBar[] }
  | { kind: 'people'; key: 'partners' | 'opponents'; title: string; note: string; rows: PersonRow[] }
  | { kind: 'bestWins'; key: 'best_wins'; title: string; note: string; wins: BestWin[] }
  | { kind: 'tournaments'; key: 'tournaments'; title: string; rows: TournamentRow[]; more: string | null; champion: string };

export type BlockKey = StatBlock['key'];

/** the order a player asks in (founder's mockup, 20 Oct 2026); the free teaser lists the same titles */
export const BLOCK_ORDER: readonly BlockKey[] = [
  'sets',
  'pressure',
  'surface',
  'category',
  'rounds',
  'kinds',
  'months',
  'partners',
  'opponents',
  'best_wins',
  'tournaments',
];

export interface StatsHero {
  /** «Διπλά» */
  format: string;
  won: number;
  lost: number;
  /** «2 ματς» */
  played: string;
  /** «71%», «-» */
  pct: string;
  /** lime only when it is earned: a win is in it */
  pctEarned: boolean;
  /** Pro: wins in a row now and the best run; null for free */
  runs: { current: number; best: number } | null;
}

export interface MatchStatsView {
  pro: boolean;
  noPlayer: boolean;
  /** a player, but no match in this format and period */
  empty: boolean;
  hero: StatsHero;
  /** Pro: the blocks that have something to show, in BLOCK_ORDER; empty for free */
  blocks: StatBlock[];
  /** free: the rest behind the Pro lock */
  locked: boolean;
}

/** «5-2» */
export const wl = (won: number, lost: number) => `${won}-${lost}`;

/** the share won, for a bar; null when nothing was played */
export function share(won: number, lost: number): number | null {
  const n = won + lost;
  return n > 0 ? won / n : null;
}

/** «65%», or «-» when unknown */
export function pctText(pct: number | null | undefined, t: Copy): string {
  return pct === null || pct === undefined ? '-' : fmt(t.matchStats.pct, { n: pct });
}

/** «65%» from won and lost; null when nothing was played */
export function pctOf(won: number, lost: number, t: Copy): string | null {
  const s = share(won, lost);
  return s === null ? null : pctText(Math.round(s * 100), t);
}

/** one or many: «1 τουρνουά», «3 τουρνουά» */
const plural = (forms: { one: string; many: string }, n: number) => (n === 1 ? forms.one : fmt(forms.many, { n }));

/** '2026-10' → «Οκτ» */
export function monthName(key: string, t: Copy): string {
  const i = Number(key.slice(5, 7)) - 1;
  return t.matchStats.monthsShort[i] ?? key.slice(5, 7);
}

/** '2026-10' → «Οκτ 2026» */
export function monthShort(key: string, t: Copy): string {
  return `${monthName(key, t)} ${key.slice(0, 4)}`;
}

/** '2026-09-14…' → «14 Σεπ 2026» */
export function dayShort(iso: string, t: Copy): string {
  return `${Number(iso.slice(8, 10))} ${monthShort(iso.slice(0, 7), t)}`;
}

/** «Νίκος Ψηλός», pairs joined: «Νίκος Ψηλός και Γιώργος Μέσος» */
export function peopleNames(people: Pick<StatsPerson, 'first_name' | 'surname'>[], t: Copy): string {
  return people.map((p) => `${p.first_name} ${p.surname}`.trim()).join(t.matchStats.and);
}

/** «Χ. Καραγιανίδης»: for lists where two names share a line */
export function shortName(p: Pick<StatsPerson, 'first_name' | 'surname'>): string {
  const first = p.first_name.trim();
  const surname = p.surname.trim();
  if (!surname) return first;
  if (!first) return surname;
  return `${first.charAt(0)}. ${surname}`;
}

/** one person in full; two or more as «Χ. Καραγιανίδης και Ν. Ροδίτης» so the pair fits */
export function sideNames(people: Pick<StatsPerson, 'first_name' | 'surname'>[], t: Copy): string {
  return people.length > 1 ? people.map(shortName).join(t.matchStats.and) : peopleNames(people, t);
}

/** «ΧΚ» for the initials ball */
export function initialsOf(p: Pick<StatsPerson, 'first_name' | 'surname'>): string {
  return `${p.first_name.trim().charAt(0)}${p.surname.trim().charAt(0)}`;
}

/** a final, as stored by imports ('final') or typed by an organiser («Τελικός») */
export function isFinalRound(round: string | null): boolean {
  if (!round) return false;
  const r = stripAccents(round).trim().toLowerCase();
  return r === 'final' || r === 'τελικος' || r === 'τελικο';
}

/** how far you went in a tournament, from your last match there: «Το πήρες!», «Ημιτελικός · ήττα», or null */
export function tournamentStop(x: { last_round: string | null; last_won: boolean }, t: Copy): string | null {
  if (x.last_won && isFinalRound(x.last_round)) return t.matchStats.tour.champion;
  const round = roundLabel(x.last_round, t);
  if (!round) return null;
  return `${round} · ${x.last_won ? t.matchStats.tour.won : t.matchStats.tour.lost}`;
}

/** the record and how far you went, on one line: «3-1 · Ημιτελικός · ήττα» */
export function tournamentLine(x: { won: number; lost: number; last_round: string | null; last_won: boolean }, t: Copy): string {
  const stop = tournamentStop(x, t);
  return stop ? `${wl(x.won, x.lost)} · ${stop}` : wl(x.won, x.lost);
}

const roundPos = (k: string) => (ROUND_KEYS as readonly string[]).indexOf(k);

/** rounds in draw order (first round to the final); an organiser's own words keep the database's order, after them */
export function byRoundOrder<T extends { key: string }>(rounds: T[]): T[] {
  const pos = (k: string) => {
    const i = roundPos(k);
    return i >= 0 ? i : ROUND_KEYS.length;
  };
  return rounds.map((r, i) => ({ r, i })).sort((a, b) => pos(a.r.key) - pos(b.r.key) || a.i - b.i).map((x) => x.r);
}

/** open on the format you play most (founder, 20 Oct: 0 singles and 2 doubles opened on an empty Μονά); a tie stays on singles */
export function pickFormat(data: Pick<MyMatchStats, 'singles' | 'doubles'>): StatsFormat {
  return data.doubles.played > data.singles.played ? 'doubles' : 'singles';
}

/** «Διπλά · 2» */
export function formatLabel(data: Pick<MyMatchStats, 'singles' | 'doubles'>, format: StatsFormat, t: Copy): string {
  return fmt(t.matchStats.formatCount, { label: t.matchStats.formats[format], n: data[format].played });
}

/**
 * The form squares: your last matches in this format (and period), oldest first so the newest sits on the right.
 * `last` is newest first, as the profile sends it (at most five, over both formats).
 */
export function formSquares(last: { win: boolean; format: StatsFormat; startsAt: string }[], format: StatsFormat, from: string | null): boolean[] {
  return last
    .filter((m) => m.format === format && (!from || m.startsAt.slice(0, 10) >= from))
    .map((m) => m.win)
    .reverse();
}

const bar = (key: string, label: string, won: number, lost: number, t: Copy, note: string | null = null): BarRow => ({
  key,
  label,
  value: wl(won, lost),
  pct: pctOf(won, lost, t),
  share: share(won, lost),
  note,
});

const hasWL = (x: { won: number; lost: number }) => x.won + x.lost > 0;

/** «Στιγμές πίεσης»: each tile only when it happened at least once */
export function pressureTiles(m: MatchStatsMore, t: Copy): PressureTile[] {
  const r = t.matchStats.rows;
  const out: PressureTile[] = [];
  const pw = (key: string, label: string, x: { played: number; won: number } | null, note: string) => {
    if (x && x.played > 0) out.push({ key, label, value: `${x.won}/${x.played}`, share: x.won / x.played, note });
  };
  const count = (key: string, label: string, n: number, note: string) => {
    if (n > 0) out.push({ key, label, value: String(n), share: null, note });
  };
  pw('deciding', r.deciding, m.deciding, fmt(r.decidingNote, { n: m.best_of }));
  pw('tiebreaks', r.tiebreaks, m.tiebreaks, r.tiebreaksNote);
  pw('super_tiebreaks', r.superTiebreaks, m.super_tiebreaks, r.superTiebreaksNote);
  pw('comebacks', r.comebacks, m.first_set_lost, r.comebacksNote);
  pw('holding', r.holding, m.first_set_won, r.holdingNote);
  count('straight_won', r.straightWon, m.straight.won, r.straightWonNote);
  count('straight_lost', r.straightLost, m.straight.lost, r.straightLostNote);
  if (hasWL(m.retired)) out.push({ key: 'retired', label: r.retired, value: wl(m.retired.won, m.retired.lost), share: null, note: r.retiredNote });
  if (hasWL(m.walkovers)) out.push({ key: 'walkovers', label: r.walkovers, value: wl(m.walkovers.won, m.walkovers.lost), share: null, note: r.walkoversNote });
  return out;
}

/** every Pro block that has something to show, in BLOCK_ORDER */
export function statBlocks(m: MatchStatsMore, format: StatsFormat, t: Copy): StatBlock[] {
  const s = t.matchStats;
  const r = s.rows;
  const out: StatBlock[] = [];

  const sets: BarRow[] = [];
  if (hasWL(m.sets)) sets.push({ ...bar('sets', r.sets, m.sets.won, m.sets.lost, t), pct: m.sets.pct !== null ? pctText(m.sets.pct, t) : pctOf(m.sets.won, m.sets.lost, t) });
  if (m.games && hasWL(m.games)) {
    sets.push({
      ...bar('games', r.games, m.games.won, m.games.lost, t, plural(r.gamesFrom, m.games.matches)),
      pct: m.games.pct !== null ? pctText(m.games.pct, t) : pctOf(m.games.won, m.games.lost, t),
    });
  }
  if (sets.length > 0) out.push({ kind: 'sets', key: 'sets', title: s.sections.sets, rows: sets });

  const tiles = pressureTiles(m, t);
  if (tiles.length > 0) out.push({ kind: 'pressure', key: 'pressure', title: s.sections.pressure, tiles });

  const surfaces = m.by_surface.filter(hasWL);
  if (surfaces.length > 0) {
    out.push({
      kind: 'surface',
      key: 'surface',
      title: s.sections.surface,
      rows: surfaces.map((x) => ({ ...bar(`surface_${x.key}`, t.match.surfaces[x.key] ?? x.key, x.won, x.lost, t), surface: x.key })),
    });
  }

  const cats = m.by_category.filter(hasWL);
  if (cats.length > 0) {
    out.push({ kind: 'splits', key: 'category', title: s.sections.category, rows: cats.map((x) => bar(`cat_${x.key}`, x.key, x.won, x.lost, t)) });
  }

  const rounds = byRoundOrder(m.by_round.filter(hasWL));
  if (rounds.length > 0) {
    const top = ROUND_KEYS.length - 1;
    out.push({
      kind: 'rounds',
      key: 'rounds',
      title: s.sections.rounds,
      note: s.notes.rounds,
      rows: rounds.map((x) => ({
        key: `round_${x.key}`,
        label: roundLabel(x.key, t) ?? x.key,
        won: x.won,
        lost: x.lost,
        value: wl(x.won, x.lost),
        depth: Math.max(0, roundPos(x.key)) / top,
      })),
    });
  }

  const kinds: BarRow[] = [];
  if (hasWL(m.kinds.tournament)) kinds.push(bar('tournament', r.tournament, m.kinds.tournament.won, m.kinds.tournament.lost, t));
  if (hasWL(m.kinds.friendly)) kinds.push(bar('friendly', r.friendly, m.kinds.friendly.won, m.kinds.friendly.lost, t));
  if (kinds.length > 0) out.push({ kind: 'kinds', key: 'kinds', title: s.sections.kinds, rows: kinds });

  const months = m.by_month.filter(hasWL);
  if (months.length > 0) {
    const most = Math.max(...months.map((x) => x.won + x.lost));
    out.push({
      kind: 'months',
      key: 'months',
      title: s.sections.months,
      note: s.notes.months,
      bars: months.map((x) => ({ key: x.month, label: monthName(x.month, t), won: x.won, lost: x.lost, height: (x.won + x.lost) / most })),
    });
  }

  const person =
    (prefix: string, metaForms: { one: string; many: string }) =>
    (p: MatchStatsMore['opponents'][number]): PersonRow => ({
      key: `${prefix}_${p.player_id}`,
      name: peopleNames([p], t),
      initials: initialsOf(p),
      meta: plural(metaForms, p.played),
      value: wl(p.won, p.lost),
      share: share(p.won, p.lost),
    });
  if (format === 'doubles' && m.partners && m.partners.length > 0) {
    out.push({ kind: 'people', key: 'partners', title: s.sections.partners, note: s.notes.partners, rows: m.partners.map(person('mate', r.together)) });
  }
  if (m.opponents.length > 0) {
    out.push({ kind: 'people', key: 'opponents', title: s.sections.opponents, note: s.notes.opponents, rows: m.opponents.map(person('opp', r.met)) });
  }

  const wins = m.best_wins.filter((b) => b.opponents.length > 0);
  if (wins.length > 0) {
    out.push({
      kind: 'bestWins',
      key: 'best_wins',
      title: s.sections.bestWins,
      note: s.notes.bestWins,
      wins: wins.map((b) => ({
        key: b.match_id,
        names: sideNames(b.opponents, t),
        score: scoreText(b.sets, b.score_summary, b.retired, t),
        meta: [b.tournament, roundLabel(b.round, t), b.starts_at ? dayShort(b.starts_at, t) : null].filter(Boolean).join(' · ') || null,
        partner: b.partners.length > 0 ? fmt(r.partner, { names: sideNames(b.partners, t) }) : null,
      })),
    });
  }

  if (m.tournaments.list.length > 0) {
    const rest = m.tournaments.count - m.tournaments.list.length;
    out.push({
      kind: 'tournaments',
      key: 'tournaments',
      title: `${s.sections.tournaments} · ${plural(s.tour.count, m.tournaments.count)}`,
      rows: m.tournaments.list.map((x) => ({
        key: x.tournament_id,
        name: x.name,
        meta: [x.starts_on ? x.starts_on.slice(0, 4) : null, plural(r.met, x.played)].filter(Boolean).join(' · '),
        value: wl(x.won, x.lost),
        line: tournamentStop(x, t),
        champion: x.last_won && isFinalRound(x.last_round),
      })),
      more: rest > 0 ? plural(s.tour.more, rest) : null,
      champion: s.tour.champion,
    });
  }
  return out;
}

/** the free teaser: every Pro block's title, in order (partners only on doubles) */
export function lockedTitles(format: StatsFormat, t: Copy): string[] {
  const s = t.matchStats.sections;
  const titles: Record<BlockKey, string> = {
    sets: s.sets,
    pressure: s.pressure,
    surface: s.surface,
    category: s.category,
    rounds: s.rounds,
    kinds: s.kinds,
    months: s.months,
    partners: s.partners,
    opponents: s.opponents,
    best_wins: s.bestWins,
    tournaments: s.tournaments,
  };
  return BLOCK_ORDER.filter((k) => k !== 'partners' || format === 'doubles').map((k) => titles[k]);
}

export function matchStatsView(data: MyMatchStats, format: StatsFormat, t: Copy): MatchStatsView {
  const part = data[format];
  const more = part.more;
  const empty = data.has_player && part.played === 0 && !(more && hasWL(more.walkovers));
  return {
    pro: data.pro,
    noPlayer: !data.has_player,
    empty,
    hero: {
      format: t.matchStats.formats[format],
      won: part.won,
      lost: part.lost,
      played: plural(t.matchStats.hero.played, part.played),
      pct: pctText(part.win_pct, t),
      pctEarned: part.won > 0 && part.win_pct !== null,
      runs: data.pro && more && !empty ? { current: more.runs.current, best: more.runs.best } : null,
    },
    blocks: data.pro && more && !empty ? statBlocks(more, format, t) : [],
    locked: !data.pro,
  };
}

/** the period choices: «Όλα», «Φέτος», «12 μήνες» */
export function periodLabel(p: MatchStatsPeriod, t: Copy): string {
  return p === 'all' ? t.matchStats.periods.all : p === 'year' ? t.matchStats.periods.year : t.matchStats.periods.last12;
}

/** the quiet period control: «Όλα ↓», «Όλα ↑» while open */
export function periodFold(p: MatchStatsPeriod, open: boolean, t: Copy): string {
  return fmt(t.matchStats.periodFold, { label: periodLabel(p, t), arrow: open ? '↑' : '↓' });
}
