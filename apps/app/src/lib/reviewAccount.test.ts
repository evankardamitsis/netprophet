import { describe, expect, it } from 'vitest';
import { authErrorKind, passwordErrorKind } from './authErrors';
import { authMode, isReviewEmail, REVIEW_EMAILS } from './reviewAccount';

describe('the review accounts', () => {
  it('are two addresses: Apple (no Pro) and Google (with Pro)', () => {
    expect(REVIEW_EMAILS).toEqual(['review@monadlabs.gr', 'play-review@monadlabs.gr']);
  });

  it('matches in any case and with spaces around it', () => {
    expect(isReviewEmail('review@monadlabs.gr')).toBe(true);
    expect(isReviewEmail('  Review@MonadLabs.GR ')).toBe(true);
    expect(isReviewEmail('play-review@monadlabs.gr')).toBe(true);
    expect(isReviewEmail(' Play-Review@MonadLabs.gr')).toBe(true);
  });

  it('matches nothing else', () => {
    expect(isReviewEmail('')).toBe(false);
    expect(isReviewEmail('review@monadlabs.gr.evil.com')).toBe(false);
    expect(isReviewEmail('xreview@monadlabs.gr')).toBe(false);
    expect(isReviewEmail('review@monadlabs.g')).toBe(false);
    expect(isReviewEmail('hello@monadlabs.gr')).toBe(false);
    expect(isReviewEmail('rev iew@monadlabs.gr')).toBe(false);
    expect(isReviewEmail('playreview@monadlabs.gr')).toBe(false);
    expect(isReviewEmail('play-review@monadlabs.gr.evil.com')).toBe(false);
  });
});

describe('the email step', () => {
  it('asks the review account for a password', () => {
    expect(authMode('review@monadlabs.gr')).toBe('password');
    expect(authMode(' REVIEW@monadlabs.gr')).toBe('password');
    expect(authMode('play-review@monadlabs.gr')).toBe('password');
  });

  it('sends everyone else a one-time code, as today', () => {
    expect(authMode('eleni@email.gr')).toBe('code');
    expect(authMode('review@gmail.com')).toBe('code');
    expect(authMode('')).toBe('code');
  });
});

describe('password errors', () => {
  it('a wrong password says so', () => {
    expect(passwordErrorKind({ status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('badPassword');
    expect(passwordErrorKind({ status: 400, message: 'Invalid login credentials' })).toBe('badPassword');
  });

  it('rate limits and server failures keep their own message', () => {
    expect(passwordErrorKind({ status: 429, message: 'rate limit' })).toBe('tooMany');
    expect(passwordErrorKind({ status: 500, message: 'Database error' })).toBe('generic');
  });

  it('the code flow is unchanged', () => {
    expect(authErrorKind({ status: 400, code: 'invalid_credentials', message: 'x' })).toBe('badCode');
  });
});
