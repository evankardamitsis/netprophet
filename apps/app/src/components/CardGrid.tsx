import { Children, isValidElement, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { columnsFor, useLayout } from '../lib/layout';

/**
 * Cards two or three to a row (tablet board, 24 Nov 2026): from 600 wide as many cards of at least `min` as fit the
 * room it is given, up to `max`; on a phone one under the other, as before.
 */
export function CardGrid({ min, gap = 8, max = 3, children }: { min: number; gap?: number; max?: number; children: ReactNode }) {
  const { kind } = useLayout();
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(isValidElement);
  if (kind === 'phone') return <View style={{ gap }}>{items}</View>;
  const cols = columnsFor(width, min, gap, max);
  const cell = width > 0 ? (width - (cols - 1) * gap) / cols : undefined;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {items.map((child, i) => (
        <View key={child.key ?? i} style={{ width: cell ?? '100%' }}>
          {child}
        </View>
      ))}
    </View>
  );
}
