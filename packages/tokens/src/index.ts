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
  /** a row sitting on ink, a notch lighter than the sheet (quests toggle) */
  inkDeep: '#1A2F26',
  /** dividers on ink */
  inkLine: '#3A4C43',
  /** labels on ink; card borders on paper */
  mist: '#D5DDD3',
  /** vote button outline before a pick */
  slate: '#5C6E64',
  /** tab bar top border */
  navLine: '#DDE3D8',
  /** a silver badge tile */
  silver: '#E3E9DE',
  /** sponsored card surface */
  sand: '#E6EAE0',
  /** a loss in the form dots on paper */
  stone: '#C9D1C4',
  /** search input outline while idle */
  fog: '#7C8A82',
  /** cards, inputs, tab bar */
  white: '#FFFFFF',
  /** the deeper lime among the celebration confetti */
  leaf: '#9BD05A',
  /** the logo's bouncing balls in their own colours (tennis is lime, football paper and ink) */
  padelBall: '#F2E14C',
  basketBall: '#E8742A',
} as const;

/**
 * The cosmetics (Εμφάνιση): the colours of the card backgrounds, frames and kits, from the prototype's
 * `.bgl`, `.frm` and catalogue. They dress the Εγώ card only; they are never UI chrome, and lime still means earned.
 */
export const cosmetics = {
  bg: {
    clay: '#A24E2A',
    hard: '#2F6B8F',
    grassDark: '#2B6B33',
    grassLight: '#33803C',
    nightTop: '#0B1233',
    nightMid: '#1A2A6E',
    indoorDark: '#BC8C52',
    indoorLight: '#C99A5E',
    centerSky: '#1B2440',
    centerGrass: '#2E7A3A',
  },
  frame: {
    /** the glow and ring of «Επτά» */
    glow: '#F2D36B',
    bronze: '#B87333',
    silver: '#C9D1C4',
    gold: '#E4C25A',
    goldDeep: '#7A5E14',
    goldShadow: '#B8902A',
    goldLight: '#F7E7A3',
    goldInk: '#2B2208',
    goldDark: '#8C6A12',
    retroRed: '#C45A3A',
    retroCream: '#F1E4C6',
    retroInk: '#7A2A12',
    grassDark: '#3E8A33',
    grassLight: '#68B84A',
    grassPlate: '#2E7D3A',
    grassPlateLight: '#3E9244',
  },
  /** shirt and racket colours of the kits */
  kit: {
    kit_green: { shirt: '#2B4A3C', racket: '#5A8070' },
    kit_white: { shirt: '#E8EDE3', racket: '#9BA39F' },
    kit_black: { shirt: '#1B1F1D', racket: '#D5DDD3' },
    kit_grass: { shirt: '#2E7D3A', racket: '#D9F03F' },
    kit_clay: { shirt: '#B4532A', racket: '#F3F5EE' },
    kit_night: { shirt: '#1B2A6B', racket: '#9DB0FF' },
  },
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

export const tokens = { colors, cosmetics, radii, spacing, motion } as const;

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
