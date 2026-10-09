import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCopy } from '../i18n';
import type { CardResult } from '../lib/feed';
import { useHud } from '../lib/hud';
import { runPop, usePopIn, usePress } from '../lib/motion';
import { colors, ease, fonts, motion } from '../theme';

/**
 * A result back at the top of the feed (prototype «rq» card and rqApply):
 * right call  ink card pops in; «+10» and «+1» fly to the header at 350ms; the header applies at 1080ms
 * wrong call  lighter card shakes; the header applies at 250ms (σερί falls, or frosts when a freeze saved it)
 * `delay` holds the whole sequence back (the first card of a batch waits 450ms, the next ones 0).
 */
const FLY_AT = 350;
const APPLY_OK_AT = 1080;
const APPLY_WRONG_AT = 250;
const CARD_MS = 700;
const GLYPH_MS = 800;
const GLYPH_DELAY = 150;
const WIN_DELAY = 200;
const PILL_MS = 700;
const PILL_DELAY = 450;

interface Props {
  card: CardResult;
  /** «Επόμενο ›» when more results are waiting, «Εντάξει» on the last one */
  more: boolean;
  delay: number;
  onDone: (card: CardResult) => void;
}

export function ResultCard({ card, more, delay, onDone }: Props) {
  const t = useCopy();
  const hud = useHud();
  const self = useRef<View>(null);
  const press = usePress();

  // entrance: pop (right) or rvshake (wrong)
  const scale = useSharedValue(card.ok ? 0.4 : 1);
  const opacity = useSharedValue(card.ok ? 0 : 1);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (card.ok) runPop(scale, opacity, CARD_MS);
    else {
      const s = (v: number, f: number) => withTiming(v, { duration: CARD_MS * f, easing: ease });
      shake.value = withSequence(s(-9, 0.18), s(8, 0.2), s(-5, 0.2), s(3, 0.2), s(0, 0.22));
    }
  }, [card.ok, scale, opacity, shake]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  // the header's moment
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (card.ok) {
      timers.push(setTimeout(() => hud.fly(self, card.points, true), delay + FLY_AT));
      timers.push(setTimeout(() => apply(), delay + APPLY_OK_AT));
    } else {
      timers.push(setTimeout(() => apply(), delay + APPLY_WRONG_AT));
    }
    function apply() {
      hud.apply(card);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          card.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
        ).catch(() => undefined);
      }
    }
    return () => timers.forEach(clearTimeout);
    // the sequence runs once per card
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const glyph = usePopIn(GLYPH_MS, GLYPH_DELAY);
  const pill = usePopIn(PILL_MS, PILL_DELAY);
  const win = useMeIn(WIN_DELAY);

  return (
    <Animated.View
      ref={self}
      collapsable={false}
      style={[styles.card, { backgroundColor: card.ok ? colors.ink : colors.inkRaised }, cardStyle]}
    >
      <View style={styles.top}>
        <Animated.Text style={[styles.glyph, { color: card.ok ? colors.lime : colors.mist }, glyph]}>
          {card.ok ? '✓' : '↓'}
        </Animated.Text>
        <View style={[styles.chip, { backgroundColor: card.ok ? colors.lime : colors.paper }]}>
          <Text style={styles.chipText}>{card.ok ? t.result.correct : t.result.wrong}</Text>
        </View>
      </View>
      <Animated.View style={[styles.winner, win]}>
        <Text style={styles.winSurname} numberOfLines={1}>
          {card.winnerSurname}
        </Text>
        <Text style={styles.winFirst}>{card.winnerFirst}</Text>
      </Animated.View>
      {card.line ? <Text style={styles.line}>{card.line}</Text> : null}
      {card.sets ? <Text style={styles.sets}>{card.sets}</Text> : null}
      {card.pill ? (
        <Animated.View style={[styles.pill, pill]}>
          <Text style={styles.pillText}>{card.pill}</Text>
        </Animated.View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => onDone(card)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.btnHit}
      >
        <Animated.Text style={[styles.btn, press.style]}>{more ? t.result.next : t.result.done}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/** meIn: rise 16px and fade in over the short reveal (560ms) after `delay`. */
function useMeIn(delay: number) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: motion.revealDurShort, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [p, delay]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 16 }] }));
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 24, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 45, minWidth: 36 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  winner: { gap: 2 },
  winSurname: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 38, color: colors.paper },
  winFirst: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18, color: colors.mist },
  line: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.mist },
  sets: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mist },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.lime },
  btnHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2 },
  btn: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
});
