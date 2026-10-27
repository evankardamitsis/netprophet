/**
 * The store reviewers' accounts (founder, 26 and 27 Oct). Apple and Google review with a ready-made email and password,
 * so these addresses sign in with a password; every other email keeps the one-time code. Two accounts because the
 * reviews need opposite Pro states: Apple's reviewer buys Pro in the sandbox (review@, no Pro), Google's reviewers cannot
 * use trials or buy, so they get an account that already has Pro (play-review@). The server holds the same list: a guard
 * on auth.users lets no other account have a password (supabase-v2 migrations review_password_only, play_review_account).
 */
export const REVIEW_EMAILS = ['review@monadlabs.gr', 'play-review@monadlabs.gr'] as const;

/** true only for a review address, in any case, with spaces around it */
export function isReviewEmail(email: string): boolean {
  return (REVIEW_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}

/** What the email step asks for: a password for a review account, a one-time code for everyone else. */
export function authMode(email: string): 'password' | 'code' {
  return isReviewEmail(email) ? 'password' : 'code';
}
