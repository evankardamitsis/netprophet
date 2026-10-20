import { describe, expect, it } from 'vitest';
import { appleName, CODE_LEN, codeDigits, shouldAutoSubmit } from './authErrors';

describe('the email code', () => {
  it('keeps digits only, six at most (typed, pasted or filled in from Mail)', () => {
    expect(codeDigits('123 456')).toBe('123456');
    expect(codeDigits('Ο κωδικός: 98-76-54')).toBe('987654');
    expect(codeDigits('12345678')).toBe('123456');
    expect(codeDigits('')).toBe('');
    expect(CODE_LEN).toBe(6);
  });

  it('goes in by itself at six digits, never while one is on its way', () => {
    expect(shouldAutoSubmit('123456', false)).toBe(true);
    expect(shouldAutoSubmit('12345', false)).toBe(false);
    expect(shouldAutoSubmit('123456', true)).toBe(false);
    expect(shouldAutoSubmit('12345a', false)).toBe(false);
  });
});

describe('appleName', () => {
  it('the name Apple sends on the first sign-in', () => {
    expect(appleName({ givenName: ' Ελένη ', familyName: 'Παππά' })).toEqual({ first: 'Ελένη', surname: 'Παππά' });
    expect(appleName({ givenName: 'Ελένη', familyName: null })).toEqual({ first: 'Ελένη', surname: '' });
  });

  it('null when Apple sent nothing (every later sign-in) or an email', () => {
    expect(appleName(null)).toBeNull();
    expect(appleName({ givenName: null, familyName: null })).toBeNull();
    expect(appleName({ givenName: '', familyName: ' ' })).toBeNull();
    expect(appleName({ givenName: 'a@b.gr', familyName: '' })).toBeNull();
  });
});
