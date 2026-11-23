import type { Copy } from '@netprophet/copy';
import { dayKey } from '@netprophet/core';
import type { CardMatch, FeedCard } from './feed';
import { voteRows, type QuizCardView, type VoteGroup } from './home';
import { hasTime, timeOf, todayKey } from './tournaments';
import type { Side } from './votes';
import { fmt } from './votes';

/**
 * The home's guidance (home guidance board, founder 23 Nov 2026: "go with your recommendations"): the end of the day
 * (2A), the count under the first three (3A), the quiz chip on the «Σήμερα» line (4B) and the small touches from the
 * match's state (5.1, 5.4). Pure picks from what the home already loads; the screen lays them out.
 */

/** a match's vote: this session's (sessionVotes) over the one the feed loaded */
export type VoteOf = (m: CardMatch) => Side | undefined;

const feedVote: VoteOf = (m) => m.myVote;

/** «2026-11-24» from «2026-11-23»: the next Athens day (key arithmetic, no clock, so no DST edge) */
export function nextDayKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const dayOf = (m: CardMatch): string | null => m.day ?? (m.startsAt ? dayKey(m.startsAt) : null);

/** closed by the server, or past its lock by the clock (the feed's flag is as old as the read) */
export function isClosed(m: CardMatch, now: Date): boolean {
  if (m.closed) return true;
  const lock = m.lockAt ? Date.parse(m.lockAt) : NaN;
  return Number.isFinite(lock) && now.getTime() >= lock;
}

export interface NextDay {
  /** tomorrow's matches */
  n: number;
  /** «10:00», the first one with a time; null when none has one (then the lines that need it are left out) */
  time: string | null;
}

/** tomorrow's matches (the next Athens day only, not the days after): how many, and the first start */
export function tomorrowOf(cards: readonly FeedCard[], now: Date): NextDay | null {
  const tomorrow = nextDayKey(todayKey(now));
  const rows = cards.filter((c): c is CardMatch => c.kind === 'match' && dayOf(c) === tomorrow);
  if (rows.length === 0) return null;
  const timed = rows.filter((m) => hasTime(m.startsAt)).sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!));
  return { n: rows.length, time: timed[0] ? timeOf(timed[0].startsAt!) : null };
}

/** today's matches as the feed has them, open and closed (voteList leaves the closed ones out) */
export function todayMatches(cards: readonly FeedCard[]): CardMatch[] {
  return cards.filter((c): c is CardMatch => c.kind === 'match' && !c.later);
}

export interface DayEnd {
  /** done: you voted, «Τελείωσες για σήμερα ✓»; closed: «Τα ματς της ημέρας έκλεισαν. Τα λέμε αύριο.» */
  variant: 'done' | 'closed';
  /** today's matches with your vote */
  voted: number;
  /** one of your votes can still change (its match has not locked): «Δες τις ψήφους σου ›» and the line under it */
  canChange: boolean;
  tomorrow: NextDay | null;
}

/**
 * The end of the day (board 2A): today had matches and every one is voted or closed. Nothing voted (all closed
 * before you came), or all closed with nothing tomorrow, is the «έκλεισαν» variant; otherwise «Τελείωσες».
 */
export function dayEnd(cards: readonly FeedCard[], now: Date, voteOf: VoteOf = feedVote): DayEnd | null {
  const today = todayMatches(cards);
  if (today.length === 0) return null;
  if (today.some((m) => voteOf(m) === undefined && !isClosed(m, now))) return null;
  const voted = today.filter((m) => voteOf(m) !== undefined).length;
  const allClosed = today.every((m) => isClosed(m, now));
  const tomorrow = tomorrowOf(cards, now);
  const variant = voted === 0 || (allClosed && !tomorrow) ? 'closed' : 'done';
  const canChange = today.some((m) => voteOf(m) !== undefined && !isClosed(m, now));
  return { variant, voted, canChange, tomorrow };
}

export type DayEndRow = { key: 'tomorrow' | 'quiz' | 'tournaments'; label: string; href: string };

/** the end card's rows: tomorrow (when it has matches and a first time), the quiz (open and not played), all tournaments */
export function dayEndRows(end: DayEnd, quiz: QuizCardView | null, t: Copy): DayEndRow[] {
  const d = t.home.done;
  const out: DayEndRow[] = [];
  if (end.tomorrow?.time) out.push({ key: 'tomorrow', label: fmt(d.tomorrow, { n: end.tomorrow.n, time: end.tomorrow.time }), href: '/all-matches?day=tomorrow' });
  if (quiz && !quiz.done) out.push({ key: 'quiz', label: fmt(d.quiz, { n: quiz.n - quiz.answered }), href: '/quiz' });
  // «Όλα τα τουρνουά ›» without its own ›: the card draws one at the end of every row
  out.push({ key: 'tournaments', label: t.home.tournaments.all.replace(/\s*›$/, ''), href: '/tournaments' });
  return out;
}

/** «Σήμερα δεν έχει ματς. Αύριο 14, από τις 10:00.» (board 5.4): nothing today at all, something tomorrow with a time */
export function noneTodayLine(cards: readonly FeedCard[], now: Date, t: Copy): string | null {
  if (todayMatches(cards).length > 0) return null;
  const next = tomorrowOf(cards, now);
  return next?.time ? fmt(t.home.vote.noneToday, { n: next.n, time: next.time }) : null;
}

export interface MoreVotes {
  /** every row of the list: «Δες όλα τα ματς (12) ›» */
  total: number;
  /** the rows still open for a vote that the home does not show: «9 ακόμα για ψήφο» (no line at 0) */
  left: number;
}

const castable = (m: CardMatch, voteOf: VoteOf) => voteOf(m) === undefined && !m.closed;

/** the count row under the first three (board 3A); null when the home already shows everything */
export function moreVotes(groups: readonly VoteGroup[], shown: readonly VoteGroup[], voteOf: VoteOf = feedVote): MoreVotes | null {
  const total = voteRows(groups);
  if (total <= voteRows(shown)) return null;
  const open = (gs: readonly VoteGroup[]) => gs.reduce((n, g) => n + g.rows.filter((m) => castable(m, voteOf)).length, 0);
  return { total, left: Math.max(0, open(groups) - open(shown)) };
}

/* ================= «Κλείνει σε 20′» ================= */

/** the tag shows from this long before the lock */
export const CLOSES_IN_MS = 30 * 60_000;

/** whole minutes left before the lock, rounded up (1 to 30); null outside the last half hour, or once it locked */
export function closesInMinutes(lockAt: string | null | undefined, now: Date): number | null {
  const lock = lockAt ? Date.parse(lockAt) : NaN;
  if (!Number.isFinite(lock)) return null;
  const ms = lock - now.getTime();
  if (ms <= 0 || ms > CLOSES_IN_MS) return null;
  return Math.ceil(ms / 60_000);
}

/** ms to the next whole minute of the wall clock: the shared clock ticks there */
export function msToNextMinute(now: Date): number {
  return 60_000 - (now.getTime() % 60_000);
}

/* ================= the quiz chip ================= */

export interface QuizChip {
  /** «Quiz 2/6 ›» or «Quiz ✓» */
  label: string;
  done: boolean;
  /** the lime «+30» beside «Quiz ✓», only once the +30 came in */
  plus: string | null;
}

/** the chip on the «Σήμερα» line (board 4B): the same gate as the quiz card, so it takes the card's view */
export function quizChip(view: QuizCardView | null, t: Copy): QuizChip | null {
  if (!view) return null;
  const q = t.home.quiz;
  if (view.done) return { label: q.chipDone, done: true, plus: view.earned ? q.earned : null };
  return { label: fmt(q.chip, { n: view.answered, total: view.n }), done: false, plus: null };
}
