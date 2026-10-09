/** Points rules. Pure: no IO, no clock. Money and Pro never add points. */
import { monthKey, quizDayKey, type Instant } from '../time';
import type { PointsEvent, PointsReason } from '../types';

export const POINTS = {
  CORRECT_VOTE: 10,
  /** Replaces the +10 when the call was an Ανατροπή. */
  UPSET_CALL: 30,
  /** Added to a correct vote that extends a chain of at least one earlier correct vote. */
  CHAIN_BONUS: 5,
  DAILY_QUIZ: 30,
} as const;

/** An Ανατροπή: the winner had fewer than 40% of the votes, with at least 10 votes cast. */
export const UPSET_MAX_SHARE_PERCENT = 40;
export const UPSET_MIN_VOTES = 10;

export interface PointsPart {
  reason: PointsReason;
  delta: number;
}

export interface CrowdSplit {
  votesForWinner: number;
  totalVotes: number;
}

export function isUpset(crowd: CrowdSplit): boolean {
  if (crowd.totalVotes < UPSET_MIN_VOTES) return false;
  return crowd.votesForWinner * 100 < crowd.totalVotes * UPSET_MAX_SHARE_PERCENT;
}

export interface VotePointsInput {
  correct: boolean;
  upset: boolean;
  /** `chain` of the streak state before this vote is applied. */
  chainBefore: number;
}

/** Points parts for one resolved match vote. Wrong votes earn nothing. */
export function pointsForVote(input: VotePointsInput): PointsPart[] {
  if (!input.correct) return [];
  const parts: PointsPart[] = [
    input.upset
      ? { reason: 'vote_upset', delta: POINTS.UPSET_CALL }
      : { reason: 'vote_correct', delta: POINTS.CORRECT_VOTE },
  ];
  if (input.chainBefore >= 1) parts.push({ reason: 'chain_bonus', delta: POINTS.CHAIN_BONUS });
  return parts;
}

export function totalPoints(parts: readonly PointsPart[]): number {
  return parts.reduce((sum, p) => sum + p.delta, 0);
}

export const QUIZ_CARDS_FREE = 6;
export const QUIZ_CARDS_PRO = 12;

export interface QuizCompletionInput {
  answered: number;
  /** Cards in today's set: 6, or 12 for Pro. */
  required: number;
  alreadyAwardedForDay: boolean;
}

/** +30 once per quiz day when the whole set is answered. Pro's 12-card set pays the same +30. */
export function quizCompletionPoints(input: QuizCompletionInput): PointsPart[] {
  if (input.alreadyAwardedForDay) return [];
  if (input.required <= 0 || input.answered < input.required) return [];
  return [{ reason: 'daily_quiz', delta: POINTS.DAILY_QUIZ }];
}

/** Turn parts into ledger rows with idempotency keys. The month is the Athens month of `at` (resolution time). */
export function toPointsEvents(args: {
  userId: string;
  at: Instant;
  refId: string;
  parts: readonly PointsPart[];
}): PointsEvent[] {
  return args.parts.map((p) => ({
    key: `${args.refId}:${p.reason}`,
    userId: args.userId,
    delta: p.delta,
    reason: p.reason,
    at: args.at,
    monthKey: monthKey(args.at),
    refId: args.refId,
  }));
}

/** Ledger reference for the daily quiz award: one per user per quiz day (09:00 Athens boundary). */
export function quizRefId(userId: string, at: Instant): string {
  return `quiz:${userId}:${quizDayKey(at)}`;
}
