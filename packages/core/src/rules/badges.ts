/** Badge tiers and the progress-bar rule: for badges, show the bar only when one step from completion. */
import type { BadgeDef } from '../types';

const b = (id: string, unit: string, t: [number, number, number], hasCard = false): BadgeDef => ({
  id,
  unit,
  thresholds: t,
  hasCard,
});

/** The 16 badges (ids and counters as in core.badge_defs). `hasCard`: the four that can be worn on the player card. */
export const BADGES: readonly BadgeDef[] = [
  b('first_serve', 'matches_logged', [1, 5, 25], true),
  b('nice_player', 'confirmations', [1, 5, 20]),
  b('gentleman', 'kudos_given', [3, 15, 50], true),
  b('beloved', 'kudos_received', [3, 15, 50]),
  b('club_oracle', 'votes_correct', [5, 25, 100]),
  b('upset', 'upset_calls', [1, 5, 15]),
  b('in_a_row', 'streak_best', [5, 7, 10], true),
  b('influencer', 'friends_joined', [1, 3, 10]),
  b('whole_week', 'full_weeks', [1, 4, 12]),
  b('doubles_player', 'doubles_logged', [1, 5, 15]),
  b('variety', 'opponents', [5, 15, 40], true),
  b('steady', 'active_weeks', [4, 12, 26]),
  b('many_votes', 'votes_cast', [25, 100, 500]),
  b('generous', 'treats', [1, 5, 15]),
  b('season_veteran', 'seasons', [1, 2, 4]),
  b('month_top', 'months_top3', [1, 3, 10]),
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
