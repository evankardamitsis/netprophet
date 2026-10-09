/** Badge tiers and the progress-bar rule: for badges, show the bar only when one step from completion. */
import type { BadgeDef } from '../types';

const b = (id: string, unit: string, t: [number, number, number], hasCard = false): BadgeDef => ({
  id,
  unit,
  thresholds: t,
  hasCard,
});

export const BADGES: readonly BadgeDef[] = [
  b('proto-servis', 'matches_logged', [1, 5, 25]),
  b('oraios-o-paichtis', 'confirmations_given', [1, 5, 20]),
  b('o-evgenikos', 'kudos_given', [3, 15, 50]),
  b('agapitos', 'kudos_from_distinct_opponents', [3, 15, 50]),
  b('manths-tou-klab', 'correct_votes', [5, 25, 100]),
  b('anatropi', 'upset_calls', [1, 5, 15]),
  b('sti-seira', 'best_streak', [5, 7, 10]),
  b('influencer', 'friends_joined_and_played', [1, 3, 10]),
  b('oli-i-vdomada', 'full_weeks', [1, 4, 12]),
  b('o-diplistas', 'doubles_played', [1, 5, 15]),
  b('echei-poikilia', 'distinct_opponents', [5, 15, 40]),
  b('statheros', 'active_weeks', [4, 12, 26]),
  b('polla-ta-psifalakia', 'votes_cast', [25, 100, 500]),
  b('chouvarntas', 'treats_given', [1, 5, 15]),
  b('veteranos-sezon', 'seasons', [1, 2, 4]),
  b('koryfaios-tou-mina', 'top3_months', [1, 3, 10]),
];

/** Tier 0..3 for a counter value. */
export function tierFor(badge: BadgeDef, counter: number): 0 | 1 | 2 | 3 {
  let tier = 0;
  badge.thresholds.forEach((t, i) => {
    if (counter >= t) tier = i + 1;
  });
  return tier as 0 | 1 | 2 | 3;
}

export interface BadgeStep {
  badgeId: string;
  tierBefore: number;
  tierAfter: number;
  tierUp: boolean;
  /** Steps left to the next tier after this change; null once the badge is maxed. */
  remaining: number | null;
  /** Slim bar «Ένα ακόμα για το badge»: only when the counter moved and exactly one step is left. */
  showProgressBar: boolean;
  /** The third tier grants Frame Level. */
  grantsFrameLevel: boolean;
}

export function applyBadgeCounter(badge: BadgeDef, before: number, after: number): BadgeStep {
  const tierBefore = tierFor(badge, before);
  const tierAfter = tierFor(badge, after);
  const next = (badge.thresholds as readonly number[])[tierAfter]; // undefined when maxed
  const remaining = next === undefined ? null : next - after;
  return {
    badgeId: badge.id,
    tierBefore,
    tierAfter,
    tierUp: tierAfter > tierBefore,
    remaining,
    showProgressBar: after > before && remaining === 1,
    grantsFrameLevel: tierAfter === 3 && tierBefore < 3,
  };
}
