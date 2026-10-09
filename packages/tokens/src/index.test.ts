import { describe, expect, it } from 'vitest';
import { colors, cssVars, motion } from './index';

describe('tokens', () => {
  it('exposes the motion contract', () => {
    expect(motion.revealDur).toBe(700);
    expect(motion.stagger).toBe(70);
    expect(motion.celebration).toBe(3500);
  });
  it('emits css vars', () => {
    const css = cssVars();
    expect(css).toContain(`--np-lime: ${colors.lime};`);
    expect(css).toContain('--np-reveal-dur: 700ms;');
  });
});
