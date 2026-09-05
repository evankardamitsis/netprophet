// lib/daily/tokens.ts
//
// Every colour, radius and motion value used by the Daily Run prototype lives
// here. Ported from the `:root` block and the inline CSS of the standalone
// prototype. Nothing outside this file may hardcode a hex value.

export const colour = {
    /** page ground, behind the phone-width column */
    void: '#05070C',
    /** the app column itself */
    base: '#0A0E1A',
    ember: '#FF5B3D',
    ember2: '#FF8A4B',
    amber: '#E9B45C',
    chalk: '#F4F2ED',
    dim: '#8792A3',
    good: '#5FCE8B',
    bad: '#FF5B3D',
    /** text sitting on top of an ember CTA */
    onEmber: '#1B0703',
    /** the hard drop shadow under an ember CTA */
    emberShadow: '#A33018',
    /** text on a green CTA, and its shadow */
    onGood: '#062313',
    goodShadow: '#24603F',
    /** the flat ink the procedural portraits are drawn in */
    portraitInk: '#080D12',
    /** text on a filled selection tick */
    onTick: '#170604',
    /** clue text, and the subtitle on a this-or-that card */
    clue: '#CBD5DC',
    ttSub: '#D5DCE2',
    /** surfaces on the player page */
    clay: '#C4763F',
    hard: '#3E7FB8',
    locked: '#7FA662',
    /** the muted label column in the Pro comparison */
    proFree: '#8A97A4',
    navIdle: '#5C6A78',
    /** the settings switch, off and its knob */
    switchTrack: '#243040',
    switchKnob: '#7C8896',
    /** the celebration: the ΠΟΝΤΟΙ caption and the line under the title */
    celeUnit: '#C9B48A',
    celeSub: '#C4CDD5',
    /** text under the foil, and the ink on the "Ξύσε" pill */
    scratchText: '#DDE3EA',
    hintInk: '#0A1014',
    /** the "on the table" line above the risk choice */
    tableText: '#AEBAC4',
    /** the Διπλασίασε button: gold, with its own ink and shadow */
    risk: '#E0A03F',
    riskInk: '#1A1104',
    riskShadow: '#9C6E17',
    halfInk: '#B6E9C9',
    /** body copy inside a feedback sheet */
    sheetText: '#CBD5DC',
    /** disabled CTA */
    mute: '#18202D',
    muteInk: '#3D4859',
    muteShadow: '#101724',
} as const;

/** Translucent surfaces, ported verbatim from the prototype. */
export const surface = {
    card: 'rgba(255,255,255,.045)',
    cardBorder: 'rgba(255,255,255,.10)',
    row: 'rgba(255,255,255,.04)',
    rowBorder: 'rgba(255,255,255,.09)',
    ghost: 'rgba(255,255,255,.06)',
    ghostBorder: 'rgba(255,255,255,.14)',
    track: 'rgba(255,255,255,.12)',
    heroBorder: 'rgba(255,138,75,.36)',
    heroWash: 'linear-gradient(150deg,rgba(255,138,75,.20),rgba(255,91,61,.05))',
    selected: 'rgba(255,138,75,.12)',
    selectedBorder: 'rgba(255,138,75,.65)',
    /** a selected list row sits slightly quieter than a selected tile */
    rowSelected: 'rgba(255,138,75,.10)',
    rowSelectedBorder: 'rgba(255,138,75,.6)',
    tickBorder: 'rgba(255,255,255,.22)',
    stepTrack: 'rgba(255,255,255,.13)',
    inputBg: 'rgba(255,255,255,.05)',
    inputBorder: 'rgba(255,255,255,.11)',
    portraitBorder: 'rgba(255,255,255,.12)',
    /** the feedback sheet, one ground per outcome */
    sheetWin: '#123122',
    sheetWinBorder: 'rgba(95,206,139,.5)',
    sheetLose: '#2E1310',
    sheetLoseBorder: 'rgba(255,91,61,.5)',
    sheetInfo: '#141B2B',
    sheetInfoBorder: 'rgba(255,138,75,.45)',
    /** the Ν / Η chips in a player's last-five form line */
    winChip: 'rgba(95,206,139,.20)',
    lossChip: 'rgba(255,91,61,.16)',
    drop: 'rgba(0,0,0,.35)',
    /** the flatter drop under an option or row button */
    dropSoft: 'rgba(0,0,0,.32)',
    /** the celebration overlay */
    celeGround:
        'radial-gradient(circle at 50% 44%,rgba(255,138,75,.26),rgba(5,7,12,.95) 64%)',
    ringBorder: 'rgba(255,138,75,.6)',
    celeBarTrack: 'rgba(255,255,255,.10)',
    /** the scratch panel: its own face, hint pill and progress track */
    scratchFace: 'rgba(255,255,255,.05)',
    scratchBorder: 'rgba(255,255,255,.12)',
    hintFace: 'rgba(255,255,255,.55)',
    scratchTrack: 'rgba(0,0,0,.3)',
    scratchToneWin: 'rgba(120,220,150,.45)',
    scratchToneLose: 'rgba(255,91,61,.5)',
    switchOn: 'rgba(255,138,75,.45)',
    /** bottom nav, and the blur-lock over Pro-only stats */
    navFace: 'rgba(8,12,20,.9)',
    lockScrim: 'rgba(10,14,26,.55)',
    bonusFace: 'rgba(95,206,139,.08)',
    bonusBorder: 'rgba(95,206,139,.45)',
    resolveFace: 'rgba(233,180,92,.07)',
    resolveBorder: 'rgba(233,180,92,.45)',
    proFace: 'linear-gradient(155deg,rgba(255,138,75,.18),rgba(255,91,61,.05))',
    proBorder: 'rgba(255,138,75,.4)',
    planFace: 'rgba(255,255,255,.05)',
    planBorder: 'rgba(255,255,255,.13)',
    planBest: 'rgba(255,138,75,.16)',
    barTrack: 'rgba(255,255,255,.09)',
    hairline: 'rgba(255,255,255,.08)',
    keepFace: 'rgba(255,255,255,.07)',
    keepBorder: 'rgba(255,255,255,.16)',
    halfFace: 'rgba(95,206,139,.16)',
    halfBorder: 'rgba(95,206,139,.5)',
} as const;

/** The two ambient flares and the vignette that sit behind every screen. */
export const ambience = {
    flare: 'radial-gradient(closest-side,rgba(255,91,61,.40),rgba(255,91,61,0) 72%)',
    flare2: 'radial-gradient(closest-side,rgba(52,86,255,.24),rgba(52,86,255,0) 72%)',
    vignette:
        'radial-gradient(120% 90% at 50% 30%,transparent 40%,rgba(0,0,0,.6) 100%)',
    wordmark:
        'linear-gradient(96deg,#FFF3EC 10%,#FF8A4B 55%,#FF5B3D 95%)',
    ctaEmber: 'linear-gradient(180deg,#FF8A4B,#FF5B3D)',
    ctaGood: 'linear-gradient(180deg,#6BDD97,#42AE72)',
    progress: 'linear-gradient(90deg,#FF5B3D,#FF8A4B)',
    tick: 'linear-gradient(102deg,#FF5B3D,#FF8A4B)',
    /** the big count-up number, and the total bar under it */
    celeNumber: 'linear-gradient(96deg,#FFF6E6 8%,#E9B45C 45%,#FF8A4B 92%)',
    celeBar: 'linear-gradient(90deg,#FF5B3D,#E9B45C)',
    /** the crowd-share wash that fills a poll option */
    optionFill: 'linear-gradient(90deg,rgba(255,138,75,.28),rgba(255,138,75,.04))',
    ctaRisk: 'linear-gradient(180deg,#F5C879,#E0A03F)',
} as const;

/**
 * The foil itself. Five stops brushed across the panel, and the flake colours
 * the dust is drawn in. Kept apart from the palette because these are a
 * material, not a role.
 */
export const foil = {
    stops: ['#2A3A4A', '#4E6A79', '#7794A2', '#3D5462', '#25333F'],
    flakes: ['#7E9EA9', '#5E838F', '#96B4BE', '#41626D', '#B7CDD4'],
} as const;

/** Confetti colours for the celebration burst. */
export const confetti = [
    '#FF5B3D', '#FF8A4B', '#E9B45C', '#FFE9B8', '#F4F2ED', '#5FCE8B',
] as const;

/** The two ray weights that make up the spinning starburst. */
export const rays = {
    thick: '#E9B45C',
    thin: '#FF8A4B',
} as const;

export const radius = {
    sm: '11px',
    md: '15px',
    lg: '18px',
    xl: '22px',
    '2xl': '24px',
    pill: '99px',
} as const;

export const motion = {
    /** state changes on tappable surfaces */
    tap: '.16s',
    /** bottom sheet in and out */
    sheet: '.34s',
    /** crowd-split bars filling */
    reveal: '.85s',
    /** screen enter */
    enter: '.3s',
    easeOut: 'cubic-bezier(.2,.8,.2,1)',
    easeSheet: 'cubic-bezier(.2,.9,.25,1)',
    easePop: 'cubic-bezier(.2,1.5,.4,1)',
} as const;

export const layout = {
    /** the prototype is a single phone-width column, centred */
    maxWidth: '440px',
} as const;

/**
 * The tokens as CSS custom properties. The prototype layout spreads these onto
 * its root element so children can reference `var(--np-ember)` and friends
 * instead of repeating literals.
 */
export const cssVars: Record<string, string> = {
    '--np-void': colour.void,
    '--np-base': colour.base,
    '--np-ember': colour.ember,
    '--np-ember2': colour.ember2,
    '--np-amber': colour.amber,
    '--np-chalk': colour.chalk,
    '--np-dim': colour.dim,
    '--np-good': colour.good,
    '--np-bad': colour.bad,
    '--np-on-ember': colour.onEmber,
    '--np-ember-shadow': colour.emberShadow,
    '--np-mute': colour.mute,
    '--np-mute-ink': colour.muteInk,
    '--np-mute-shadow': colour.muteShadow,
    '--np-card': surface.card,
    '--np-card-border': surface.cardBorder,
    '--np-hero-border': surface.heroBorder,
    '--np-hero-wash': surface.heroWash,
    '--np-cta-ember': ambience.ctaEmber,
    '--np-radius-lg': radius.lg,
    '--np-radius-2xl': radius['2xl'],
    '--np-radius-pill': radius.pill,
    '--np-motion-tap': motion.tap,
    '--np-max-width': layout.maxWidth,
};
