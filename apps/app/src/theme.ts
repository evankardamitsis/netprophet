import { StyleSheet } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { colors, cosmetics, motion, radii, spacing, type } from '@netprophet/tokens';
import { parseBezier } from './lib/ease';

export { colors, cosmetics, motion, radii, spacing, type };

/**
 * Alpha variants of token colours, so nothing outside the tokens is hardcoded.
 * A worklet: animated styles call it on the UI thread (a plain function there aborts the app on iOS).
 */
export function alpha(hex: string, a: number): string {
  'worklet';
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const cardSurface = colors.white;

/** Commissioner for text, Sofia Sans Extra Condensed for names, numbers and titles (prototype V2). */
export const fonts = {
  body: 'Commissioner_400Regular',
  bodyMedium: 'Commissioner_500Medium',
  bodySemi: 'Commissioner_600SemiBold',
  bodyBold: 'Commissioner_700Bold',
  display: 'SofiaSansExtraCondensed_700Bold',
  displayHeavy: 'SofiaSansExtraCondensed_800ExtraBold',
} as const;

/** room above Sofia Sans' accents and below its descenders, so tight line heights never clip «ή» or «ς» */
const TITLE_PAD = 8;

/**
 * The five text steps from the tokens as ready styles. Spread one and add only colour or alignment:
 * `title: { ...text.title, color: colors.paper }`.
 */
export const text = StyleSheet.create({
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: type.title.size,
    lineHeight: type.title.line,
    paddingTop: TITLE_PAD,
    marginTop: -TITLE_PAD,
    paddingBottom: TITLE_PAD,
    marginBottom: -TITLE_PAD,
    color: colors.ink,
  },
  /** the one line under a title: what this screen is for */
  subtitle: { fontFamily: fonts.bodySemi, fontSize: type.body.size, lineHeight: type.body.line, color: colors.inkSoft },
  heading: {
    fontFamily: fonts.displayHeavy,
    fontSize: type.heading.size,
    lineHeight: type.heading.line,
    paddingTop: 6,
    marginTop: -6,
    paddingBottom: 6,
    marginBottom: -6,
    color: colors.ink,
  },
  body: { fontFamily: fonts.body, fontSize: type.body.size, lineHeight: type.body.line, color: colors.ink },
  meta: { fontFamily: fonts.bodySemi, fontSize: type.meta.size, lineHeight: type.meta.line, color: colors.inkSoft },
  /** small caps over a group: write the text with greekCaps() */
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: type.label.size,
    lineHeight: type.label.line,
    letterSpacing: type.label.tracking,
    color: colors.inkSoft,
  },
});

export const bezier = parseBezier(motion.ease);
export const springBezier = parseBezier(motion.springCurve);

/** The prototype's --ease and --spring as Reanimated easings. */
export const ease = Easing.bezier(...bezier);
export const springEase = Easing.bezier(...springBezier);
