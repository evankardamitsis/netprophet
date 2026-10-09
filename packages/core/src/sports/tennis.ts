/** Tennis adapter: set scores and coherence of a result. The only place tennis-specific scoring lives. */
import type { MatchResult, MatchScore, SportId } from '../types';

export type Validation = { ok: true } | { ok: false; errors: string[] };

export interface SportAdapter {
  id: SportId;
  validateResult(result: MatchResult): Validation;
}

const fail = (...errors: string[]): Validation => ({ ok: false, errors });

/** A normal set: 6-0..6-4, 7-5 or 7-6 (either side). */
export function isValidTennisSet(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === 6) return lo <= 4;
  if (hi === 7) return lo === 5 || lo === 6;
  return false;
}

/** A deciding-set match tiebreak (super tie-break): first to 10 with a 2-point margin. */
export function isValidMatchTiebreak(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < 10) return false;
  return hi === 10 ? lo <= 8 : hi - lo === 2;
}

/**
 * Validate a best-of-3 score. `totals` is [winner sets, loser sets] and must be 2-0 or 2-1.
 * Optional `periods` are per-set games from the winner's side, in play order ("6-4, 6-7, 7-5").
 * A deciding third set may be a match tiebreak.
 */
export function validateTennisScore(score: MatchScore): Validation {
  const errors: string[] = [];
  const [w, l] = score.totals;
  const okTotals = (w === 2 && (l === 0 || l === 1));
  if (!okTotals) errors.push(`totals must be 2-0 or 2-1, got ${w}-${l}`);
  if (score.periods === undefined) return errors.length ? fail(...errors) : { ok: true };

  const sets = score.periods;
  if (okTotals && sets.length !== w + l) errors.push(`expected ${w + l} sets, got ${sets.length}`);
  let wonByWinner = 0;
  let wonByLoser = 0;
  sets.forEach(([a, b], i) => {
    const decider = i === 2;
    const valid = isValidTennisSet(a, b) || (decider && isValidMatchTiebreak(a, b));
    if (!valid) errors.push(`set ${i + 1} ${a}-${b} is not a valid score`);
    if (a > b) wonByWinner += 1;
    else if (b > a) wonByLoser += 1;
  });
  if (okTotals && (wonByWinner !== w || wonByLoser !== l)) {
    errors.push(`set scores give ${wonByWinner}-${wonByLoser} but totals say ${w}-${l}`);
  }
  const last = sets[sets.length - 1];
  if (last && last[0] <= last[1]) errors.push('the match winner must win the last set');
  return errors.length ? fail(...errors) : { ok: true };
}

export const tennisAdapter: SportAdapter = {
  id: 'tennis',
  validateResult(result) {
    if (result.winnerSide !== 0 && result.winnerSide !== 1) return fail('winnerSide must be 0 or 1');
    if (result.score === null) return { ok: true };
    return validateTennisScore(result.score);
  },
};

/** Fallback for sports without an adapter yet: winner totals must beat loser totals. */
export const genericAdapter = (id: SportId): SportAdapter => ({
  id,
  validateResult(result) {
    if (result.winnerSide !== 0 && result.winnerSide !== 1) return fail('winnerSide must be 0 or 1');
    if (result.score === null) return { ok: true };
    const [w, l] = result.score.totals;
    return w > l && l >= 0 ? { ok: true } : fail(`totals ${w}-${l} do not give the winner more`);
  },
});

const ADAPTERS: Readonly<Record<string, SportAdapter>> = { tennis: tennisAdapter };

export function getSportAdapter(id: SportId): SportAdapter {
  return ADAPTERS[id] ?? genericAdapter(id);
}

export function validateResult(sport: SportId, result: MatchResult): Validation {
  return getSportAdapter(sport).validateResult(result);
}
