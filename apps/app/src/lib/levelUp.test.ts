import { describe, expect, it } from 'vitest';
import { motion } from '@netprophet/tokens';
import { LEVEL_UP, LEVEL_UP_AT } from './levelUp';

describe('the level-up move', () => {
  it('runs in order: crouch, rise, fall, land, hop', () => {
    expect(LEVEL_UP.land).toBe(LEVEL_UP.crouch + LEVEL_UP.rise + LEVEL_UP.fall);
    expect(LEVEL_UP.hopAt).toBeGreaterThan(LEVEL_UP.land + 320);
    expect(LEVEL_UP.total).toBeGreaterThan(LEVEL_UP.hopAt);
  });
  it('fits the celebration: over before «Συνέχεια», the whole moment 3 to 4s', () => {
    expect(LEVEL_UP_AT + LEVEL_UP.total).toBeLessThanOrEqual(motion.celebration);
    expect(motion.celebration).toBeGreaterThanOrEqual(3000);
    expect(motion.celebration).toBeLessThanOrEqual(4000);
  });
});
