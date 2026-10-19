import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { runJpop, usePress } from '../lib/motion';
import { colors, fonts, springEase } from '../theme';

/**
 * The prototype's onboarding controls: the blue primary button (dimmed until ready), «‹ Πίσω»,
 * the segmented control with a sliding ink pill (.jseg), choice chips with a ✓ (.jc) and
 * the dashed secondary button.
 */

export function Primary({ label, onPress, ready = true, busy = false, tall = false }: { label: string; onPress: () => void; ready?: boolean; busy?: boolean; tall?: boolean }) {
  const press = usePress();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !ready || busy }}
      onPress={() => ready && !busy && onPress()}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[styles.primary, tall && styles.primaryTall, { opacity: ready ? 1 : 0.45 }, press.style]}>
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.primaryText, tall && styles.primaryTallText]}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

export function Back({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.backHit}>
      <Animated.Text style={[styles.back, press.style]}>{label}</Animated.Text>
    </Pressable>
  );
}

export function Dashed({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.dashed, press.style]}>
        <Text style={styles.dashedText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const PILL_MS = 380;

/** .jseg: equal options, the chosen one sits on an ink pill that slides (and stretches) between them */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  bg = colors.white,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  /** the track's colour; paper inside a white card */
  bg?: string;
}) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const shown = useSharedValue(0);
  const stretch = useSharedValue(1);
  const index = value === null ? -1 : options.findIndex((o) => o.id === value);
  const cell = w > 0 ? (w - 10 - 6 * (options.length - 1)) / options.length : 0;
  const first = useRef(true);

  useEffect(() => {
    if (index < 0 || cell === 0) return;
    const to = index * (cell + 6);
    if (shown.value === 0) {
      x.value = to;
      shown.value = withTiming(1, { duration: PILL_MS, easing: springEase });
    } else {
      x.value = withTiming(to, { duration: PILL_MS, easing: Easing.bezier(0.3, 0.7, 0.4, 1) });
      stretch.value = withSequence(
        withTiming(1.22, { duration: PILL_MS * 0.4 }),
        withTiming(0.97, { duration: PILL_MS * 0.35 }),
        withTiming(1, { duration: PILL_MS * 0.25 }),
      );
    }
    first.current = false;
  }, [index, cell, x, shown, stretch]);

  const pill = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: x.value }, { scale: 0.7 + 0.3 * shown.value }, { scaleX: stretch.value }],
  }));

  return (
    <View style={[styles.seg, { backgroundColor: bg }]} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {cell > 0 ? <Animated.View pointerEvents="none" style={[styles.segPill, { width: cell }, pill]} /> : null}
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={styles.segItem}
          >
            <Text style={[styles.segText, { color: on ? colors.paper : colors.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** .jc: a white chip that turns ink with a paper ✓ when chosen, settling with a small bounce */
export function Chip({
  on,
  onPress,
  children,
  minHeight = 50,
  center = true,
  bg = colors.white,
}: {
  on: boolean;
  onPress: () => void;
  children: ReactNode;
  minHeight?: number;
  center?: boolean;
  /** the chip's colour when not chosen; paper inside a white card */
  bg?: string;
}) {
  const settle = useSharedValue(1);
  const fill = useSharedValue(on ? 1 : 0);
  const mounted = useRef(false);
  useEffect(() => {
    fill.value = withTiming(on ? 1 : 0, { duration: 420, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    if (mounted.current && on) {
      settle.value = withSequence(
        withTiming(0.97, { duration: 1 }),
        withTiming(1.04, { duration: 234, easing: springEase }),
        withTiming(1, { duration: 286, easing: springEase }),
      );
    }
    mounted.current = true;
  }, [on, fill, settle]);
  const box = useAnimatedStyle(() => ({ transform: [{ scale: settle.value }] }));
  const ink = useAnimatedStyle(() => ({ opacity: fill.value }));
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={[styles.chip, { minHeight, alignItems: center ? 'center' : 'flex-start', backgroundColor: bg }, box]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.chipInk, ink]} />
        {on ? <Text style={styles.chipTick}>✓</Text> : null}
        <ChipText on={on}>{children}</ChipText>
      </Animated.View>
    </Pressable>
  );
}

function ChipText({ on, children }: { on: boolean; children: ReactNode }) {
  return <View style={styles.chipContent}>{typeof children === 'string' ? <Text style={[styles.chipText, { color: on ? colors.paper : colors.ink }]}>{children}</Text> : children}</View>;
}

/** a row in «Ποια είναι η παρέα σου;»: name, sub-line and a + / ✓ circle that jpops when chosen */
export function KnownRow({ name, sub, on, onPress, last }: { name: string; sub: string; on: boolean; onPress: () => void; last: boolean }) {
  const jpop = useSharedValue(1);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current && on) runJpop(jpop, 500);
    mounted.current = true;
  }, [on, jpop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: jpop.value }] }));
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={name} onPress={onPress}>
      <Animated.View style={[styles.kn, !last && styles.knLine, style]}>
        <View style={styles.knText}>
          <Text style={styles.knName} numberOfLines={1}>
            {name}
          </Text>
          {sub ? (
            <Text style={styles.knSub} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
        <View style={[styles.knMark, { backgroundColor: on ? colors.ink : 'transparent' }]}>
          <Text style={[styles.knGlyph, on && { color: colors.paper }]}>{on ? '✓' : '+'}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: { minHeight: 56, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white, textAlign: 'center' },
  /** the intro slides' button, a touch bigger */
  primaryTall: { minHeight: 58 },
  primaryTallText: { fontSize: 18 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  dashed: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.fog,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dashedText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  seg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18, backgroundColor: colors.white },
  segPill: { position: 'absolute', top: 5, bottom: 5, left: 5, borderRadius: 14, backgroundColor: colors.ink },
  segItem: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  chip: { borderRadius: 16, backgroundColor: colors.white, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, overflow: 'hidden' },
  chipInk: { backgroundColor: colors.ink },
  chipTick: { position: 'absolute', top: 6, right: 10, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.paper },
  chipContent: { gap: 2 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' },
  kn: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
  knLine: { borderBottomWidth: 1, borderBottomColor: colors.navLine },
  knText: { flex: 1, minWidth: 0 },
  knName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  knSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  knMark: { width: 30, height: 30, borderRadius: 999, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  knGlyph: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 18, color: colors.ink },
});
