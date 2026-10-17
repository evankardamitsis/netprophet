import { formatWinnerSets, localParts } from '@netprophet/core';
import { accusativeName, accusativeWord, greekCaps, nameGender, withArticleAccusative, type Copy } from '@netprophet/copy';
import type { MySeason, SeasonNumbers, SeasonPerson, SetScore, WinCard, WinLoss } from '@netprophet/db';
import { SHARE_URL } from './ballerShare';
import { eventLabel } from './results';

export { isMyWin } from './results';
import { fmt } from './votes';

/**
 * Pro «Η σεζόν σου»: the month recap and the win card, as words and numbers. Pure; the screens only lay these out.
 * Free sees matches, wins, losses and points; the rest comes with Pro (api.my_season decides, the view follows).
 */

export type Arrow = '↑' | '↓' | '=';

export interface SeasonStat {
  key: string;
  value: string;
  label: string;
  /** earned numbers are lime (wins, points, runs, σερί); the rest stay quiet */
  earned: boolean;
  /** against last month; null without Pro or without last month */
  arrow: Arrow | null;
}

export interface SeasonView {
  /** «ΟΚΤΩΒΡΙΟΣ 2026» */
  kicker: string;
  /** «Οκτώβριος» */
  month: string;
  pro: boolean;
  /** played, won, lost, points: for everyone */
  free: SeasonStat[];
  /** the Pro numbers; null for free (the screen shows the locked part) */
  more: SeasonStat[] | null;
  /** «↑ ↓ σε σχέση με τον Σεπτέμβριο», with Pro */
  vsLast: string | null;
  bestWin: { matchId: string; line: string; score: string; where: string | null } | null;
  ladder: { label: string; value: string } | null;
  /** no claimed player: matches cannot be counted */
  noPlayer: boolean;
  /** a player, but no match this month */
  noMatches: boolean;
  /** the month's free win card */
  freeCard: string | null;
}

/** '2026-10' → 10 */
const monthIndex = (key: string) => Number(key.slice(5, 7)) - 1;

/** «Οκτώβριος» */
export function monthName(key: string, t: Copy): string {
  return t.season.months[monthIndex(key)] ?? key;
}

/** «τον Οκτώβριο» in Greek (months are masculine), «October» in English */
export function monthIn(key: string, t: Copy): string {
  const name = monthName(key, t);
  return t.season.grammar ? `τον ${accusativeWord(name, 'm')}` : name;
}

/** whom you beat, for «Νίκη απέναντι σ{who}»: «τον Νίκο Ψηλό», «την Μαρία Καρρά», «τους Νίκο Ψηλό και Γιώργο Μέσο» */
export function opponentsWho(people: SeasonPerson[], t: Copy): string {
  if (people.length === 0) return '';
  if (!t.season.grammar) return people.map((p) => `${p.first_name} ${p.surname}`.trim()).join(t.season.and);
  if (people.length === 1) {
    const p = people[0]!;
    return withArticleAccusative(p.first_name, p.surname, p.gender);
  }
  const allF = people.every((p) => nameGender(p.first_name, p.gender) === 'f');
  return `${allF ? 'τις' : 'τους'} ${people.map((p) => accusativeName(p.first_name, p.surname, p.gender)).join(t.season.and)}`;
}

/** «7-6(4), 6-2», or the sets only («2-1») when the games are not known */
export function scoreText(sets: SetScore[], summary: string | null, retired: boolean, t: Copy): string {
  if (sets.length === 0) return summary ?? '';
  return formatWinnerSets(sets, { retired }, t.results);
}

/** ↑ more than last month, ↓ fewer, = the same; null when there is nothing to compare */
export function arrowOf(now: number | undefined, prev: number | undefined): Arrow | null {
  if (now === undefined || prev === undefined) return null;
  return now > prev ? '↑' : now < prev ? '↓' : '=';
}

const wl = (x: WinLoss | undefined) => (x ? `${x.w}-${x.l}` : '0-0');

function stat(key: string, value: string, label: string, earned: boolean, arrow: Arrow | null): SeasonStat {
  return { key, value, label, earned, arrow };
}

export function seasonView(s: MySeason, t: Copy): SeasonView {
  const n = s.now;
  const p = s.pro ? s.prev : null;
  const st = t.season.stats;
  const a = (k: keyof SeasonNumbers) => (p ? arrowOf(n[k] as number | undefined, p[k] as number | undefined) : null);
  const month = monthName(s.month, t);
  const free = [
    stat('played', String(n.played), st.played, false, a('played')),
    stat('won', String(n.won), st.won, true, a('won')),
    stat('lost', String(n.lost), st.lost, false, a('lost')),
    stat('points', String(n.points), st.points, true, a('points')),
  ];
  const more = s.pro
    ? [
        stat('sets', `${n.sets_won ?? 0}-${n.sets_lost ?? 0}`, st.sets, false, p ? arrowOf(n.sets_won, p.sets_won) : null),
        stat('win_run', String(n.win_run ?? 0), st.winRun, true, a('win_run')),
        stat('best_streak', String(n.best_streak ?? 0), st.bestStreak, true, a('best_streak')),
        stat('deciding', wl(n.deciding), st.deciding, false, p ? arrowOf(n.deciding?.w, p.deciding?.w) : null),
        stat('tiebreaks', wl(n.tiebreaks), st.tiebreaks, false, p ? arrowOf(n.tiebreaks?.w, p.tiebreaks?.w) : null),
        stat('tournaments', String(n.tournaments ?? 0), st.tournaments, false, a('tournaments')),
      ]
    : null;
  const b = n.best_win ?? null;
  const ladder = n.ladder && n.ladder.position !== null
    ? {
        label: fmt(t.season.ladder, { tier: t.ladder.tiers[n.ladder.tier] }),
        value: fmt(t.season.ladderValue, { n: n.ladder.position, size: n.ladder.size }),
      }
    : null;
  return {
    kicker: greekCaps(`${month} ${s.month.slice(0, 4)}`),
    month,
    pro: s.pro,
    free,
    more,
    vsLast: p ? fmt(t.season.vsLast, { month: monthIn(s.prev_month, t) }) : null,
    bestWin: b
      ? {
          matchId: b.match_id,
          line: fmt(t.season.against, { who: opponentsWho(b.opponents, t) }),
          score: scoreText(b.sets, b.score_summary, false, t),
          where: b.tournament,
        }
      : null,
    ladder,
    noPlayer: !s.has_player,
    noMatches: s.has_player && n.played === 0,
    freeCard: s.free_card,
  };
}

/** the words that travel with the recap card */
export function seasonMessage(s: MySeason, t: Copy): string {
  const month = monthIn(s.month, t);
  return s.now.played > 0
    ? fmt(t.season.message, { won: s.now.won, played: s.now.played, month, url: SHARE_URL })
    : fmt(t.season.messageNoMatches, { points: s.now.points, month, url: SHARE_URL });
}

export interface WinCardView {
  /** «ΝΙΚΗ» */
  label: string;
  /** each set big, yours first: ['7-6', '6-2'], or the sets only ['2-1'] */
  sets: string[];
  /** «7-6(4), 6-2» */
  score: string;
  /** «απέναντι στον Νίκο Ψηλό» */
  against: string;
  /** «Κύπελλο · Ανδρών Α · Τελικός», or «Φιλικά» */
  event: string;
  /** «17/10/2026», Athens */
  date: string;
  /** «Βαγγέλης Σ.» (with the partner in doubles) */
  owner: string;
}

const short = (p: SeasonPerson) => {
  const initial = [...p.surname.trim()][0];
  return initial ? `${p.first_name.trim()} ${initial.toLocaleUpperCase('el')}.` : p.first_name.trim();
};

export function winCardView(c: WinCard, t: Copy): WinCardView {
  const d = localParts(c.starts_at);
  const sets: string[] = c.sets.length > 0 ? c.sets.map((s: SetScore) => `${s.w}-${s.l}`) : c.score_summary ? [c.score_summary] : [];
  return {
    label: greekCaps(t.winCard.label),
    sets,
    score: scoreText(c.sets, c.score_summary, c.retired, t),
    against: fmt(t.winCard.against, { who: opponentsWho(c.opponents, t) }),
    event: eventLabel({ tournament: c.tournament, round: c.round, format: c.format, level: c.category, discipline: null }, t),
    date: `${d.day}/${d.month}/${d.year}`,
    owner: c.me.map(short).join(' & '),
  };
}

/** the words that travel with the win card */
export function winCardMessage(c: WinCard, t: Copy): string {
  return fmt(t.winCard.message, { score: scoreText(c.sets, c.score_summary, c.retired, t), who: opponentsWho(c.opponents, t), url: SHARE_URL });
}
