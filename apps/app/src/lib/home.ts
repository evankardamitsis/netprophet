import type { Copy } from '@netprophet/copy';
import type { GetQuizResult, TournamentItem } from '@netprophet/db';
import { accusativeWord, nameGender } from '@netprophet/copy';
import { splitToday, type CardMatch, type CardPerson, type CardResult, type FeedCard } from './feed';
import { summaryCounts } from './resultsSummary';
import { NOW_WINDOW_MS } from './tournamentToday';
import { dayKey } from '@netprophet/core';
import { dayLabel, daysBetween, hasTime, timeOf, todayKey } from './tournaments';
import { fmt } from './votes';

/**
 * The home, Τουρνουά (mockup D, founder 22 Oct), top to bottom: the results card, «Οι δικοί σου», the quiz, «Ψήφισε
 * σήμερα», Pro, «Τουρνουά σήμερα». Pure picks from what the screens already load (get_feed, get_tournaments,
 * get_quiz, the ids you follow); the screen only lays these out.
 */

/* ================= the results card ================= */

export interface ResultsLine {
  /** «2 αποτελέσματα από χθες», «1 αποτέλεσμα», «3 αποτελέσματα» */
  title: string;
  /** «2 ✓ · 1 χαμένο», the parts with something in them */
  line: string;
  /** the points they bring, 0 when none (then no lime «+») */
  points: number;
}

/** «N ✓ · M χαμένα · +X» over every result waiting (oldest first, as the deck plays them) */
export function resultsLine(results: readonly CardResult[], t: Copy, now: Date = new Date()): ResultsLine | null {
  if (results.length === 0) return null;
  const s = t.result.summary;
  const { n, right, points } = summaryCounts(results);
  const wrong = n - right;
  const parts: string[] = [];
  if (right > 0) parts.push(fmt(s.right, { n: right }));
  if (wrong > 0) parts.push(wrong === 1 ? s.wrongOne : fmt(s.wrongMany, { n: wrong }));
  return { title: resultsTitle(results, t, now), line: parts.join(' · '), points };
}

/** «N αποτελέσματα από χθες» / «από σήμερα» when they all came in that Athens day, else plain «N αποτελέσματα» */
function resultsTitle(results: readonly CardResult[], t: Copy, now: Date): string {
  const r = t.home.results;
  const n = results.length;
  const today = todayKey(now);
  const days = new Set(results.map((x) => (x.at ? dayKey(x.at) : '')));
  const only = days.size === 1 ? [...days][0]! : '';
  const from = only === today ? 'today' : only && daysBetween(only, today) === 1 ? 'yesterday' : null;
  if (from === 'today') return n === 1 ? r.todayOne : fmt(r.todayMany, { n });
  if (from === 'yesterday') return n === 1 ? r.yesterdayOne : fmt(r.yesterdayMany, { n });
  return n === 1 ? r.one : fmt(r.many, { n });
}

/** «Πέμπτη 22 Οκτ»: today's weekday and date, Athens day (the home's page header) */
export function todayHeading(now: Date, t: Copy): string {
  const key = todayKey(now);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return fmt(t.home.date, { weekday: t.tournaments.weekdaysOn[weekday]!, day: d, month: t.matchStats.monthsShort[m - 1]! });
}

/* ================= «Ψήφισε σήμερα» ================= */

/** how many rows show before «Περισσότερα ›» */
export const VOTE_TOP = 3;

/** the key of the last group, matches outside a tournament («Φιλικά») */
export const FRIENDLIES = 'friendlies';

export interface VoteGroup {
  /** the tournament id, or FRIENDLIES */
  key: string;
  /** the tournament to open on a tap; null for «Φιλικά» */
  tournamentId: string | null;
  /** the tournament's name; null for «Φιλικά» (the screen says it) */
  title: string | null;
  rows: CardMatch[];
  /** all the matches of the tournament in the list (`rows` may be cut short while folded) */
  count: number;
}

export interface VoteList {
  /** today: today's matches; tomorrow: nothing left today, the next ones; none: nothing at all */
  mode: 'today' | 'tomorrow' | 'none';
  /** the rows by tournament, in the order of «Τουρνουά σήμερα» */
  groups: VoteGroup[];
}

const TAG_ORDER: TournamentTag[] = ['playing', 'following', 'near', null];

function tagOf(i: TournamentItem, areas: ReadonlySet<string>): TournamentTag {
  return i.in_it ? 'playing' : i.followed ? 'following' : i.area_id && areas.has(i.area_id) ? 'near' : null;
}

/** each tournament's place in «Παίζεις › Ακολουθείς › Κοντά σου › the rest» (0 first), the order the home lists them in */
export function tournamentRanks(items: readonly TournamentItem[], areaIds: readonly string[] = []): Map<string, number> {
  const areas = new Set(areaIds);
  return new Map(items.map((i) => [i.id, TAG_ORDER.indexOf(tagOf(i, areas))]));
}

/** the order inside a group: by day, the timed ones by time, the ones with no time at the end of their day */
function rowOrder(m: CardMatch): [string, number, number] {
  const day = m.day ?? (m.startsAt ? dayKey(m.startsAt) : '\uffff');
  return hasTime(m.startsAt) ? [day, 0, Date.parse(m.startsAt!)] : [day, 1, 0];
}

function byRowOrder(x: CardMatch, y: CardMatch): number {
  const [dx, ux, tx] = rowOrder(x);
  const [dy, uy, ty] = rowOrder(y);
  return dx.localeCompare(dy) || ux - uy || tx - ty;
}

/**
 * The matches grouped by tournament (founder, 22 Oct): tournaments in the order of «Τουρνουά σήμερα» (`ranks`; one not
 * in it after those, the earlier first), the rows of each by time, and the matches outside a tournament last, in
 * «Φιλικά».
 */
export function groupVotes(matches: readonly CardMatch[], ranks: ReadonlyMap<string, number> = new Map()): VoteGroup[] {
  const by = new Map<string, VoteGroup>();
  for (const m of matches) {
    const key = m.tournamentId ?? FRIENDLIES;
    const g = by.get(key) ?? { key, tournamentId: m.tournamentId ?? null, title: m.group?.title ?? null, rows: [], count: 0 };
    if (g.title === null && m.group) g.title = m.group.title;
    g.rows.push(m);
    by.set(key, g);
  }
  const groups = [...by.values()].map((g) => ({ ...g, rows: [...g.rows].sort(byRowOrder), count: g.rows.length }));
  const rank = (g: VoteGroup) => (g.key === FRIENDLIES ? Infinity : ranks.get(g.key) ?? TAG_ORDER.length);
  return groups.sort((x, y) => rank(x) - rank(y) || byRowOrder(x.rows[0]!, y.rows[0]!) || x.key.localeCompare(y.key));
}

/** how many rows the groups hold */
export const voteRows = (groups: readonly VoteGroup[]) => groups.reduce((n, g) => n + g.rows.length, 0);

/**
 * The first `limit` rows you can still vote on (not voted, not closed), in group and time order; a group shown keeps its
 * heading and only those rows (never a heading alone). The voted ones wait for «Περισσότερα ›», in their time slot. When
 * every row is voted, the first `limit` rows show.
 */
export function topVotes(groups: readonly VoteGroup[], limit: number = VOTE_TOP): VoteGroup[] {
  const castable = (m: CardMatch) => m.myVote === undefined && !m.closed;
  const any = groups.some((g) => g.rows.some(castable));
  const out: VoteGroup[] = [];
  let left = limit;
  for (const g of groups) {
    if (left <= 0) break;
    const rows = (any ? g.rows.filter(castable) : g.rows).slice(0, left);
    if (rows.length === 0) continue;
    out.push({ ...g, rows });
    left -= rows.length;
  }
  return out;
}

/**
 * The matches to vote, across tournaments, by tournament. Read from the cards as the feed loaded them (a vote made here
 * does not move a row: the list stays put while you go down it). Today's matches still taking votes (the ones you
 * already voted sit beside them); nothing left to vote today: tomorrow's (the later days); all voted: today's, to show
 * the split.
 */
export function voteList(cards: readonly FeedCard[], ranks: ReadonlyMap<string, number> = new Map()): VoteList {
  const split = splitToday([...cards]);
  const matches = (list: FeedCard[]) => list.filter((c): c is CardMatch => c.kind === 'match' && !c.closed);
  const today = matches(split.today);
  if (today.some((m) => m.myVote === undefined)) return { mode: 'today', groups: groupVotes(today, ranks) };
  const later = matches(split.later);
  if (later.some((m) => m.myVote === undefined)) return { mode: 'tomorrow', groups: groupVotes(later, ranks) };
  if (today.length > 0) return { mode: 'today', groups: groupVotes(today, ranks) };
  return { mode: 'none', groups: [] };
}

/** «Ρήγας Κ.», or a pair «Ρήγας & Σταθάκης» (the app's own pair joiner) */
export function sideLabel(people: readonly CardPerson[]): string {
  if (people.length === 1) {
    const p = people[0]!;
    return `${p.surname} ${p.first.slice(0, 1)}.`.trim();
  }
  return people.map((p) => p.surname).join(' & ');
}

/**
 * «18:00»; a match with no start time shows its day instead («Σήμερα», «Πεμ 23/10»; founder, 22 Oct: never «χωρίς
 * ώρα»), and nothing when the day is not known either (get_feed sends no date for a match without a time).
 */
export function rowTime(m: Pick<CardMatch, 'startsAt' | 'day'>, t: Copy, now: Date = new Date()): string {
  if (hasTime(m.startsAt)) return timeOf(m.startsAt!);
  // the import's 00:00 for a row with no time: its day is the start's day
  const day = m.day ?? (m.startsAt ? dayKey(m.startsAt) : undefined);
  return day ? dayLabel(day, todayKey(now), t) : '';
}

/* ================= «Οι δικοί σου» ================= */

export interface YoursNow {
  matchId: string;
  tournamentId: string | null;
  /** the roster id of the one of yours playing, to open their run */
  playerId: string | null;
  /** «Λιάκος Γ.» */
  name: string;
  /** «με Παππά · Open Γλυφάδας» */
  line: string;
  /** «18:30» (or the day when it has no time), or null while it plays (then «Τώρα») */
  time: string | null;
  now: boolean;
}

const accSide = (people: readonly CardPerson[]) => people.map((p) => accusativeWord(p.surname, nameGender(p.first))).join(' & ');

/**
 * Today's matches of the people you follow (known or friends; your own player too), from the feed: playing now first
 * (started within NOW_WINDOW_MS, no result yet: a match with a result leaves the feed), then by time. `skip`: a match
 * already shown as «Ο αγώνας σου».
 */
export function yoursNow(cards: readonly FeedCard[], yours: ReadonlySet<string>, now: Date, t: Copy, skip?: string | null): YoursNow[] {
  if (yours.size === 0) return [];
  const nowMs = now.getTime();
  const out: (YoursNow & { at: number })[] = [];
  for (const c of cards) {
    if (c.kind !== 'match' || c.later || c.id === skip) continue;
    const sides = [c.a, c.b];
    const k = sides.findIndex((s) => s.people.some((p) => p.id !== undefined && yours.has(p.id)));
    if (k < 0) continue;
    const mine = sides[k]!;
    const other = sides[1 - k]!;
    const at = hasTime(c.startsAt) ? Date.parse(c.startsAt!) : NaN;
    const playing = Number.isFinite(at) && at <= nowMs && nowMs - at < NOW_WINDOW_MS;
    const against = fmt(t.tournaments.focus.against, { name: accSide(other.people) });
    out.push({
      matchId: c.id,
      tournamentId: c.tournamentId ?? null,
      playerId: mine.people.find((p) => p.id !== undefined && yours.has(p.id))?.id ?? null,
      name: sideLabel(mine.people),
      line: c.group ? fmt(t.home.yours.line, { against, tournament: c.group.title }) : against,
      time: playing ? null : rowTime(c, t, now) || null,
      now: playing,
      at: Number.isFinite(at) ? at : Infinity,
    });
  }
  return out
    .sort((a, b) => Number(b.now) - Number(a.now) || a.at - b.at)
    .map((r): YoursNow => ({ matchId: r.matchId, tournamentId: r.tournamentId, playerId: r.playerId, name: r.name, line: r.line, time: r.time, now: r.now }));
}

/* ================= the quiz card ================= */

export interface QuizCardView {
  /** how many questions today */
  n: number;
  answered: number;
  /** «6 ερωτήσεις · και οι 6 δίνουν +30», «2 από 6 · …», or «6 από 6» */
  line: string;
  /** the +30 came in: shown in lime */
  earned: boolean;
  done: boolean;
}

export function quizCard(quiz: GetQuizResult, t: Copy): QuizCardView | null {
  const n = quiz.cards.length;
  if (n === 0) return null;
  const answered = quiz.cards.filter((c) => c.my_option !== null).length;
  const done = answered >= n;
  const q = t.home.quiz;
  const line = done ? fmt(q.played, { n: answered, total: n }) : answered > 0 ? fmt(q.progress, { n: answered, total: n }) : fmt(q.line, { n });
  return { n, answered, line, earned: quiz.awarded, done };
}

/* ================= «Τουρνουά σήμερα» ================= */

export type TournamentTag = 'playing' | 'following' | 'near' | null;

export interface HomeTournament {
  id: string;
  name: string;
  logo: string | null;
  tag: TournamentTag;
  /** a match of it plays now: «Τώρα» and the pair */
  live: string | null;
  /** «Πρώτο ματς 17:00», «Επόμενο ματς 19:00», or null */
  next: string | null;
  /** «9 ματς σήμερα» */
  count: string | null;
}

const surnames = (people: readonly CardPerson[]) => people.map((p) => p.surname).join(' & ');

/**
 * Today's tournaments: on now or playing today, ordered Παίζεις › Ακολουθείς › Κοντά σου (your areas) › the rest, the
 * busier first inside each. The live line comes from the feed's cards of that tournament: a match started within
 * NOW_WINDOW_MS with no result is «Τώρα»; else the next start today.
 */
export function homeTournaments(items: readonly TournamentItem[], cards: readonly FeedCard[], areaIds: readonly string[], now: Date, t: Copy): HomeTournament[] {
  const c = t.home.tournaments;
  const nowMs = now.getTime();
  const areas = new Set(areaIds);
  // a done tournament is only its draws: it is never «today»
  const live = items.filter((i) => i.state !== 'done' && (i.state === 'ongoing' || i.today > 0));
  return live
    .map((i) => ({ i, tag: tagOf(i, areas) }))
    .sort((x, y) => TAG_ORDER.indexOf(x.tag) - TAG_ORDER.indexOf(y.tag) || y.i.today - x.i.today)
    .map(({ i, tag }): HomeTournament => {
      const mine = cards.filter((m): m is CardMatch => m.kind === 'match' && m.tournamentId === i.id && !m.later);
      const at = (m: CardMatch) => (hasTime(m.startsAt) ? Date.parse(m.startsAt!) : NaN);
      const playing = mine
        .filter((m) => Number.isFinite(at(m)) && at(m) <= nowMs && nowMs - at(m) < NOW_WINDOW_MS)
        .sort((a, b) => at(b) - at(a))[0];
      const coming = mine.filter((m) => Number.isFinite(at(m)) && at(m) > nowMs).sort((a, b) => at(a) - at(b))[0];
      const started = mine.some((m) => Number.isFinite(at(m)) && at(m) <= nowMs);
      return {
        id: i.id,
        name: i.name,
        logo: i.logo ?? null,
        tag,
        live: playing ? `${surnames(playing.a.people)} · ${surnames(playing.b.people)}` : null,
        next: coming ? fmt(started ? c.next : c.first, { time: timeOf(coming.startsAt!) }) : null,
        count: i.today > 0 ? fmt(t.tournaments.today, { n: i.today }) : null,
      };
    });
}

export function tagLabel(tag: TournamentTag, t: Copy): string | null {
  const c = t.home.tournaments;
  return tag === 'playing' ? c.playing : tag === 'following' ? c.following : tag === 'near' ? c.near : null;
}
