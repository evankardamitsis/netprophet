/**
 * Design tokens. Every value is taken from prototype V2.dc.html.
 * The four brand colours: ink, paper, lime ("what happened" / earned), blue (the one primary action).
 * The rest are the prototype's supporting neutrals, named by where they are used.
 */
export const colors = {
  ink: '#0F2019',
  paper: '#F3F5EE',
  lime: '#D9F03F',
  blue: '#2747E6',
  muted: '#7C8A82',
  /** secondary text on paper (meta lines, first names, subtitles) */
  inkSoft: '#3F4E46',
  /** raised surface on ink (header avatar) */
  inkRaised: '#33463D',
  /** dividers on ink */
  inkLine: '#3A4C43',
  /** labels on ink; card borders on paper */
  mist: '#D5DDD3',
  /** vote button outline before a pick */
  slate: '#5C6E64',
  /** tab bar top border */
  navLine: '#DDE3D8',
  /** sponsored card surface */
  sand: '#E6EAE0',
  /** cards, inputs, tab bar */
  white: '#FFFFFF',
} as const;

export const radii = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

/** 4pt scale. */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

export const motion = {
  revealDur: 700,
  stagger: 70,
  celebration: 3500,
  /** short reveal (text and chips) */
  revealDurShort: 560,
  ease: 'cubic-bezier(.16,1,.3,1)',
  /** overshooting curve the prototype calls --spring: pops, presses, chosen buttons */
  springCurve: 'cubic-bezier(.2,1.4,.4,1)',
  spring: { damping: 14, stiffness: 180, mass: 1 },
} as const;

export const tokens = { colors, radii, spacing, motion } as const;

/** CSS custom properties for web, as a `:root { ... }` block. */
export function cssVars(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(colors)) lines.push(`  --np-${k}: ${v};`);
  for (const [k, v] of Object.entries(radii)) lines.push(`  --np-radius-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(spacing)) lines.push(`  --np-space-${k}: ${v}px;`);
  lines.push(`  --np-reveal-dur: ${motion.revealDur}ms;`);
  lines.push(`  --np-stagger: ${motion.stagger}ms;`);
  lines.push(`  --np-celebration: ${motion.celebration}ms;`);
  lines.push(`  --np-ease: ${motion.ease};`);
  lines.push(`  --np-spring: ${motion.springCurve};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}
