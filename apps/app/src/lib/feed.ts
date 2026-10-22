import { dayKey, localParts, toMs, voteLockInstant } from '@netprophet/core';
import { accusativeWord, greekCaps, nameGender, withArticleAccusative, type Copy, levelNumber } from '@netprophet/copy';
import { RpcError, type FeedMatchCard, type FeedPostponedCard, type FeedPlayer, type FeedResultCard, type FeedSponsoredCard, type Side as DbSide, type TournamentMatch, type VoteSplit } from '@netprophet/db';
import type { MockMatch, MockPlayer } from '../mock/matches';
import { placeLine } from './place';
import { dayShort, dayTimeShort, hasTime } from './tournaments';
import { playerAvatar, type AvatarLook } from './avatar';
import { fmt, voteSplit, type Side } from './votes';
import { PLAYER_LEVEL_SHOWN } from './levelShown';

/** One player on a card. */
export interface CardPerson {
  /** the roster player, for a hold on the name («Η πορεία στο τουρνουά») */
  id?: string;
  surname: string;
  first: string;
  /** avatar letters, «ΝΡ» */
  initials: string;
  /** the drawn player when they have an account; else the initials show */
  look?: AvatarLook | null;
}

/** One side of a card: one player, or two in doubles, plus the «level · area» line. */
export interface CardSide {
  people: CardPerson[];
  /** «level 4 · Γλυφάδα», as one line (kept for the folded card and tests) */
  sub: string | null;
  /** the level pill on its own, «level 4» or «level 5 & 4» (founder, 14 Oct: the name first, then the facts) */
  level?: string | null;
  /** the area next to it, quieter */
  area?: string | null;
}

export interface CardPct {
  pctA: number;
  pctB: number;
}

/** What a vote row (VoteRow) renders. Built from a server feed card or from mock data. */
export interface CardMatch {
  kind: 'match';
  id: string;
  meta: string;
  learn: string;
  doubles: boolean;
  a: CardSide;
  b: CardSide;
  /** set when the viewer already voted: the card starts folded */
  myVote?: Side;
  split?: CardPct;
  /** voting has closed (the match started); the card shows the match and the crowd's split, no buttons */
  closed?: boolean;
  /** when voting closes, from the server: the start, or 14:00 (the tournament's time) on the day of a match with no time */
  lockAt?: string;
  /** the match moved to this day in the last 3 days: «Νέα μέρα» chip and «(ήταν Τρι 13/10)» after the time */
  moved?: { chip: string; was: string; head: string; tail: string };  /** «PRC (Μαρούσι) · Σκληρό»: the club and surface, when known (only on a match outside a tournament) */
  place?: string;
  /**
   * The tournament and where it is played, said once above its run of matches (founder, 16 Oct: easy to read);
   * the card's own line then keeps only the time, format, category and round. `logo` is the tournament's logo path
   * (null: its letter); `club` leads the place line with the club's logo.
   */
  group?: { key: string; title: string; logo: string | null; sub: string | null; club: ClubMark | null; surface?: string | null };
  /** the club the match is played at, for its logo by the place line */
  club?: ClubMark;
  /** on a later day than today (Athens): Σήμερα folds these under «Αύριο και μετά» */
  later?: boolean;
  /** its tournament: a hold on a name opens the player's run in it */
  tournamentId?: string;
  /** when it starts: the order of «Αύριο και μετά», and «Ξεκινά σε 40 λεπτά» on an idle card in its last hour */
  startsAt?: string;
  /** «40+», «Μ 50+ · Γυναικών», «Μικτό»: shown as its own tag, bigger than the meta line */
  category?: string;
  /** its Athens day when known without a start time (sample data): shown in the time's place */
  day?: string;
}

/** A match put off: compact, not votable, muted. */
export interface CardPostponed {
  kind: 'postponed';
  id: string;
  /** «Αναβλήθηκε» */
  chip: string;
  /** «Open Γλυφάδας · ήταν Τρι 13/10 18:30» */
  meta: string;
  a: CardSide;
  b: CardSide;
  /** «Η ψήφος σου μένει. Θα δεις τη νέα μέρα εδώ.» or just the second sentence */
  note: string;
}

/** The labelled ad card (prototype: every 4th card). */
export interface CardSponsored {
  kind: 'sponsored';
  id: string;
  label: string;
  sponsor: string;
  title: string;
  subtitle: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  /** a drawn banner: strings, racket, court, coffee, lights */
  art: string | null;
}

/** A result coming back to the top of the feed (prototype «rq» card). */
export interface CardResult {
  kind: 'result';
  /** feed_inbox id: mark_inbox_seen takes it */
  id: string;
  /** when the result came in (feed_inbox created_at): the home's card says «από χθες» */
  at: string;
  matchId: string;
  ok: boolean;
  points: number;
  /** σερί before this card and after it, so the header can play the change */
  streakBefore: number;
  streak: number;
  /** a freeze saved the σερί on a wrong call */
  frozen: boolean;
  winnerSurname: string;
  winnerFirst: string;
  /** «κέρδισε τον Νίκο Ροδίτη» */
  line: string;
  /** «6-3, 7-5», winner first */
  sets: string;
  /** what the pill says: «+10 · σερί 4», «κράτησες το σερί», or nothing */
  pill: string | null;
}

export type FeedCard = CardMatch | CardSponsored | CardPostponed | CardResult;

/** Put-off cards go after the votable ones; the order inside each group stays. */
export function postponedLast<T extends { kind: string }>(cards: T[]): T[] {
  return [...cards.filter((c) => c.kind !== 'postponed'), ...cards.filter((c) => c.kind === 'postponed')];
}

export function fromResultCard(card: FeedResultCard, t: Copy): CardResult {
  const p = card.payload;
  const ev = p.streak_event;
  const ok = p.outcome === 'correct';
  const frozen = ev?.kind === 'frozen' || (!ev && p.freeze_used);
  const streakBefore =
    ev?.kind === 'advanced' ? Math.max(0, p.streak - 1) : ev?.kind === 'broken' ? ev.lostStreak ?? p.streak : p.streak;
  const winners = p.sides?.find((s) => s.side === p.winner_side)?.players ?? [];
  const losers = p.sides?.find((s) => s.side !== p.winner_side)?.players ?? [];
  let line = '';
  if (losers.length === 1) {
    const l = losers[0]!;
    line = fmt(t.result.beat, { loser: withArticleAccusative(l.first_name, l.surname) });
  } else if (losers.length > 1) {
    const names = losers.map((l) => {
      const g = nameGender(l.first_name);
      return [l.first_name, l.surname].map((w) => accusativeWord(w, g)).join(' ');
    });
    line = fmt(t.result.beatPair, { losers: names.join(' & ') });
  }
  return {
    kind: 'result',
    id: card.id,
    at: card.created_at,
    matchId: p.match_id,
    ok,
    points: p.points,
    streakBefore,
    streak: p.streak,
    frozen,
    winnerSurname: winners.map((w) => w.surname).join(' & '),
    winnerFirst: winners.map((w) => w.first_name).join(' & '),
    line,
    // a player-logged result has no games: the card shows the sets («2-1»)
    sets: p.sets?.length ? p.sets.map((x) => `${x.w}-${x.l}`).join(', ') : p.score ?? '',
    pill: ok ? fmt(t.result.points, { points: p.points, streak: p.streak }) : frozen ? t.result.kept : null,
  };
}

/** Avatar letters as in the prototype: first letter of each name part, capitals without accents («Άννα Μάνου» → «ΑΜ»). */
export function initials(...parts: (string | null | undefined)[]): string {
  return greekCaps(
    parts
      .flatMap((p) => (p ?? '').trim().split(/\s+/))
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2),
  );
}

/** The database numbers sides 1 and 2; the UI calls them a and b. This is the only place they meet. */
export const toUiSide = (s: DbSide): Side => (s === 1 ? 'a' : 'b');
export const toDbSide = (s: Side): DbSide => (s === 'a' ? 1 : 2);

export function toPct(split: VoteSplit): CardPct {
  return { pctA: split.pct1, pctB: split.pct2 };
}

export const ROUND_KEYS = ['round64', 'round32', 'round16', 'quarter', 'semi', 'final'] as const;
type RoundKey = (typeof ROUND_KEYS)[number];
const isRoundKey = (r: string): r is RoundKey => (ROUND_KEYS as readonly string[]).includes(r);

export function roundLabel(round: string | null, t: Copy): string | null {
  if (!round) return null;
  return isRoundKey(round) ? t.match.rounds[round] : round;
}

/** Day label and «Μαθαίνεις ...» line for a start time, in Athens time. */
export function when(startsAt: string | null, now: Date, t: Copy): { label: string | null; learn: string } {
  if (!startsAt) return { label: null, learn: t.match.learnAfter };
  const today = dayKey(now.toISOString());
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000).toISOString());
  const day = dayKey(startsAt);
  const p = localParts(startsAt);
  // no time (the import's 00:00): the day alone
  const time = hasTime(startsAt) ? ` ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` : '';
  if (day === today) return { label: `${t.match.today}${time}`, learn: t.match.learnTonight };
  if (day === tomorrow) return { label: `${t.match.tomorrow}${time}`, learn: t.match.learnTomorrow };
  const weekday = t.match.weekdays[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  return { label: `${weekday}${time}`, learn: t.match.learnAfter };
}

function side(players: FeedPlayer[], areas: Record<string, string>, t: Copy): CardSide {
  const people = players.map((p) => ({
    id: p.id,
    surname: p.surname,
    first: p.first_name,
    initials: initials(p.first_name, p.surname),
    look: playerAvatar(p.id, p.gender, p.avatar),
  }));
  if (players.length === 1) {
    const p = players[0]!;
    const area = p.area_id ? areas[p.area_id] ?? null : null;
    if (!PLAYER_LEVEL_SHOWN) return { people, sub: area, level: null, area };
    const sub =
      p.level_tier != null && area
        ? fmt(t.match.levelArea, { level: levelNumber(p.level_tier), area })
        : p.level_tier != null
          ? `${t.level.label} ${levelNumber(p.level_tier)}`
          : area;
    return { people, sub, level: p.level_tier != null ? `${t.level.label} ${levelNumber(p.level_tier)}` : null, area };
  }
  // doubles: «level 5 & 4», only when both levels are known
  if (!PLAYER_LEVEL_SHOWN) return { people, sub: null, level: null, area: null };
  const levels = players.map((p) => p.level_tier);
  const sub = levels.every((l) => l != null) ? `${t.level.label} ${levels.map((l) => levelNumber(l as number)).join(' & ')}` : null;
  return { people, sub, level: sub, area: null };
}

/** a club named in a place line, with its logo path (null: its letter) */
export interface ClubMark {
  name: string;
  logo: string | null;
}

/**
 * Categories from organiser sheets come in capitals («MEDIUM»): show them in a normal case like the others («Medium»,
 * founder, 19 Oct). Only an all-caps Latin word of 3 or more letters changes; «40+», «-45 · Γυναικών» and «Μ 50+» stay
 * as they are (Greek capitals follow greekCaps rules elsewhere).
 */
/**
 * Level words the organisers' sheets write in capitals («MEDIUM», «ROOKIES 2») read in normal case like the other
 * categories. Only these words: acronyms and short forms stay as written («ITF», «ATRP», «PRC», «MED/ADV»)
 * (founder, 19 Oct: keep acronyms like ITF in capitals).
 */
const LEVEL_WORDS = new Set(['MEDIUM', 'MASTER', 'MASTERS', 'OPEN', 'ROOKIE', 'ROOKIES', 'ADVANCED', 'BEGINNER', 'BEGINNERS', 'INTERMEDIATE', 'ELITE', 'AMATEUR', 'REGULAR', 'SEASON']);

export function categoryCase(s: string): string {
  // whole words of Latin, Greek or digits; no lookbehind or Unicode property classes, so it runs the same on Hermes
  return s.replace(/[A-Za-z0-9\u0370-\u03FF\u1F00-\u1FFF]+/g, (w) => (LEVEL_WORDS.has(w) ? w[0] + w.slice(1).toLowerCase() : w));
}

export function fromFeedCard(card: FeedMatchCard, areas: Record<string, string>, t: Copy, now = new Date()): CardMatch {
  const w = when(card.starts_at, now, t);
  const doubles = card.format !== 'singles';
  // prototype order: «Σήμερα 21:00 · Μικτό · Φιλικό · Γλυφάδα», «Σήμερα 18:00 · Open Γλυφάδας · Ημιτελικός»
  // the category follows the tournament («Μ 40+»); in doubles its discipline («Διπλό γυναικών») names the format
  const place = placeLine(card, t);
  // the category stands apart on the card (founder, 18 Oct: "more prominent, not the same font"); singles or doubles
  // shows from the card itself, so only who plays is said: «Γυναικών», «Μικτό»
  const who = t.match.categoryWho[card.discipline ?? ''] ?? t.match.categoryWho[card.format] ?? null;
  const category = categoryCase([card.tournament ? card.level : null, who].filter(Boolean).join(' · ')) || undefined;
  const club: ClubMark | null = card.club ? { name: card.club, logo: card.club_logo ?? null } : null;
  const meta = [
    w.label,
    roundLabel(card.round, t),
    card.tournament || card.club ? null : card.venue,
  ]
    .filter(Boolean)
    .join(' · ');
  const players = (s: DbSide) => card.sides.find((x) => x.side === s)?.players ?? [];
  const rest = meta.slice(w.label ? w.label.length : 0).replace(/^ · /, '');
  const later = card.starts_at ? dayKey(card.starts_at) > feedDay(now) : false;
  return {
    kind: 'match',
    category,
    moved: card.moved_from && w.label ? movedOf(w.label, rest, dayShort(card.moved_from, t), t) : undefined,
    id: card.match_id,
    meta,
    learn: w.learn,
    doubles,
    a: side(players(1), areas, t),
    b: side(players(2), areas, t),
    myVote: card.my_vote ? toUiSide(card.my_vote) : undefined,
    split: card.split ? toPct(card.split) : undefined,
    closed: card.closed === true ? true : undefined,
    place: card.tournament ? undefined : place ?? undefined,
    later,
    startsAt: card.starts_at ?? undefined,
    lockAt: card.lock_at ?? undefined,
    tournamentId: card.tournament?.id,
    // «Αύριο και μετά» too sits by tournament (founder, 19 Oct), each tournament once; every card says its own day
    group: card.tournament
      ? {
          key: `${card.tournament.id}|${place ?? ''}`,
          title: card.tournament.name,
          logo: card.tournament.logo ?? null,
          // the surface leaves the line for its own pill (founder, 19 Oct)
          sub: placeLine({ ...card, surface: null }, t),
          club,
          surface: card.surface ?? null,
        }
      : undefined,
    club: club ?? undefined,
  };
}

/**
 * A match of a tournament's day (api.get_tournament) as a vote row. That page's matches carry no vote or split, so the
 * row starts open or closed by the clock (and by a result); `overlayFeed` lays the feed's own state over it. Names carry
 * their roster id, so a hold on one opens the player's run.
 */
export function fromTournamentMatch(m: TournamentMatch, tournamentId: string, t: Copy, now = new Date()): CardMatch {
  const players = (s: DbSide) => m.sides.find((x) => x.side === s)?.players ?? [];
  const who = t.match.categoryWho[m.discipline ?? ''] ?? t.match.categoryWho[m.format] ?? null;
  const category = categoryCase([m.level, who].filter(Boolean).join(' · ')) || undefined;
  const lockMs = m.starts_at ? toMs(voteLockInstant(m.starts_at, null)) : Infinity;
  return {
    kind: 'match',
    id: m.match_id,
    meta: roundLabel(m.round, t) ?? '',
    learn: '',
    doubles: m.format !== 'singles',
    a: side(players(1), {}, t),
    b: side(players(2), {}, t),
    closed: m.winner_side !== null || m.postponed === true || now.getTime() >= lockMs ? true : undefined,
    startsAt: m.starts_at ?? undefined,
    category,
    tournamentId,
  };
}

/** the feed's card for the same match says what the tournament page cannot: your vote, the split, and the real lock */
export function overlayFeed(card: CardMatch, fed: CardMatch | undefined): CardMatch {
  if (!fed) return card;
  const closed = card.closed || fed.closed;
  return { ...card, myVote: fed.myVote, split: fed.split, lockAt: fed.lockAt, closed: closed ? true : undefined };
}

/** from 23:00 (Athens) the evening is over: Σήμερα already shows tomorrow's matches (founder, 18 Oct) */
export const NEXT_DAY_FROM_HOUR = 23;

/** the day Σήμερα counts as today: today, or tomorrow once it is past NEXT_DAY_FROM_HOUR */
export function feedDay(now: Date): string {
  const late = localParts(now.toISOString()).hour >= NEXT_DAY_FROM_HOUR;
  return dayKey(new Date(now.getTime() + (late ? 86_400_000 : 0)).toISOString());
}

/** how long before the start an idle card says «Ξεκινά σε …» */
export const SOON_MINUTES = 60;

/** Whole minutes until the start (rounded up) while it is under SOON_MINUTES away; null otherwise. */
export function startsSoon(startsAt: string | undefined, now: Date, windowMin = SOON_MINUTES): number | null {
  if (!startsAt) return null;
  const ms = Date.parse(startsAt) - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const min = Math.ceil(ms / 60_000);
  return min <= windowMin ? min : null;
}

export function soonLabel(min: number, t: Copy): string {
  return min === 1 ? t.match.soon.one : fmt(t.match.soon.many, { n: min });
}

/**
 * Today's matches still taking votes: how many wait for this viewer's vote and how many they voted on already.
 * `votedNow` holds the ids voted on since the feed loaded (the cards keep the vote they loaded with).
 */
export interface VoteCount {
  /** today, waiting for your vote */
  open: number;
  /** today, voted on */
  voted: number;
  /** later days (under «Αύριο και μετά»), waiting for your vote */
  later: number;
}

export function openToVote(cards: FeedCard[], votedNow: ReadonlySet<string> = new Set()): VoteCount {
  const n: VoteCount = { open: 0, voted: 0, later: 0 };
  for (const c of cards) {
    if (c.kind !== 'match' || c.closed) continue;
    const mine = c.myVote !== undefined || votedNow.has(c.id);
    if (c.later) n.later += mine ? 0 : 1;
    else if (mine) n.voted += 1;
    else n.open += 1;
  }
  return n;
}

/**
 * The line under «Τι παίζει σήμερα;»: what waits for your vote today; once today is done, «Ψήφισες σε όλα»; with nothing
 * today, what waits under «Αύριο και μετά»; else what the tab is for.
 */
export function feedLine(count: VoteCount, t: Copy): string {
  if (count.open === 1) return t.feed.open.one;
  if (count.open > 1) return fmt(t.feed.open.many, { n: count.open });
  if (count.voted > 0) return t.feed.allVoted;
  if (count.later === 1) return t.feed.openLater.one;
  if (count.later > 1) return fmt(t.feed.openLater.many, { n: count.later });
  return t.feed.subtitle;
}

/**
 * Σήμερα shows today (founder, 14 Oct: «Τι παίζει σήμερα» first, the rest out of the way): matches on a later day go
 * into the folded «Αύριο και μετά». Matches sit together by tournament, as on Αποτελέσματα (founder, 19 Oct: "list
 * everything based on the tournament"), each tournament once: the one whose next match to vote comes first leads, and
 * inside it the matches run in time order (founder, 18 Oct), the ones still to vote before the ones that started.
 * Tournaments with nothing left to vote go after the ads and put-off cards. «Αύριο και μετά» sits by tournament the same
 * way (founder, 19 Oct), each card saying its own day.
 */
export function splitToday<C extends { kind: string; later?: boolean; startsAt?: string; closed?: boolean; group?: { key: string } }>(
  cards: C[],
): { today: C[]; later: C[] } {
  const time = (c: C) => c.startsAt ?? '\uffff';
  // in time order; the feed's own order (yours first) only breaks ties
  const byTime = (list: { c: C; i: number }[]) => [...list].sort((x, y) => time(x.c).localeCompare(time(y.c)) || x.i - y.i);
  type Run = { open: boolean; first: { c: C; i: number }; cards: { c: C; i: number }[] };
  const byTournament = (list: { c: C; i: number }[]): Run[] => {
    const runs = new Map<string, { c: C; i: number }[]>();
    // a match outside a tournament is a run of its own
    list.forEach((x) => {
      const key = x.c.group?.key ?? `solo:${x.i}`;
      runs.set(key, [...(runs.get(key) ?? []), x]);
    });
    return [...runs.values()].map((run) => {
      const open = byTime(run.filter((x) => !x.c.closed));
      return { open: open.length > 0, first: (open[0] ?? byTime(run)[0])!, cards: [...open, ...byTime(run.filter((x) => x.c.closed))] };
    });
  };
  const ordered = (list: Run[]) =>
    [...list].sort((x, y) => time(x.first.c).localeCompare(time(y.first.c)) || x.first.i - y.first.i).flatMap((r) => r.cards.map((x) => x.c));
  const indexed = cards.map((c, i) => ({ c, i }));
  const todays = indexed.filter((x) => !x.c.later);
  const runs = byTournament(todays.filter((x) => x.c.kind === 'match'));
  const rest = todays.filter((x) => x.c.kind !== 'match').map((x) => x.c);
  const laterRuns = byTournament(indexed.filter((x) => x.c.later));
  return {
    today: [...ordered(runs.filter((r) => r.open)), ...rest, ...ordered(runs.filter((r) => !r.open))],
    later: ordered(laterRuns),
  };
}

/**
 * «Αύριο και μετά» starts open when today holds nothing left to vote on (founder, 18 Oct: "the main list should not be
 * hidden no matter if we voted on the matches"); while today still has a match to vote, it waits folded.
 */
export function laterOpenByDefault<C extends { kind: string; myVote?: unknown; closed?: boolean }>(today: C[]): boolean {
  return !today.some((c) => c.kind === 'match' && c.myVote === undefined && !c.closed);
}

/**
 * Which cards open a new tournament run on Σήμερα: the header shows above a match whose group differs from the last
 * match's. Ads and put-off matches in between do not break a run.
 */
export function groupHeads<C extends { kind: string; group?: { key: string } }>(cards: C[]): Set<number> {
  const heads = new Set<number>();
  let last: string | null = null;
  cards.forEach((c, i) => {
    if (c.kind !== 'match') return;
    const key = c.group?.key ?? null;
    if (key !== null && key !== last) heads.add(i);
    last = key;
  });
  return heads;
}

type RunCard = { kind: string; group?: { key: string }; category?: string };

/**
 * The category tag, said only where it tells matches apart (founder, 19 Oct: not overwhelming). Inside one tournament
 * run (as groupHeads reads it: consecutive matches of one group, ads and put-off cards in between do not break it) a
 * category the whole run shares moves up to the run's head, and the cards drop it; a run that mixes «40+» and «50+»
 * keeps it on every card. A match outside a tournament always keeps its own.
 * `hide`: card indices whose tag is not shown; `head`: run head index → the category said once by its head.
 */
export function runCategories<C extends RunCard>(cards: C[]): { hide: Set<number>; head: Map<number, string> } {
  const hide = new Set<number>();
  const head = new Map<number, string>();
  const runs: number[][] = [];
  let last: string | null = null;
  cards.forEach((c, i) => {
    if (c.kind !== 'match') return;
    const key = c.group?.key ?? null;
    if (key === null) {
      last = null;
      return;
    }
    if (key !== last) runs.push([]);
    runs[runs.length - 1]!.push(i);
    last = key;
  });
  for (const run of runs) {
    const cats = new Set(run.map((i) => cards[i]!.category ?? ''));
    if (cats.size !== 1) continue;
    const only = [...cats][0];
    run.forEach((i) => hide.add(i));
    if (only) head.set(run[0]!, only);
  }
  return { hide, head };
}

type OpenCard = { kind: string; id: string; myVote?: unknown; closed?: boolean };

/** The first card still waiting for this viewer's vote (`votedNow`: voted since the feed loaded), or -1. */
export function firstOpenIndex<C extends OpenCard>(cards: C[], votedNow: ReadonlySet<string> = new Set()): number {
  return cards.findIndex((c) => c.kind === 'match' && !c.closed && c.myVote === undefined && !votedNow.has(c.id));
}

/** «Για σένα» comes after this many match cards (founder, 19 Oct) */
export const FOLD_AFTER_MATCHES = 3;

/**
 * Where «Για σένα» sits on Σήμερα (founder, 19 Oct: voting comes first, but not a whole tournament first): after the
 * 3rd match card of today, whatever the tournament runs (ads and put-off cards do not count), or at the end of today
 * when it has fewer. When the 3rd match opens a tournament run that goes on, it goes before that run's head instead, so
 * it never splits a head from its first matches. It reads the cards the feed loaded with, so it does not jump while you
 * vote. With nothing to vote it leads, as before. The index is the card it goes before (`cards.length`: at the end);
 * it never passes `bound` (the first later-day card), so it stays above «Αύριο και μετά».
 */
export function foldSlot<C extends OpenCard & { group?: { key: string } }>(cards: C[], bound = cards.length): number {
  if (firstOpenIndex(cards) < 0) return 0;
  const stop = Math.min(bound, cards.length);
  let count = 0;
  let last: string | null = null;
  for (let i = 0; i < stop; i++) {
    const c = cards[i]!;
    if (c.kind !== 'match') continue;
    const key = c.group?.key ?? null;
    // a head as groupHeads reads it: a tournament match whose group differs from the last match's
    const head = key !== null && key !== last;
    last = key;
    if (++count < FOLD_AFTER_MATCHES) continue;
    const next = cards.slice(i + 1, stop).find((x) => x.kind === 'match');
    return head && next !== undefined && (next.group?.key ?? null) === key ? i : i + 1;
  }
  return stop;
}

/** The one line a result folds into once played (founder, 19 Oct): «✓ Δρουλιάς · +10 · σερί 2», or «Δρουλιάς κέρδισε». */
export function resultStrip(card: CardResult, t: Copy): { tick: boolean; name: string; pill: string | null } {
  if (card.ok) return { tick: true, name: card.winnerSurname, pill: card.pill };
  const pair = card.winnerSurname.includes(' & ');
  return { tick: false, name: fmt(pair ? t.result.wonPair : t.result.won, { winner: card.winnerSurname }), pill: card.pill };
}

function movedOf(head: string, tail: string, wasDay: string, t: Copy): NonNullable<CardMatch['moved']> {
  return { chip: t.match.postponed.newDay, was: `(${fmt(t.match.postponed.was, { when: wasDay })})`, head, tail };
}

export function fromPostponedCard(card: FeedPostponedCard, areas: Record<string, string>, t: Copy): CardPostponed {
  const players = (s: DbSide) => card.sides.find((x) => x.side === s)?.players ?? [];
  const was = card.starts_at ? fmt(t.match.postponed.was, { when: dayTimeShort(card.starts_at, t) }) : null;
  return {
    kind: 'postponed',
    id: card.match_id,
    chip: t.match.postponed.chip,
    meta: [card.tournament?.name, was].filter(Boolean).join(' · '),
    a: side(players(1), areas, t),
    b: side(players(2), areas, t),
    note: card.my_vote ? t.match.postponed.keptVote : t.match.postponed.seeNewDay,
  };
}

export function fromSponsored(card: FeedSponsoredCard): CardSponsored {
  return {
    kind: 'sponsored',
    id: card.id,
    label: card.label,
    sponsor: card.sponsor,
    title: card.title,
    subtitle: card.subtitle,
    ctaUrl: card.cta_url,
    imageUrl: card.image_url,
    art: card.art,
  };
}

/** sample data: about half the players have an account, so both the drawn players and the initials show */
const mockLook = (p: MockPlayer): AvatarLook | null => (p.surname.length % 2 === 0 ? playerAvatar(p.surname, null, 'default') : null);

function mockSide(p: MockPlayer, t: Copy, p2?: MockPlayer): CardSide {
  if (p2) {
    const lv = PLAYER_LEVEL_SHOWN ? `${t.level.label} ${p.level} & ${p2.level}` : null;
    return {
      people: [p, p2].map((x) => ({ id: x.id, surname: x.surname, first: x.firstName, initials: initials(x.firstName, x.surname), look: mockLook(x) })),
      sub: lv,
      level: lv,
      area: null,
    };
  }
  return {
    people: [{ id: p.id, surname: p.surname, first: p.firstName, initials: initials(p.firstName, p.surname), look: mockLook(p) }],
    sub: PLAYER_LEVEL_SHOWN ? fmt(t.match.levelArea, { level: p.level, area: p.area }) : p.area,
    level: PLAYER_LEVEL_SHOWN ? `${t.level.label} ${p.level}` : null,
    area: p.area,
  };
}

export function fromMock(m: MockMatch, t: Copy, now = new Date()): CardMatch {
  const soonAt = m.startsInMin !== undefined ? new Date(now.getTime() + m.startsInMin * 60_000) : null;
  const time = soonAt ? `${String(soonAt.getHours()).padStart(2, '0')}:${String(soonAt.getMinutes()).padStart(2, '0')}` : m.time;
  const parts = [`${m.day === 'today' ? t.match.today : t.match.tomorrow} ${time}`, m.event];
  if (m.round) parts.push(t.match.rounds[m.round]);
  return {
    kind: 'match',
    id: m.id,
    moved: m.movedBack ? movedOf(parts[0]!, parts.slice(1).join(' · '), dayShort(new Date(now.getTime() - 3 * 86_400_000).toISOString(), t), t) : undefined,
    doubles: Boolean(m.a2 && m.b2),
    meta: parts.join(' · '),
    learn: m.day === 'today' ? t.match.learnTonight : t.match.learnTomorrow,
    later: m.day !== 'today',
    a: mockSide(m.a, t, m.a2),
    b: mockSide(m.b, t, m.b2),
    place: placeLine(m, t) ?? undefined,
    startsAt: soonAt ? soonAt.toISOString() : undefined,
    category: m.category ? categoryCase(m.category) : undefined,
    tournamentId: m.tournamentId,
    day: dayKey(new Date(now.getTime() + (m.day === 'today' ? 0 : 86_400_000)).toISOString()),
  };
}

/** Mock mode only: the split the viewer would see after voting. */
export function mockVote(m: MockMatch, pick: Side): CardPct {
  const s = voteSplit(m.votes.a, m.votes.b, pick);
  return { pctA: s.pctA, pctB: s.pctB };
}

export type VoteErrorKind = 'votingClosed' | 'voteFailed';

/** RPC codes that mean the match can no longer take this vote. */
const CLOSED = new Set(['voting_closed', 'match_not_found', 'already_voted', 'own_match']);

export function voteErrorKind(err: unknown): VoteErrorKind {
  return err instanceof RpcError && CLOSED.has(err.code) ? 'votingClosed' : 'voteFailed';
}
