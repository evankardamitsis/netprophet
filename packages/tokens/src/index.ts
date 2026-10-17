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
    /** the scenes (founder, 17 Oct: "more realistic, much better 3D"): sky, walls, the light and the surfaces' shades */
    skyTop: '#6E9CC9',
    skyHaze: '#D8E6EE',
    clayLight: '#C86F45',
    clayDark: '#7E3A1B',
    windscreen: '#1E4A35',
    windscreenTop: '#2C5E45',
    hardLight: '#3F84AD',
    hardDark: '#1F4F6E',
    hardRunoff: '#3C6E58',
    hardRunoffDark: '#264C3C',
    wallBlue: '#16324A',
    grassWorn: '#B79A63',
    hedge: '#1D4026',
    hedgeLight: '#2B5A35',
    nightSky: '#050A1E',
    nightFloor: '#24508A',
    nightFloorDark: '#10284A',
    lamp: '#FFF6D8',
    pole: '#3B4652',
    ceiling: '#2A2620',
    ceilingLight: '#FFF1CF',
    curtain: '#22382D',
    woodLight: '#D8A86A',
    woodDark: '#8E5F2E',
    stands: '#141C33',
    standsLight: '#24304F',
    crowd: ['#E9E4D8', '#C9473B', '#3E6FD8', '#F0C24B', '#7FB5A0'],
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
    // the Baller wardrobe (founder, 17 Oct)
    kit_retro: { shirt: '#F1E6CC', racket: '#7A2E2E' },
    kit_ocean: { shirt: '#147A80', racket: '#BFF0EC' },
    kit_sunset: { shirt: '#E07A3F', racket: '#5B2A86' },
    kit_hard: { shirt: '#3A6EA5', racket: '#F3F5EE' },
  },
  /**
   * Gear the ball people wear (founder, 15 Oct): one at a time, on the head or the eyes. The headband is lime because
   * it is earned (5 in a row); bought gear never uses lime.
   */
  gear: {
    cap: '#F7F7F2',
    capShade: '#D3D8CE',
    visor: '#1B2A6B',
    visorShade: '#101A45',
    lens: '#17211D',
    lensShine: '#5E7A70',
    bandana: '#C8442E',
    bandanaDot: '#F3F5EE',
    bucket: '#C9B48A',
    bucketShade: '#A38D63',
    // the Baller wardrobe (founder, 17 Oct); the crown is lime because it is earned
    phonesBand: '#2F3A36',
    phonesCup: '#E8B04A',
    beanie: '#7A4B9A',
    beanieCuff: '#5E3878',
    beaniePom: '#F3F5EE',
  },
  /** the confetti win effect */
  confetti: ['#D9F03F', '#F3F5EE', '#9DB0FF', '#F2D36B'],
  /**
   * The drawn avatars (founder, 14 Oct: drawn in code like the logo's balls): skin and hair are part of the person,
   * never sold. The outline is ink; the kit colours above dress the shirt.
   */
  avatar: {
    skin: ['#F6D7BF', '#EDC19C', '#D9A27A', '#B97E55', '#8E5A3A', '#5E3B26'],
    hair: {
      black: '#1E1B19',
      brown: '#5A3A24',
      chestnut: '#8A4B26',
      blonde: '#E2B85C',
      auburn: '#A8432A',
      grey: '#B8BDB8',
    },
    /** the empty head of a roster player without an account */
    silhouette: '#33463D',
    /** the cheeks, a touch of warmth */
    blush: '#E98A7A',
  },
} as const;

export const radii = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

/** 4pt scale. */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

/**
 * The type scale (founder, 16 Oct: "super easy to read and hierarchically clear"). Five steps, used everywhere:
 * title (one per screen), heading (a card's main line), body, meta (when, where, category) and label (small caps
 * over a group). Big moments (celebrations, the intro) stay larger on purpose.
 */
export const type = {
  title: { size: 40, line: 40 },
  heading: { size: 26, line: 28 },
  body: { size: 15, line: 21 },
  meta: { size: 13, line: 18 },
  label: { size: 12, line: 16, tracking: 0.6 },
} as const;

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

export const tokens = { colors, cosmetics, radii, spacing, type, motion } as const;

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
