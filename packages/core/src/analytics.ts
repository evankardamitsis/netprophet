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
  report_sent: { kind: 'match' | 'player'; reason: string };
  user_blocked: { from: 'match' | 'player' };
  /** the Baller share card: sent as a picture, or as text where pictures cannot go (the web) */
  baller_shared: { via: 'image' | 'text' };
  /** «Η σεζόν σου» (Pro, a teaser without): opened, and its recap card sent */
  season_viewed: { pro: boolean; month: string; from: string };
  season_shared: { via: 'image' | 'text' };
  /** a share card of your own win: sent, or the Pro lock shown instead */
  win_card_shared: { via: 'image' | 'text'; free: boolean };
  win_card_locked: { from: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
