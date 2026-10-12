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
  match_confirmed: { outcome: 'confirmed' | 'corrected' | 'disputed' };
  match_logged: { mode: 'played' | 'soon'; format: 'singles' | 'doubles' | 'mixed'; attached: boolean; new_people: number };
  /** the opponent link: shared by the logger, then opened, answered, hidden or claimed by the other side */
  link_shared: { app: 'whatsapp' | 'viber' | 'sms' | 'other'; links: number };
  link_opened: { state: 'pending' | 'confirmed' | 'disputed' | 'not_me' | 'gone' };
  link_answered: { outcome: 'confirmed' | 'corrected' | 'disputed' };
  link_hidden: { hidden: boolean };
  link_claimed: { result: 'ok' | 'taken' | 'other' | 'failed' };
  kudo_given: { source: 'log' | 'results' };
  reaction_set: { key: string | null };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
