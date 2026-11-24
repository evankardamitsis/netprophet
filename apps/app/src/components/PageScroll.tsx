import { forwardRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { layout } from '@netprophet/tokens';
import { usePageColumn } from '../lib/layout';

/**
 * A page's scroll view (tablet board, 24 Nov 2026): on a phone exactly a ScrollView; from 600 wide its content keeps
 * to a centred column of `max` (the 720 reading width by default, 560 for a focused page) instead of stretching across
 * the screen.
 */
export const PageScroll = forwardRef<ScrollView, ScrollViewProps & { max?: number; focus?: boolean }>(function PageScroll(
  { max, focus = false, contentContainerStyle, ...rest },
  ref,
) {
  const col = usePageColumn(max ?? (focus ? layout.focus : undefined));
  return <ScrollView ref={ref} {...rest} contentContainerStyle={[contentContainerStyle, col.style]} />;
});
