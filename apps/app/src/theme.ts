import { colors, motion, radii, spacing } from '@netprophet/tokens';
import { parseBezier } from './lib/ease';

export { colors, motion, radii, spacing };

/** Alpha variants of token colours, so nothing outside the tokens is hardcoded. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// TODO(tokens): card surface (white on paper) should live in @netprophet/tokens.
export const cardSurface = '#FFFFFF';

export const fonts = {
  body: 'Commissioner_400Regular',
  bodySemi: 'Commissioner_600SemiBold',
  display: 'SofiaSansExtraCondensed_700Bold',
  displayHeavy: 'SofiaSansExtraCondensed_800ExtraBold',
} as const;

export const bezier = parseBezier(motion.ease);
