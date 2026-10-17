import { describe, expect, it } from 'vitest';
import { colors, cosmetics, cssVars, motion, type } from './index';

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
  it('keeps every cosmetic colour a 6-digit hex', () => {
    const hexes = [...Object.values(cosmetics.bg), ...Object.values(cosmetics.frame), ...Object.values(cosmetics.kit).flatMap((k) => [k.shirt, k.racket]), ...Object.values(cosmetics.gear), ...cosmetics.confetti, ...cosmetics.crowd];
    for (const v of hexes) expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });
  it('keeps the type scale in descending order', () => {
    const sizes = [type.title.size, type.heading.size, type.body.size, type.meta.size, type.label.size];
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });
});
