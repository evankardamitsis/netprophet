import { stripAccents, type Copy } from '@netprophet/copy';
import type { MatchStatsMore, MatchStatsPart, MatchStatsPeriod, MyMatchStats, StatsPerson } from '@netprophet/db';
import { ROUND_KEYS, roundLabel } from './feed';
import { scoreText } from './season';
import { fmt } from './votes';

/**
 * «Τα στατιστικά σου»: your real matches as words, numbers and bar lengths. Pure; the screen only lays these out.
 * The database decides what is known (api.my_match_stats); a block it sends as null (no game scores) is left out.
 * Votes, points and σερί never come here: they live on «Οι προβλέψεις σου».
 */

export type StatsFormat = 'singles' | 'doubles';
export const PERIODS: readonly MatchStatsPeriod[] = ['all', 'year', '12m'];

export interface StatRow {
  key: string;
  label: string;
  /** «5-2», «3», «11-6 · 65%», or a score */
  value: string;
  /** the share won (0 to 1) for the bar; null: no bar */
  share: number | null;
  /** a quiet line under the label */
  note: string | null;
}

export interface StatSection {
  key: string;
  title: string;
  rows: StatRow[];
}

export interface HeadStat {
  key: 'played' | 'won' | 'lost' | 'pct';
  value: string;
  label: string;
  /** wins are earned: lime */
  earned: boolean;
}

export interface MatchStatsView {
  pro: boolean;
  noPlayer: boolean;
  /** a player, but no match in this format and period */
  empty: boolean;
  head: HeadStat[];
  /** the Pro sections; empty for free */
  sections: StatSection[];
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

/** one or many: «1 τουρνουά», «3 τουρνουά» */
const plural = (forms: { one: string; many: string }, n: number) => (n === 1 ? forms.one : fmt(forms.many, { n }));

/** '2026-10' → «Οκτ 2026» */
export function monthShort(key: string, t: Copy): string {
  const i = Number(key.slice(5, 7)) - 1;
  return `${t.matchStats.monthsShort[i] ?? key.slice(5, 7)} ${key.slice(0, 4)}`;
}

/** «Νίκος Ψηλός», pairs joined: «Νίκος Ψηλός και Γιώργος Μέσος» */
export function peopleNames(people: Pick<StatsPerson, 'first_name' | 'surname'>[], t: Copy): string {
  return people.map((p) => `${p.first_name} ${p.surname}`.trim()).join(t.matchStats.and);
}

/** a final, as stored by imports ('final') or typed by an organiser («Τελικός») */
export function isFinalRound(round: string | null): boolean {
  if (!round) return false;
  const r = stripAccents(round).trim().toLowerCase();
  return r === 'final' || r === 'τελικος' || r === 'τελικο';
}

/** how far you went in a tournament, from your last match there: «Το πήρες!», «Ημιτελικός · ήττα», or the record */
export function tournamentLine(x: { won: number; lost: number; last_round: string | null; last_won: boolean }, t: Copy): string {
  const record = wl(x.won, x.lost);
  if (x.last_won && isFinalRound(x.last_round)) return `${record} · ${t.matchStats.tour.champion}`;
  const round = roundLabel(x.last_round, t);
  if (!round) return record;
  return `${record} · ${round} · ${x.last_won ? t.matchStats.tour.won : t.matchStats.tour.lost}`;
}

/** rounds in draw order (first round to the final); an organiser's own words keep the database's order, after them */
export function byRoundOrder<T extends { key: string }>(rounds: T[]): T[] {
  const pos = (k: string) => {
    const i = (ROUND_KEYS as readonly string[]).indexOf(k);
    return i >= 0 ? i : ROUND_KEYS.length;
  };
  return rounds.map((r, i) => ({ r, i })).sort((a, b) => pos(a.r.key) - pos(b.r.key) || a.i - b.i).map((x) => x.r);
}

const row = (key: string, label: string, value: string, s: number | null = null, note: string | null = null): StatRow => ({
  key,
  label,
  value,
  share: s,
  note,
});

/** a won-lost row with its bar */
const wlRow = (key: string, label: string, won: number, lost: number, note: string | null = null) =>
  row(key, label, wl(won, lost), share(won, lost), note);

/** a played-won row (tie-breaks, deciding sets, after the first set) as won-lost; null when none was played */
function pwRow(key: string, label: string, x: { played: number; won: number } | null): StatRow | null {
  if (!x || x.played === 0) return null;
  return wlRow(key, label, x.won, x.played - x.won);
}

const keep = (rows: (StatRow | null)[]): StatRow[] => rows.filter((r): r is StatRow => r !== null);

function sections(m: MatchStatsMore, format: StatsFormat, t: Copy): StatSection[] {
  const s = t.matchStats;
  const r = s.rows;
  const out: StatSection[] = [];
  const add = (key: string, title: string, rows: (StatRow | null)[]) => {
    const kept = keep(rows);
    if (kept.length > 0) out.push({ key, title, rows: kept });
  };

  add('form', s.sections.form, [row('run_now', r.runNow, String(m.runs.current)), row('run_best', r.runBest, String(m.runs.best))]);
  add(
    'months',
    s.sections.months,
    m.by_month.map((x) => wlRow(`m_${x.month}`, monthShort(x.month, t), x.won, x.lost)),
  );
  add('sets', s.sections.sets, [
    m.sets.won + m.sets.lost > 0
      ? row('sets', r.sets, `${wl(m.sets.won, m.sets.lost)} · ${pctText(m.sets.pct, t)}`, share(m.sets.won, m.sets.lost))
      : null,
    m.games && m.games.won + m.games.lost > 0
      ? row('games', r.games, `${wl(m.games.won, m.games.lost)} · ${pctText(m.games.pct, t)}`, share(m.games.won, m.games.lost), plural(r.gamesFrom, m.games.matches))
      : null,
    m.straight.won > 0 ? row('straight_won', r.straightWon, String(m.straight.won)) : null,
    m.straight.lost > 0 ? row('straight_lost', r.straightLost, String(m.straight.lost)) : null,
  ]);
  add('tight', s.sections.tight, [
    pwRow('tiebreaks', r.tiebreaks, m.tiebreaks),
    pwRow('super_tiebreaks', r.superTiebreaks, m.super_tiebreaks),
    pwRow('deciding', r.deciding, m.deciding),
    pwRow('first_lost', r.firstLost, m.first_set_lost),
    pwRow('first_won', r.firstWon, m.first_set_won),
  ]);
  const kind = m.kinds;
  add('where', s.sections.where, [
    ...m.by_surface.map((x) => wlRow(`surface_${x.key}`, t.match.surfaces[x.key] ?? x.key, x.won, x.lost)),
    kind.tournament.won + kind.tournament.lost > 0 ? wlRow('tournament', r.tournament, kind.tournament.won, kind.tournament.lost) : null,
    kind.friendly.won + kind.friendly.lost > 0 ? wlRow('friendly', r.friendly, kind.friendly.won, kind.friendly.lost) : null,
    ...m.by_category.map((x) => wlRow(`cat_${x.key}`, x.key, x.won, x.lost)),
  ]);
  if (m.tournaments.count > 0) {
    out.push({
      key: 'tournaments',
      title: `${s.sections.tournaments} · ${plural(s.tour.count, m.tournaments.count)}`,
      rows: m.tournaments.list.map((x) =>
        row(`t_${x.tournament_id}`, x.name, tournamentLine(x, t), null, x.starts_on ? x.starts_on.slice(0, 4) : null),
      ),
    });
  }
  add(
    'rounds',
    s.sections.rounds,
    byRoundOrder(m.by_round).map((x) => wlRow(`round_${x.key}`, roundLabel(x.key, t) ?? x.key, x.won, x.lost)),
  );
  add(
    'opponents',
    s.sections.opponents,
    m.opponents.map((p) => wlRow(`opp_${p.player_id}`, peopleNames([p], t), p.won, p.lost)),
  );
  if (format === 'doubles') {
    add(
      'partners',
      s.sections.partners,
      (m.partners ?? []).map((p) => wlRow(`mate_${p.player_id}`, peopleNames([p], t), p.won, p.lost)),
    );
  }
  add(
    'best_wins',
    s.sections.bestWins,
    m.best_wins
      .filter((b) => b.opponents.length > 0)
      .map((b) =>
        row(
          `best_${b.match_id}`,
          peopleNames(b.opponents, t),
          scoreText(b.sets, b.score_summary, b.retired, t),
          null,
          [b.tournament, roundLabel(b.round, t)].filter(Boolean).join(' · ') || null,
        ),
      ),
  );
  add('other', s.sections.other, [
    m.walkovers.won + m.walkovers.lost > 0 ? row('walkovers', r.walkovers, wl(m.walkovers.won, m.walkovers.lost)) : null,
    m.retired.won + m.retired.lost > 0 ? row('retired', r.retired, wl(m.retired.won, m.retired.lost)) : null,
  ]);
  return out;
}

export function matchStatsView(data: MyMatchStats, format: StatsFormat, t: Copy): MatchStatsView {
  const part: MatchStatsPart = data[format];
  const h = t.matchStats.head;
  const head: HeadStat[] = [
    { key: 'played', value: String(part.played), label: h.played, earned: false },
    { key: 'won', value: String(part.won), label: h.won, earned: part.won > 0 },
    { key: 'lost', value: String(part.lost), label: h.lost, earned: false },
    { key: 'pct', value: pctText(part.win_pct, t), label: h.pct, earned: false },
  ];
  const empty = data.has_player && part.played === 0 && !(part.more && part.more.walkovers.won + part.more.walkovers.lost > 0);
  return {
    pro: data.pro,
    noPlayer: !data.has_player,
    empty,
    head,
    sections: data.pro && part.more && !empty ? sections(part.more, format, t) : [],
    locked: !data.pro,
  };
}

/** the period chips: «Όλα», «Φέτος», «12 μήνες» */
export function periodLabel(p: MatchStatsPeriod, t: Copy): string {
  return p === 'all' ? t.matchStats.periods.all : p === 'year' ? t.matchStats.periods.year : t.matchStats.periods.last12;
}
