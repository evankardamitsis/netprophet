/** Pure auth helpers, kept apart from the provider so they can be unit tested. */
export type AuthErrorKind = 'invalidEmail' | 'badCode' | 'badPassword' | 'tooMany' | 'generic';

export class AuthFailure extends Error {
  constructor(public readonly kind: AuthErrorKind, message: string) {
    super(message);
    this.name = 'AuthFailure';
  }
}

/** Map a Supabase auth error to the few cases the screen tells apart. */
export function authErrorKind(err: { status?: number; code?: string; message?: string }): AuthErrorKind {
  const code = err.code ?? '';
  if (err.status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'tooMany';
  // a server failure that mentions the OTP (e.g. «Error sending … OTP») is not a wrong code
  const clientError = (err.status ?? 400) < 500;
  if (code === 'otp_expired' || code === 'invalid_credentials' || (clientError && /token|otp/i.test(err.message ?? '')))
    return 'badCode';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'invalidEmail';
  return 'generic';
}

/** The review account's password sign-in: any 4xx that is not a rate limit is a wrong password. */
export function passwordErrorKind(err: { status?: number; code?: string; message?: string }): AuthErrorKind {
  const kind = authErrorKind(err);
  if (kind === 'tooMany') return kind;
  return (err.status ?? 400) < 500 ? 'badPassword' : 'generic';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** the email code is six digits */
export const CODE_LEN = 6;

/** What the code field keeps from what was typed or pasted (or what iOS fills in from Mail): digits only, at most six. */
export function codeDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LEN);
}

/** The code goes in by itself once all six digits are there; «Μπες» stays for a manual try. Never twice at once. */
export function shouldAutoSubmit(digits: string, busy: boolean): boolean {
  return !busy && digits.length === CODE_LEN && /^\d+$/.test(digits);
}

/**
 * Sign in with Apple hands over the name only on the very first sign-in, and only to the app (the identity token has
 * no name). Kept so the first onboarding step can start filled in. Null when Apple sent nothing usable.
 */
export function appleName(full: { givenName?: string | null; familyName?: string | null } | null | undefined): { first: string; surname: string } | null {
  const first = (full?.givenName ?? '').trim();
  const surname = (full?.familyName ?? '').trim();
  if (!first && !surname) return null;
  // never an email as a name (the same rule as the server's handle_new_user)
  if (first.includes('@') || surname.includes('@')) return null;
  return { first, surname };
}
