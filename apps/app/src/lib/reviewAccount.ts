/**
 * The store reviewers' account (founder, 26 Oct). Apple and Google review with a ready-made email and password, so this
 * one address signs in with a password; every other email keeps the one-time code. The server holds the same rule: a
 * guard on auth.users lets no other account have a password (supabase-v2 migration review_password_only).
 */
export const REVIEW_EMAIL = 'review@monadlabs.gr';

/** true only for the review address, in any case, with spaces around it */
export function isReviewEmail(email: string): boolean {
  return email.trim().toLowerCase() === REVIEW_EMAIL;
}

/** What the email step asks for: a password for the review account, a one-time code for everyone else. */
export function authMode(email: string): 'password' | 'code' {
  return isReviewEmail(email) ? 'password' : 'code';
}
