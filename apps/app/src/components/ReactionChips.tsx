import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { Reactions } from '@netprophet/db';
import { applyReaction } from '../lib/kudos';
import { useReact } from '../lib/data';
import { colors, ease, fonts, springEase } from '../theme';

/** prototype .rc: the pick turns lime and jpops, the other chip folds away (450ms on the spring) */
const POP_MS = 450;
const FOLD_MS = 300;

/**
 * The two reactions under a result (prototype V2 .rc): white chips with an ink border and a lime ring, or lime
 * outlines on the dark upset card. One pick per person; a second tap takes it back.
 */
export function ReactionChips({ matchId, initial, dark }: { matchId: string; initial: Reactions; dark: boolean }) {
  const [r, setR] = useState(initial);
  const react = useReact();
  const tap = async (key: string) => {
    const next = applyReaction(r, key);
    setR(next);
    const server = await react(matchId, next.mine);
    if (server) setR(server);
  };
  return (
    <View style={styles.row}>
      {r.options.map((o) => (
        <Chip
          key={o.key}
          label={o.label}
          n={r.counts[o.key] ?? 0}
          on={r.mine === o.key}
          out={r.mine !== null && r.mine !== o.key}
          dark={dark}
          onPress={() => tap(o.key)}
        />
      ))}
    </View>
  );
}

function Chip({ label, n, on, out, dark, onPress }: { label: string; n: number; on: boolean; out: boolean; dark: boolean; onPress: () => void }) {
  const pop = useSharedValue(1);
  const fold = useSharedValue(out ? 0 : 1);
  const [gone, setGone] = useState(out);
  useEffect(() => {
    if (on) pop.value = withSequence(withTiming(1.12, { duration: POP_MS * 0.4, easing: springEase }), withTiming(1, { duration: POP_MS * 0.6, easing: springEase }));
  }, [on, pop]);
  useEffect(() => {
    if (out) {
      fold.value = withTiming(0, { duration: FOLD_MS, easing: ease });
      const id = setTimeout(() => setGone(true), FOLD_MS);
      return () => clearTimeout(id);
    }
    setGone(false);
    fold.value = withTiming(1, { duration: FOLD_MS, easing: ease });
    return undefined;
  }, [out, fold]);
  const style = useAnimatedStyle(() => ({ opacity: fold.value, transform: [{ scale: pop.value * (0.4 + 0.6 * fold.value) }] }));
  if (gone) return null;
  const bg = on ? colors.lime : dark ? 'transparent' : colors.white;
  const fg = on ? colors.ink : dark ? colors.paper : colors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={styles.hit}>
      <Animated.View style={[styles.ring, (dark || on) && styles.noRing, style]}>
        <View style={[styles.chip, { backgroundColor: bg, borderColor: on || dark ? colors.lime : colors.ink }]}>
          <Text style={[styles.label, { color: fg }]}>{on ? `✓ ${label}` : label}</Text>
          <Text style={[styles.n, { color: fg }]}>{n}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 6, marginTop: 2, minHeight: 36 },
  // 44pt to tap around the 32pt chip and its ring; the negative margin keeps the rows where they were
  hit: { minHeight: 44, marginVertical: -6, justifyContent: 'center' },
  // box-shadow 0 0 0 2px lime
  ring: { borderRadius: 999, borderWidth: 2, borderColor: colors.lime },
  noRing: { borderColor: 'transparent' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14 },
  n: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, minWidth: 7 },
});
