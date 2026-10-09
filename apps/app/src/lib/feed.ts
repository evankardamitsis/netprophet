import { dayKey, localParts } from '@netprophet/core';
import type { Copy } from '@netprophet/copy';
import { RpcError, type FeedMatchCard, type FeedPlayer, type Side as DbSide, type VoteSplit } from '@netprophet/db';
import type { MockMatch, MockPlayer } from '../mock/matches';
import { fmt, voteSplit, type Side } from './votes';

/** One side of a card, ready to render. Doubles join the two surnames. */
export interface CardSide {
  title: string;
  subtitle: string;
  detail: string | null;
}

export interface CardPct {
  pctA: number;
  pctB: number;
}

/** What VoteCard renders. Built from a server feed card or from mock data. */
export interface CardMatch {
  id: string;
  meta: string;
  learn: string;
  a: CardSide;
  b: CardSide;
  /** set when the viewer already voted: the card starts folded */
  myVote?: Side;
  split?: CardPct;
}

/** The database numbers sides 1 and 2; the UI calls them a and b. This is the only place they meet. */
export const toUiSide = (s: DbSide): Side => (s === 1 ? 'a' : 'b');
export const toDbSide = (s: Side): DbSide => (s === 'a' ? 1 : 2);

export function toPct(split: VoteSplit): CardPct {
  return { pctA: split.pct1, pctB: split.pct2 };
}

const ROUND_KEYS = ['round16', 'quarter', 'semi', 'final'] as const;
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
  return { label: `${p.day}/${p.month} ${time}`, learn: t.match.learnAfter };
}

function side(players: FeedPlayer[], areas: Record<string, string>, t: Copy): CardSide {
  if (players.length === 1) {
    const p = players[0]!;
    const area = p.area_id ? areas[p.area_id] ?? null : null;
    const detail =
      p.level_tier != null && area
        ? fmt(t.match.levelArea, { level: p.level_tier, area })
        : p.level_tier != null
          ? `${t.level.label} ${p.level_tier}`
          : area;
    return { title: p.surname, subtitle: p.first_name, detail };
  }
  return {
    title: players.map((p) => p.surname).join(' / '),
    subtitle: players.map((p) => p.first_name).join(' / '),
    detail: null,
  };
}

export function fromFeedCard(card: FeedMatchCard, areas: Record<string, string>, t: Copy, now = new Date()): CardMatch {
  const w = when(card.starts_at, now, t);
  const meta = [w.label, card.tournament?.name ?? card.venue, roundLabel(card.round, t)].filter(Boolean).join(' · ');
  const players = (s: DbSide) => card.sides.find((x) => x.side === s)?.players ?? [];
  return {
    id: card.match_id,
    meta,
    learn: w.learn,
    a: side(players(1), areas, t),
    b: side(players(2), areas, t),
    myVote: card.my_vote ? toUiSide(card.my_vote) : undefined,
    split: card.split ? toPct(card.split) : undefined,
  };
}

function mockSide(p: MockPlayer, t: Copy): CardSide {
  return { title: p.surname, subtitle: p.firstName, detail: fmt(t.match.levelArea, { level: p.level, area: p.area }) };
}

export function fromMock(m: MockMatch, t: Copy): CardMatch {
  const parts = [`${m.day === 'today' ? t.match.today : t.match.tomorrow} ${m.time}`, m.event];
  if (m.round) parts.push(t.match.rounds[m.round]);
  return {
    id: m.id,
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
