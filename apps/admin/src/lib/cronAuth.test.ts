import { describe, expect, it } from 'vitest';
import { bearerMatches } from './cronAuth';

describe('bearerMatches', () => {
  it('accepts the exact bearer header', () => {
    expect(bearerMatches('Bearer s3cret', 's3cret')).toBe(true);
  });
  it('rejects a wrong secret of the same length', () => {
    expect(bearerMatches('Bearer s3creT', 's3cret')).toBe(false);
  });
  it('rejects a different length', () => {
    expect(bearerMatches('Bearer s3cret1', 's3cret')).toBe(false);
    expect(bearerMatches('s3cret', 's3cret')).toBe(false);
  });
  it('fails closed when the secret is unset or empty', () => {
    expect(bearerMatches('Bearer undefined', undefined)).toBe(false);
    expect(bearerMatches('Bearer ', '')).toBe(false);
  });
  it('rejects a missing header', () => {
    expect(bearerMatches(null, 's3cret')).toBe(false);
  });
});
