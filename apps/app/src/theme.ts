import { Easing } from 'react-native-reanimated';
import { colors, motion, radii, spacing } from '@netprophet/tokens';
import { parseBezier } from './lib/ease';

export { colors, motion, radii, spacing };

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

export const bezier = parseBezier(motion.ease);
export const springBezier = parseBezier(motion.springCurve);

/** The prototype's --ease and --spring as Reanimated easings. */
export const ease = Easing.bezier(...bezier);
export const springEase = Easing.bezier(...springBezier);
