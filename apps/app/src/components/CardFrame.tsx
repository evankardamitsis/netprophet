import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, cosmetics, fonts } from '../theme';

/**
 * The card frame (Εμφάνιση), an overlay drawn in 2D from the prototype's `.frm[data-f]`: rings inset from the edge,
 * stripes, a gradient for the gold one, and «10 · 10» / «7 · 7» down the sides. `k` scales the details (1 on the
 * Εγώ card, about .45 on a thumbnail). It never takes touches. `namePlate` is how the name dresses under each frame.
 */
export const FRAME_KEYS = [
  'frame_week',
  'frame_ten',
  'frame_seven',
  'frame_month_top',
  'frame_friends',
  'frame_level',
  'frame_gold',
  'frame_retro',
  'frame_grass',
  'frame_founding',
] as const;

export function CardFrame({ frame, k = 1, radius = 28, animated = false }: { frame: string | null; k?: number; radius?: number; animated?: boolean }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { w, h } = box;
  const glow = useSharedValue(1);
  const pulse = animated && frame === 'frame_seven';
  useEffect(() => {
    if (!pulse) return;
    glow.value = withRepeat(withSequence(withTiming(0.72, { duration: 1300, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) })), -1);
  }, [pulse, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse ? glow.value : 1 }));
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {frame && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <Svg width={w} height={h}>
            <Layers frame={frame} w={w} h={h} k={k} r={radius} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** a ring `width` thick, `off` in from the edge: the prototype's inset box-shadows */
function Ring({ w, h, off, width, stroke, r, opacity = 1 }: { w: number; h: number; off: number; width: number; stroke: string; r: number; opacity?: number }) {
  return (
    <Rect
      x={off + width / 2}
      y={off + width / 2}
      width={Math.max(0, w - 2 * off - width)}
      height={Math.max(0, h - 2 * off - width)}
      rx={Math.max(0, r - off - width / 2)}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeOpacity={opacity}
    />
  );
}

/** alternating segments along one edge: `first` then `second`, `seg` long, `thick` deep */
function Edge({ side, w, h, seg, thick, first, second }: { side: 'top' | 'bottom' | 'left' | 'right'; w: number; h: number; seg: number; thick: number; first: string; second: string }) {
  const horizontal = side === 'top' || side === 'bottom';
  const len = horizontal ? w : h;
  const count = Math.ceil(len / seg);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const at = horizontal ? i * seg : side === 'left' || side === 'right' ? h - (i + 1) * seg : 0;
        const size = Math.min(seg, len - i * seg);
        return horizontal ? (
          <Rect key={i} x={at} y={side === 'top' ? 0 : h - thick} width={size} height={thick} fill={i % 2 === 0 ? first : second} />
        ) : (
          <Rect key={i} x={side === 'left' ? 0 : w - thick} y={Math.max(0, at)} width={thick} height={size} fill={i % 2 === 0 ? first : second} />
        );
      })}
    </>
  );
}

function SideText({ text, w, h, k, color, size }: { text: string; w: number; h: number; k: number; color: string; size: number }) {
  const top = h * 0.38;
  const room = h * 0.42;
  const unit = size * 2.4;
  const n = Math.max(1, Math.floor(room / unit));
  const line = Array.from({ length: n }, () => text).join(' · ');
  const col = 16 * k;
  return (
    <>
      {[9 * k, w - 9 * k - col - size * 0.7].map((x, i) => (
        <SvgText
          key={i}
          x={x + (col + size * 0.7) / 2}
          y={top}
          transform={`rotate(90 ${x + (col + size * 0.7) / 2} ${top})`}
          fill={color}
          fontFamily={fonts.displayHeavy}
          fontSize={size}
          textAnchor="start"
        >
          {line}
        </SvgText>
      ))}
    </>
  );
}

function Layers({ frame, w, h, k, r }: { frame: string; w: number; h: number; k: number; r: number }): ReactNode {
  const f = cosmetics.frame;
  const ring = (off: number, width: number, stroke: string, opacity = 1) => <Ring w={w} h={h} off={off * k} width={width * k} stroke={stroke} r={r} opacity={opacity} />;
  switch (frame) {
    case 'frame_week': {
      const teeth = Array.from({ length: Math.max(0, Math.ceil((w - 32 * k) / (18 * k))) }, (_, i) => 16 * k + i * 18 * k).filter((x) => x + 4 * k <= w - 16 * k);
      const baseW = 146 * k;
      const base = Array.from({ length: Math.ceil(baseW / (22 * k)) }, (_, i) => (w - baseW) / 2 + i * 22 * k).filter((x) => x + 14 * k <= (w + baseW) / 2 + 0.5);
      return (
        <>
          {ring(0, 4, colors.lime)}
          {ring(4, 2, colors.ink)}
          {teeth.map((x) => (
            <Rect key={`t${x}`} x={x} y={0} width={4 * k} height={11 * k} rx={1.5 * k} fill={colors.lime} />
          ))}
          {base.map((x) => (
            <Rect key={`b${x}`} x={x} y={h - 7 * k} width={14 * k} height={7 * k} fill={colors.lime} />
          ))}
        </>
      );
    }
    case 'frame_ten':
      return (
        <>
          {ring(0, 5, colors.paper)}
          {ring(5, 3, colors.lime)}
          <SideText text="10" w={w} h={h} k={k} color={colors.paper} size={15 * k} />
        </>
      );
    case 'frame_seven':
      return (
        <>
          <Defs>
            <LinearGradient id="np-glow-v" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.lime} stopOpacity={0.5} />
              <Stop offset="0.12" stopColor={colors.lime} stopOpacity={0} />
              <Stop offset="0.88" stopColor={colors.lime} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.lime} stopOpacity={0.5} />
            </LinearGradient>
            <LinearGradient id="np-glow-h" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.lime} stopOpacity={0.5} />
              <Stop offset="0.12" stopColor={colors.lime} stopOpacity={0} />
              <Stop offset="0.88" stopColor={colors.lime} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.lime} stopOpacity={0.5} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} rx={r} fill="url(#np-glow-v)" />
          <Rect x={0} y={0} width={w} height={h} rx={r} fill="url(#np-glow-h)" />
          {ring(0, 4, f.glow)}
          {ring(4, 2, colors.ink)}
          <SideText text="7" w={w} h={h} k={k} color={colors.lime} size={15 * k} />
        </>
      );
    case 'frame_month_top': {
      const id = `np-top-${String(k).replace('.', '_')}`;
      const pod = (left: boolean) => {
        const bw = 11 * k;
        const x0 = left ? 10 * k : w - 10 * k - 37 * k;
        const y1 = h - 10 * k;
        const bars = [
          { dx: 0, ph: 0.56, c: colors.paper },
          { dx: 13 * k, ph: 1, c: colors.lime },
          { dx: 26 * k, ph: 0.38, c: colors.paper },
        ];
        return bars.map((b, i) => {
          const dx = left ? b.dx : 37 * k - b.dx - bw;
          return <Rect key={`${left ? 'l' : 'r'}${i}`} x={x0 + dx} y={y1 - 36 * k * b.ph} width={bw} height={36 * k * b.ph} fill={b.c} />;
        });
      };
      return (
        <>
          <Defs>
            <Pattern id={id} patternUnits="userSpaceOnUse" width={16 * k} height={16 * k} patternTransform="rotate(45)">
              <Rect x={0} y={0} width={8 * k} height={16 * k} fill={colors.lime} />
              <Rect x={8 * k} y={0} width={8 * k} height={16 * k} fill={colors.ink} />
            </Pattern>
          </Defs>
          {ring(0, 7, `url(#${id})`)}
          {ring(7, 2, colors.paper)}
          {pod(true)}
          {pod(false)}
        </>
      );
    }
    case 'frame_friends':
      return (
        <>
          {ring(0, 2, colors.ink)}
          <Edge side="top" w={w} h={h} seg={14 * k} thick={7 * k} first={colors.lime} second={colors.paper} />
          <Edge side="bottom" w={w} h={h} seg={14 * k} thick={7 * k} first={colors.paper} second={colors.lime} />
          <Edge side="left" w={w} h={h} seg={14 * k} thick={7 * k} first={colors.paper} second={colors.lime} />
          <Edge side="right" w={w} h={h} seg={14 * k} thick={7 * k} first={colors.lime} second={colors.paper} />
        </>
      );
    case 'frame_level': {
      const medals = (x: number) => (
        <>
          <Circle cx={x} cy={h * 0.4 + 7 * k} r={6 * k} fill={f.bronze} />
          <Circle cx={x} cy={h * 0.4 + 43 * k} r={6 * k} fill={f.silver} />
          <Circle cx={x} cy={h * 0.4 + 79 * k} r={6 * k} fill={f.gold} />
        </>
      );
      return (
        <>
          {ring(0, 3, colors.ink)}
          {ring(3, 2, colors.lime)}
          {ring(5, 1.5, colors.paper)}
          {medals(11 * k + 7 * k)}
          {medals(w - 11 * k - 7 * k)}
        </>
      );
    }
    case 'frame_gold':
      return (
        <>
          <Defs>
            <LinearGradient id="np-gold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={f.goldDeep} />
              <Stop offset="0.2" stopColor={f.glow} />
              <Stop offset="0.42" stopColor={f.goldShadow} />
              <Stop offset="0.58" stopColor={f.goldLight} />
              <Stop offset="0.8" stopColor={f.goldDark} />
              <Stop offset="1" stopColor={f.gold} />
            </LinearGradient>
          </Defs>
          {ring(0, 8, 'url(#np-gold)')}
          {ring(8, 2, f.goldDeep, 0.9)}
          {ring(10, 14, f.gold, 0.1)}
        </>
      );
    case 'frame_retro':
      return (
        <>
          <Edge side="top" w={w} h={h} seg={8 * k} thick={8 * k} first={f.retroRed} second={f.retroCream} />
          <Edge side="bottom" w={w} h={h} seg={8 * k} thick={8 * k} first={f.retroCream} second={f.retroRed} />
          <Edge side="left" w={w} h={h} seg={8 * k} thick={8 * k} first={f.retroRed} second={f.retroCream} />
          <Edge side="right" w={w} h={h} seg={8 * k} thick={8 * k} first={f.retroCream} second={f.retroRed} />
          {ring(8, 2, colors.ink)}
        </>
      );
    case 'frame_grass':
      return (
        <>
          <Edge side="top" w={w} h={h} seg={12 * k} thick={10 * k} first={f.grassDark} second={f.grassLight} />
          <Edge side="bottom" w={w} h={h} seg={12 * k} thick={10 * k} first={f.grassLight} second={f.grassDark} />
          <Edge side="left" w={w} h={h} seg={12 * k} thick={10 * k} first={f.grassDark} second={f.grassLight} />
          <Edge side="right" w={w} h={h} seg={12 * k} thick={10 * k} first={f.grassLight} second={f.grassDark} />
          {ring(10, 2, colors.white, 0.92)}
        </>
      );
    case 'frame_founding':
      return (
        <>
          {ring(0, 3, colors.lime)}
          {ring(3, 2, colors.ink)}
          {ring(5, 1.5, colors.paper)}
        </>
      );
    default:
      return null;
  }
}

/** how the name dresses under a frame (prototype `.nphero[data-f] .nm`): a plate behind the name, in the frame's colours */
export interface NamePlate {
  box: ViewStyle;
  color: string;
}

export function namePlate(frame: string | null): NamePlate | null {
  const f = cosmetics.frame;
  const pad = { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 } as const;
  switch (frame) {
    case 'frame_week':
      return { box: { ...pad, backgroundColor: colors.lime, borderRadius: 10 }, color: colors.ink };
    case 'frame_ten':
      return { box: { ...pad, backgroundColor: colors.paper, borderRadius: 10, borderWidth: 3, borderColor: colors.lime }, color: colors.ink };
    case 'frame_seven':
      return { box: { ...pad, backgroundColor: colors.ink, borderRadius: 10, borderWidth: 2, borderColor: f.glow }, color: colors.lime };
    case 'frame_month_top':
      return { box: { ...pad, backgroundColor: colors.ink, borderRadius: 4, borderBottomWidth: 5, borderColor: colors.lime }, color: colors.paper };
    case 'frame_friends':
      return { box: { ...pad, backgroundColor: colors.paper, borderRadius: 12, borderWidth: 3, borderColor: colors.lime }, color: colors.ink };
    case 'frame_level':
      return { box: { ...pad, backgroundColor: colors.ink, borderRadius: 999, borderWidth: 2, borderColor: colors.lime }, color: colors.paper };
    case 'frame_gold':
      return { box: { ...pad, backgroundColor: f.goldLight, borderRadius: 10, borderWidth: 2, borderColor: f.goldDeep }, color: f.goldInk };
    case 'frame_retro':
      return { box: { ...pad, backgroundColor: f.retroCream, borderRadius: 0, borderWidth: 3, borderColor: colors.ink }, color: f.retroInk };
    case 'frame_grass':
      return { box: { ...pad, backgroundColor: f.grassPlate, borderRadius: 6, borderWidth: 2, borderColor: colors.paper }, color: colors.paper };
    default:
      return null;
  }
}

