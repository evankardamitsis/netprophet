/** Pure auth helpers, kept apart from the provider so they can be unit tested. */
export type AuthErrorKind = 'invalidEmail' | 'badCode' | 'tooMany' | 'generic';

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

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
