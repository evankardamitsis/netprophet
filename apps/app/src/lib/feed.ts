import { dayKey, localParts } from '@netprophet/core';
import { greekCaps, type Copy } from '@netprophet/copy';
import { RpcError, type FeedMatchCard, type FeedPlayer, type FeedSponsoredCard, type Side as DbSide, type VoteSplit } from '@netprophet/db';
import type { MockMatch, MockPlayer } from '../mock/matches';
import { fmt, voteSplit, type Side } from './votes';

/** One player on a card. */
export interface CardPerson {
  surname: string;
  first: string;
  /** avatar letters, «ΝΡ» */
  initials: string;
}

/** One side of a card: one player, or two in doubles, plus the «level · area» line. */
export interface CardSide {
  people: CardPerson[];
  sub: string | null;
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
}

/** The labelled ad card (prototype: every 4th card). */
export interface CardSponsored {
  kind: 'sponsored';
  id: string;
  label: string;
  title: string;
  subtitle: string | null;
}

export type FeedCard = CardMatch | CardSponsored;

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
  const people = players.map((p) => ({ surname: p.surname, first: p.first_name, initials: initials(p.first_name, p.surname) }));
  if (players.length === 1) {
    const p = players[0]!;
    const area = p.area_id ? areas[p.area_id] ?? null : null;
    const sub =
      p.level_tier != null && area
        ? fmt(t.match.levelArea, { level: p.level_tier, area })
        : p.level_tier != null
          ? `${t.level.label} ${p.level_tier}`
          : area;
    return { people, sub };
  }
  // doubles: «level 5 & 4», only when both levels are known
  const levels = players.map((p) => p.level_tier);
  const sub = levels.every((l) => l != null) ? `${t.level.label} ${levels.join(' & ')}` : null;
  return { people, sub };
}

export function fromFeedCard(card: FeedMatchCard, areas: Record<string, string>, t: Copy, now = new Date()): CardMatch {
  const w = when(card.starts_at, now, t);
  const doubles = card.format !== 'singles';
  // prototype order: «Σήμερα 21:00 · Μικτό · Φιλικό · Γλυφάδα», «Σήμερα 18:00 · Open Γλυφάδας · Ημιτελικός»
  const meta = [
    w.label,
    doubles ? t.match.formats[card.format as 'doubles' | 'mixed'] : null,
    card.tournament?.name,
    roundLabel(card.round, t),
    card.tournament ? null : card.venue,
  ]
    .filter(Boolean)
    .join(' · ');
  const players = (s: DbSide) => card.sides.find((x) => x.side === s)?.players ?? [];
  return {
    kind: 'match',
    id: card.match_id,
    meta,
    learn: w.learn,
    doubles,
    a: side(players(1), areas, t),
    b: side(players(2), areas, t),
    myVote: card.my_vote ? toUiSide(card.my_vote) : undefined,
    split: card.split ? toPct(card.split) : undefined,
  };
}

export function fromSponsored(card: FeedSponsoredCard): CardSponsored {
  return { kind: 'sponsored', id: card.id, label: card.label, title: card.title, subtitle: card.subtitle };
}

function mockSide(p: MockPlayer, t: Copy): CardSide {
  return {
    people: [{ surname: p.surname, first: p.firstName, initials: initials(p.firstName, p.surname) }],
    sub: fmt(t.match.levelArea, { level: p.level, area: p.area }),
  };
}

export function fromMock(m: MockMatch, t: Copy): CardMatch {
  const parts = [`${m.day === 'today' ? t.match.today : t.match.tomorrow} ${m.time}`, m.event];
  if (m.round) parts.push(t.match.rounds[m.round]);
  return {
    kind: 'match',
    id: m.id,
    doubles: false,
    meta: parts.join(' · '),
    learn: m.day === 'today' ? t.match.learnTonight : t.match.learnTomorrow,
    a: mockSide(m.a, t),
    b: mockSide(m.b, t),
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
