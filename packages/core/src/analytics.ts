/**
 * Product analytics taxonomy (implementation-plan §4.5). One place for event names and their properties, so the
 * app and later the site send the same shapes. PostHog holds behaviour only; points, votes and purchases stay
 * in Postgres. People are identified by user id, never by email.
 */
export interface AnalyticsEvents {
  onboarding_step: { step: string; index: number };
  onboarding_done: { claimed: boolean; known: number };
  claim_completed: { result: 'ok' | 'taken' | 'other' | 'failed' };
  vote_cast: { match_id: string; side: 1 | 2 };
  result_card_seen: { outcome: 'correct' | 'wrong' | 'none'; points: number };
  pro_sheet_viewed: { moment: string };
  pro_cta_pressed: { price: string; moment: string };
  push_permission: { granted: boolean };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
