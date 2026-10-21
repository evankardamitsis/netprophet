import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCopy } from '../i18n';
import { useMyBaller } from '../lib/data';
import { cardTap } from '../lib/resultsSummary';
import { Baller, type BallerHandle } from './Baller';
import { resultStrip, type CardResult } from '../lib/feed';
import { useHudActions } from '../lib/hud';
import { useFadeUpIn, usePopIn, usePress } from '../lib/motion';
import { colors, ease, fonts, motion } from '../theme';

/**
 * A result back at the top of the feed (prototype «rq» card and rqApply):
 * right call  ink card pops in; «+10» and «+1» fly to the header at 350ms; the header applies at 1080ms
 * wrong call  lighter card shakes; the header applies at 250ms (σερί falls, or frosts when a freeze saved it)
 * Your Baller is on the card (founder, 17 Oct): it jumps with your win effect when you called it, sighs when not.
 * `delay` holds the whole sequence back (the first card of a batch waits 450ms, the next ones 0).
 * Once played it leaves (ResultsDeck plays its exit) and nothing of it stays on Σήμερα (founder, 21 Oct): the day's
 * results live on «Αποτελέσματα».
 * The ✓ and the «+10 · σερί 2» pill are its only lime (founder, 19 Oct: no «Το 'πες!» chip).
 * It comes compact (founder, 19 Oct: the first vote shows on the first screen): ✓, the winner on up to 2 lines, the
 * score, the pill and a small «Επόμενο ›», about a third of the full card. A tap opens the full card in place, height
 * and opacity on the reveal (700ms), with your Baller; a tap on the open card goes to the next result, and once one card was opened every next one enters open. The header moment plays once either way.
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
/** your Baller in the card's corner */
const BALLER = 92;

interface Props {
  card: CardResult;
  /** «Επόμενο ›» when more results are waiting, «Εντάξει» on the last one */
  more: boolean;
  delay: number;
  onDone: (card: CardResult) => void;
  /** its points and σερί reached the header */
  onApplied?: (card: CardResult) => void;
  /** leaving (or taken with the rest): a moment not played yet stays unplayed, so nothing flies twice */
  stop?: boolean;
  /** the deck already has a full card open this run: this one enters full too (founder, 21 Oct) */
  startFull?: boolean;
  /** the full view opened on this card by a tap */
  onOpened?: () => void;
}

export function ResultCard({ card, more, delay, onDone, onApplied, stop = false, startFull = false, onOpened }: Props) {
  const t = useCopy();
  const hud = useHudActions();
  const self = useRef<View>(null);
  const press = usePress();
  const me = useMyBaller();
  const baller = useRef<BallerHandle>(null);

  // entrance: pop (right, a CSS animation like every mount entrance) or rvshake (wrong); only one applies
  const pop = usePopIn(CARD_MS);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (card.ok) return;
    const s = (v: number, f: number) => withTiming(v, { duration: CARD_MS * f, easing: ease });
    shake.value = withSequence(s(-9, 0.18), s(8, 0.2), s(-5, 0.2), s(3, 0.2), s(0, 0.22));
  }, [card.ok, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const cardStyle = card.ok ? pop : shakeStyle;

  // the header's moment
  const stopped = useRef(stop);
  stopped.current = stop;
  const appliedNow = useRef(onApplied);
  appliedNow.current = onApplied;
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => baller.current?.play(card.ok ? 'jump' : 'sigh'), delay + (card.ok ? FLY_AT : APPLY_WRONG_AT)));
    if (card.ok) {
      timers.push(setTimeout(() => !stopped.current && hud.fly(self, card.points, true), delay + FLY_AT));
      timers.push(setTimeout(() => apply(), delay + APPLY_OK_AT));
    } else {
      timers.push(setTimeout(() => apply(), delay + APPLY_WRONG_AT));
    }
    function apply() {
      if (stopped.current) return;
      hud.apply(card);
      appliedNow.current?.(card);
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
  // meIn: rise 16px and fade in over the short reveal (560ms)
  const win = useFadeUpIn(motion.revealDurShort, WIN_DELAY, 16);

  // compact first; a tap opens it in place
  const [full, setFull] = useState(startFull);
  // a card that enters full has no opening to play: the header moment already plays its Baller
  const opened = useRef(startFull);
  // the box follows the content's height on the reveal; -1 until the first layout (no animation on mount)
  const height = useSharedValue(-1);
  const shown = useSharedValue(1);
  // the first layout is remembered on the JS side: reading a shared value from JS is a synchronous call into the UI
  // runtime, and doing it inside onLayout could deadlock the two threads (the app froze on launch, 20 Oct)
  const measured = useRef(false);
  const onContent = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (!measured.current) {
      measured.current = true;
      height.value = h;
    } else height.value = withTiming(h, { duration: motion.revealDur, easing: ease });
  };
  const boxStyle = useAnimatedStyle(() => (height.value < 0 ? {} : { height: height.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const tap = () => {
    // open first; a tap on the open card goes to the next result, like «Επόμενο ›»
    if (cardTap(full) === 'next') {
      if (!stop) onDone(card);
      return;
    }
    shown.value = 0;
    shown.value = withTiming(1, { duration: motion.revealDur, easing: ease });
    setFull(true);
    onOpened?.();
  };
  // your Baller plays its moment when the full card first opens from a compact one
  useEffect(() => {
    if (!full || opened.current) return undefined;
    opened.current = true;
    const id = setTimeout(() => baller.current?.play(card.ok ? 'jump' : 'sigh'), WIN_DELAY);
    return () => clearTimeout(id);
  }, [full, card.ok]);

  const button = (small: boolean) => (
    <Pressable
      accessibilityRole="button"
      disabled={stop}
      onPress={() => onDone(card)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={small ? styles.cBtnHit : styles.btnHit}
    >
      <Animated.Text style={[styles.btn, press.style]}>{more ? t.result.next : t.result.done}</Animated.Text>
    </Pressable>
  );
  const strip = resultStrip(card, t);

  return (
    <Animated.View
      ref={self}
      collapsable={false}
      style={[styles.box, { backgroundColor: card.ok ? colors.ink : colors.inkRaised }, cardStyle, boxStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: full }}
        accessibilityLabel={[strip.tick ? '✓' : '', strip.name, card.sets, card.pill ?? ''].filter(Boolean).join(' · ')}
        onPress={tap}
      >
        <Animated.View onLayout={onContent} style={contentStyle}>
          {full ? (
            <View style={styles.card}>
              {me.look ? (
                <View style={styles.baller} pointerEvents="box-none">
                  <Baller ref={baller} look={me.look} size={BALLER} kit={me.kit} gear={me.gear} effect={card.ok ? me.effect : null} pokeable />
                </View>
              ) : null}
              <View style={styles.top}>
                <Animated.Text style={[styles.glyph, { color: card.ok ? colors.lime : colors.mist }, glyph]}>
                  {card.ok ? '✓' : '↓'}
                </Animated.Text>
                {card.ok ? null : (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{t.result.wrong}</Text>
                  </View>
                )}
              </View>
              <Animated.View style={[styles.winner, win]}>
                {/* doubles: two surnames wrap to a second line instead of being cut */}
                <Text style={styles.winSurname} numberOfLines={2}>
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
              {button(false)}
            </View>
          ) : (
            <View style={styles.compact}>
              <View style={styles.cTop}>
                <Animated.Text style={[styles.cGlyph, { color: card.ok ? colors.lime : colors.mist }, glyph]}>
                  {card.ok ? '✓' : '↓'}
                </Animated.Text>
                <Animated.View style={[styles.cNames, win]}>
                  <Text style={[styles.cName, !card.ok && styles.cNameMiss]} numberOfLines={2}>
                    {strip.name}
                  </Text>
                  {card.sets ? <Text style={styles.sets}>{card.sets}</Text> : null}
                </Animated.View>
              </View>
              <View style={styles.cFoot}>
                {card.pill ? (
                  <Animated.View style={[styles.pill, styles.cPill, pill]}>
                    <Text style={styles.pillText}>{card.pill}</Text>
                  </Animated.View>
                ) : null}
                {button(true)}
              </View>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 24, overflow: 'hidden' },
  card: { padding: 18, gap: 8 },
  baller: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 56, paddingBottom: 11, marginBottom: -22, minWidth: 36 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.paper },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  winner: { gap: 2, paddingRight: BALLER - 10 },
  winSurname: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 40, paddingBottom: 8, marginBottom: -10, color: colors.paper },
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
  // compact (founder, 19 Oct): about 110pt with one line of names, 135pt with two, against about 310 to 350pt full
  compact: { paddingTop: 14, paddingBottom: 6, paddingHorizontal: 16, gap: 6 },
  cTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cGlyph: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 30, minWidth: 22 },
  cNames: { flex: 1, minWidth: 0, gap: 2 },
  cName: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 24, paddingBottom: 4, marginBottom: -4, color: colors.paper },
  cNameMiss: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22 },
  cFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 32 },
  cPill: { paddingVertical: 2, paddingHorizontal: 12 },
  cBtnHit: { minHeight: 40, marginLeft: 'auto', justifyContent: 'center', paddingHorizontal: 2 },
});
