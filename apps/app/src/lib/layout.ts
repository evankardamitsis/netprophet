import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { layout as steps } from '@netprophet/tokens';
import { columnsFor, layoutFor, type Layout } from './layoutRules';

export { columnsFor, layoutFor, type Layout, type LayoutKind } from './layoutRules';

/** the layout for the window right now; it follows rotation, split view and a resized browser */
export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  return useMemo(() => layoutFor(width), [width]);
}

/**
 * A page's column (tablet board 24 Nov, all A): on a phone the page as before; from `tablet` the content keeps to a
 * centred column of `max` (the reading width by default) with the step's side padding. Spread into a scroll view's
 * contentContainerStyle or a page's outer view.
 */
export function usePageColumn(max: number = steps.measure): { style: ViewStyle; width: number; layout: Layout } {
  const l = useLayout();
  return useMemo(() => {
    if (l.kind === 'phone') return { style: {}, width: l.content, layout: l };
    const width = Math.min(max, l.content - 2 * l.gutter);
    return { style: { width: '100%', maxWidth: max + 2 * l.gutter, alignSelf: 'center', paddingHorizontal: l.gutter }, width, layout: l };
  }, [l, max]);
}

/** how many cards of at least `min` sit in a row of the page's column */
export function useColumns(min: number, available?: number, max = 3): number {
  const l = useLayout();
  const room = available ?? l.content - 2 * l.gutter;
  return l.kind === 'phone' ? 1 : columnsFor(room, min, 12, max);
}
