import { describe, expect, it } from 'vitest';
import { shouldOfferBaller } from './ballerOffer';

describe('shouldOfferBaller', () => {
  it('offers once to a player whose Baller has no name yet', () => {
    expect(shouldOfferBaller(false, null)).toBe(true);
    expect(shouldOfferBaller(false, '1')).toBe(false);
    expect(shouldOfferBaller(true, null)).toBe(false);
    expect(shouldOfferBaller(null, null)).toBe(false);
  });
});
