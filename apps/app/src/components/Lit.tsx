import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The rendered look (founder, 14 Oct: "these type of balls should be used inside the app too… similar style for all
 * cosmetics and avatars"): the same light as the logo's ball, from the top left, and a darker rim at the bottom right,
 * laid over any round or rounded shape so a flat colour reads as an object. Put it last inside a shape that clips
 * (`overflow: 'hidden'`); it never takes touches. `strength` scales both (1 for balls and avatars, less for big areas).
 */
export function Lit({ radius = 999, strength = 1 }: { radius?: number; strength?: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { w, h } = box;
  const r = Math.min(radius, w / 2, h / 2);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 ? (
        <Svg width={w} height={h}>
          <Defs>
            <RadialGradient id="np-lit-light" cx="34%" cy="28%" r="62%">
              <Stop offset="0" stopColor={colors.white} stopOpacity={0.5 * strength} />
              <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="np-lit-rim" cx="40%" cy="36%" r="74%">
              <Stop offset="0.62" stopColor={colors.ink} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.ink} stopOpacity={0.42 * strength} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} rx={r} fill="url(#np-lit-rim)" />
          <Rect x={0} y={0} width={w} height={h} rx={r} fill="url(#np-lit-light)" />
        </Svg>
      ) : null}
    </View>
  );
}
