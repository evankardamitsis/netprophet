import { describe, expect, it } from 'vitest';
import { getCopy } from './index';

describe('copy', () => {
  it('has the same shape in both locales', () => {
    expect(Object.keys(getCopy('en'))).toEqual(Object.keys(getCopy('el')));
  });
  it('uses level, not επίπεδο', () => {
    expect(JSON.stringify(getCopy('el'))).not.toContain('επίπεδο');
  });
  it('contains no em dashes', () => {
    expect(JSON.stringify([getCopy('el'), getCopy('en')])).not.toContain(String.fromCharCode(0x2014));
  });
});
