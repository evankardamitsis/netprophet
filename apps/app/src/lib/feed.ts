import { dayKey, localParts } from '@netprophet/core';
import { accusativeWord, greekCaps, nameGender, withArticleAccusative, type Copy, levelNumber } from '@netprophet/copy';
import { RpcError, type FeedMatchCard, type FeedPostponedCard, type FeedPlayer, type FeedResultCard, type FeedSponsoredCard, type Side as DbSide, type VoteSplit } from '@netprophet/db';
import type { MockMatch, MockPlayer } from '../mock/matches';
import { placeLine } from './place';
import { dayShort, dayTimeShort } from './tournaments';
import { playerAvatar, type AvatarLook } from './avatar';
import { fmt, voteSplit, type Side } from './votes';
import { PLAYER_LEVEL_SHOWN } from './levelShown';

/** One player on a card. */
export interface CardPerson {
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

/** What VoteCard renders. Built from a server feed card or from mock data. */
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
  /** the match moved to this day in the last 3 days: «Νέα μέρα» chip and «(ήταν Τρι 13/10)» after the time */
  moved?: { chip: string; was: string; head: string; tail: string };  /** «PRC (Μαρούσι) · Σκληρό»: the club and surface, when known (only on a match outside a tournament) */
  place?: string;
  /**
   * The tournament and where it is played, said once above its run of matches (founder, 16 Oct: easy to read);
   * the card's own line then keeps only the time, format, category and round.
   */
  group?: { key: string; title: string; sub: string | null };
  /** on a later day than today (Athens): Σήμερα folds these under «Αύριο και μετά» */
  later?: boolean;
  /** when it starts, for the order of «Αύριο και μετά» */
  startsAt?: string;
  /** «40+», «Μ 50+ · Γυναικών», «Μικτό»: shown as its own tag, bigger than the meta line */
  category?: string;
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

const ROUND_KEYS = ['round64', 'round32', 'round16', 'quarter', 'semi', 'final'] as const;
type RoundKey = (typeof ROUND_KEYS)[number];
const isRoundKey = (r: string): r is RoundKey => (ROUND_KEYS as readonly string[]).includes(r);

function roundLabel(round: string | null, t: Copy): string | null {
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
  const time = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  if (day === today) return { label: `${t.match.today} ${time}`, learn: t.match.learnTonight };
  if (day === tomorrow) return { label: `${t.match.tomorrow} ${time}`, learn: t.match.learnTomorrow };
  const weekday = t.match.weekdays[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  return { label: `${weekday} ${time}`, learn: t.match.learnAfter };
}

function side(players: FeedPlayer[], areas: Record<string, string>, t: Copy): CardSide {
  const people = players.map((p) => ({
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

export function fromFeedCard(card: FeedMatchCard, areas: Record<string, string>, t: Copy, now = new Date()): CardMatch {
  const w = when(card.starts_at, now, t);
  const doubles = card.format !== 'singles';
  // prototype order: «Σήμερα 21:00 · Μικτό · Φιλικό · Γλυφάδα», «Σήμερα 18:00 · Open Γλυφάδας · Ημιτελικός»
  // the category follows the tournament («Μ 40+»); in doubles its discipline («Διπλό γυναικών») names the format
  const place = placeLine(card, t);
  // the category stands apart on the card (founder, 18 Oct: "more prominent, not the same font"); singles or doubles
  // shows from the card itself, so only who plays is said: «Γυναικών», «Μικτό»
  const who = t.match.categoryWho[card.discipline ?? ''] ?? t.match.categoryWho[card.format] ?? null;
  const category = [card.tournament ? card.level : null, who].filter(Boolean).join(' · ') || undefined;
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
    // a later day says its day above the tournament's run, so «Αύριο και μετά» reads day by day
    group: card.tournament
      ? later && card.starts_at
        ? { key: `${dayKey(card.starts_at)}|${card.tournament.id}|${place ?? ''}`, title: card.tournament.name, sub: [dayShort(card.starts_at, t), place].filter(Boolean).join(' · ') }
        : { key: `${card.tournament.id}|${place ?? ''}`, title: card.tournament.name, sub: place }
      : undefined,
  };
}

/** from 23:00 (Athens) the evening is over: Σήμερα already shows tomorrow's matches (founder, 18 Oct) */
export const NEXT_DAY_FROM_HOUR = 23;

/** the day Σήμερα counts as today: today, or tomorrow once it is past NEXT_DAY_FROM_HOUR */
export function feedDay(now: Date): string {
  const late = localParts(now.toISOString()).hour >= NEXT_DAY_FROM_HOUR;
  return dayKey(new Date(now.getTime() + (late ? 86_400_000 : 0)).toISOString());
}

/**
 * Σήμερα shows today (founder, 14 Oct: «Τι παίζει σήμερα» first, the rest out of the way): matches on a later day go
 * into the folded «Αύριο και μετά». Both run in time order (founder, 18 Oct: "tomorrow's matches are mixed with the
 * day after and wednesday, we need the chronological order to be correct").
 */
export function splitToday<C extends { kind: string; later?: boolean; startsAt?: string; closed?: boolean }>(cards: C[]): { today: C[]; later: C[] } {
  // in time order; the feed's own order (yours first) only breaks ties
  const byTime = (list: C[]) =>
    list
      .map((c, i) => ({ c, i }))
      .sort((x, y) => (x.c.startsAt ?? '\uffff').localeCompare(y.c.startsAt ?? '\uffff') || x.i - y.i)
      .map(({ c }) => c);
  const todays = cards.filter((c) => !c.later);
  const open = todays.filter((c) => c.kind === 'match' && !c.closed);
  const closed = todays.filter((c) => c.kind === 'match' && c.closed);
  const rest = todays.filter((c) => c.kind !== 'match');
  // the matches still to vote first, then the rest (ads, put-off), then the ones that already started
  return { today: [...byTime(open), ...rest, ...byTime(closed)], later: byTime(cards.filter((c) => c.later)) };
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
      people: [p, p2].map((x) => ({ surname: x.surname, first: x.firstName, initials: initials(x.firstName, x.surname), look: mockLook(x) })),
      sub: lv,
      level: lv,
      area: null,
    };
  }
  return {
    people: [{ surname: p.surname, first: p.firstName, initials: initials(p.firstName, p.surname), look: mockLook(p) }],
    sub: PLAYER_LEVEL_SHOWN ? fmt(t.match.levelArea, { level: p.level, area: p.area }) : p.area,
    level: PLAYER_LEVEL_SHOWN ? `${t.level.label} ${p.level}` : null,
    area: p.area,
  };
}

export function fromMock(m: MockMatch, t: Copy, now = new Date()): CardMatch {
  const parts = [`${m.day === 'today' ? t.match.today : t.match.tomorrow} ${m.time}`, m.event];
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
