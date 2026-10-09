/** Pro entitlements as feature flags. Pro never affects points, ranking or outcomes. */
import { toMs, type Instant } from '../time';
import type { Entitlement } from '../types';

export const PRO_PRICE_CENTS_PER_MONTH = 899;

export type ProFeature =
  | 'quiz_cards_12'
  | 'tournament_alerts'
  | 'opponent_scouting'
  | 'deep_stats'
  | 'level_numbers'
  | 'win_cards'
  | 'season_recap';

export const PRO_FEATURES: readonly ProFeature[] = [
  'quiz_cards_12',
  'tournament_alerts',
  'opponent_scouting',
  'deep_stats',
  'level_numbers',
  'win_cards',
  'season_recap',
];

/** Waitlist (the fake door) grants nothing. Active runs until `endsAt` (null = open ended). A gift runs until `giftUntil`. */
export function isPro(ent: Entitlement | null | undefined, now: Instant): boolean {
  if (!ent) return false;
  const t = toMs(now);
  const subscribed = ent.status === 'active' && (ent.endsAt === null || t < toMs(ent.endsAt));
  const gifted = ent.giftUntil !== null && t < toMs(ent.giftUntil);
  return subscribed || gifted;
}

export function canSee(feature: ProFeature, ent: Entitlement | null | undefined, now: Instant): boolean {
  return PRO_FEATURES.includes(feature) && isPro(ent, now);
}

export function quizCardsPerDay(ent: Entitlement | null | undefined, now: Instant): 6 | 12 {
  return canSee('quiz_cards_12', ent, now) ? 12 : 6;
}
