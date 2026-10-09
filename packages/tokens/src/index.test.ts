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
    expect(css).toContain('--np-spring: cubic-bezier(.2,1.4,.4,1);');
  });
  it('keeps every colour a 6-digit hex', () => {
    for (const v of Object.values(colors)) expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });
});
