import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { cubicBezier, useReducedMotion, type CSSTransitionProperties } from 'react-native-reanimated';
import { useCopy } from '../i18n';
import { usePopIn, usePress } from '../lib/motion';
import { measureView, useTour, useTourRegistry } from '../lib/tour';
import { feedTarget, placeTooltip, spotlight, targetOf, type Rect, type TourStepId } from '../lib/tourSteps';
import { fmt } from '../lib/votes';
import { alpha, bezier, colors, fonts, motion, springBezier, type } from '../theme';

/**
 * The first-visit tour over Σήμερα (founder, 20 Oct): the screen dims to ink, a cut-out lights the place being told
 * about (the first vote card, each tab, the avatar), and an ink card says what it is in a title and one line, with
 * «Επόμενο ›», «1 από 5» and a quiet «Παράλειψη». The last step's «Πάμε να ψηφίσουμε» is the screen's one blue.
 *
 * The cut-out is one view with a border as wide as the screen in the scrim colour, so its hole has round corners; it
 * slides from place to place on Reanimated CSS transitions (plain style values, nothing on a shared value). With the
 * system's reduce motion nothing moves: the hole jumps, the card only fades.
 */
const SCRIM = 0.78;
/** wider than any screen, so the border covers everything around the hole */
const B = 3000;
const PAD = 8;
const FEED_RADIUS = 24;
const GAP = 14;
const MARGIN = 16;
/** a first guess at the card's height, until it is laid out */
const CARD_H = 200;
const EASE_CSS = cubicBezier(...bezier);
const SPRING_CSS = cubicBezier(...springBezier);

const FADE = { from: { opacity: 0 }, to: { opacity: 1 } };
const FADE_UP = { from: { opacity: 0, transform: [{ translateY: 12 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };

/** fade in (and rise 12px unless the system asks for less motion: then only the fade) */
function useFadeIn(durationMs: number, delayMs = 0) {
  const reduced = useReducedMotion();
  return useMemo(
    () => ({
      animationName: reduced ? FADE : FADE_UP,
      animationDuration: durationMs,
      animationDelay: delayMs,
      animationFillMode: 'backwards' as const,
      animationTimingFunction: EASE_CSS,
    }),
    [reduced, durationMs, delayMs],
  );
}

export function TourOverlay() {
  const tour = useTour();
  if (!tour.active || !tour.step) return null;
  return <TourLayer step={tour.step} />;
}

function TourLayer({ step }: { step: TourStepId }) {
  const t = useCopy();
  const tour = useTour();
  const { measure } = useTourRegistry();
  const reduced = useReducedMotion();
  const dims = useWindowDimensions();
  const root = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** the cut-out in the overlay's own coordinates; null: nothing to light (the card sits in the middle) */
  const [hole, setHole] = useState<Rect | null>(null);
  const [measured, setMeasured] = useState(false);
  // the first placement is drawn in place; later steps slide
  const [placed, setPlaced] = useState(false);
  const [cardH, setCardH] = useState(CARD_H);

  // measure where the step points, in the window, then into the overlay (on the web the app is a centred column)
  useEffect(() => {
    let live = true;
    let raf = 0;
    const run = async () => {
      const origin = await measureView(root);
      const ox = origin?.x ?? 0;
      const oy = origin?.y ?? 0;
      const w = origin?.width ?? dims.width;
      const h = origin?.height ?? dims.height;
      const local = (r: Rect | null): Rect | null => r && { x: r.x - ox, y: r.y - oy, width: r.width, height: r.height };
      let target: Rect | null;
      let bounds = { top: 0, bottom: h, left: 0, right: w };
      if (step === 'feed') {
        const [card, head, avatar, tab] = await Promise.all([measure('feedCard'), measure('feedHead'), measure('avatar'), measure('tab:results')]).then((rs) => rs.map(local));
        // between the header and the tab bar: a tall card is cut where the bar starts
        bounds = { ...bounds, top: avatar ? avatar.y + avatar.height + PAD : 0, bottom: tab ? tab.y - PAD / 2 : h };
        target = feedTarget(card ?? null, head ?? null, bounds);
      } else {
        target = local(await measure(targetOf(step)));
      }
      if (!live) return;
      setHole(target ? spotlight(target, step === 'feed' ? PAD : PAD / 2, bounds) : null);
      setMeasured(true);
    };
    // two frames: Σήμερα's scroll to the top has landed
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => void run());
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [step, measure, dims.width, dims.height]);

  useEffect(() => {
    if (!measured || placed) return undefined;
    const id = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(id);
  }, [measured, placed]);

  const copy = t.tour.steps[step];
  const counter = fmt(t.tour.counter, { n: tour.index + 1, total: tour.total });
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${counter}. ${copy.title}. ${copy.line}`);
  }, [counter, copy]);

  // Android's back skips the tour rather than leaving the app under it
  const { skip } = tour;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      skip();
      return true;
    });
    return () => sub.remove();
  }, [skip]);

  const fadeIn = useFadeIn(motion.revealDurShort);
  const radius = hole ? (step === 'feed' ? FEED_RADIUS : hole.height / 2) : 0;
  const slide = placed && !reduced ? motion.revealDur : 0;
  const holeStyle: CSSTransitionProperties & { left: number; top: number; width: number; height: number; borderRadius: number } = {
    left: (hole?.x ?? size.width / 2) - B,
    top: (hole?.y ?? size.height / 2) - B,
    width: (hole?.width ?? 0) + 2 * B,
    height: (hole?.height ?? 0) + 2 * B,
    borderRadius: radius + B,
    transitionProperty: ['left', 'top', 'width', 'height'],
    transitionDuration: slide,
    transitionTimingFunction: SPRING_CSS,
  };
  const cardTop = hole ? placeTooltip(hole, size.height, cardH, GAP, MARGIN) : Math.max(MARGIN, (size.height - cardH) / 2);

  return (
    <Animated.View
      ref={root}
      accessibilityViewIsModal
      accessibilityLabel={t.tour.label}
      // every touch outside the card stays with the tour
      onStartShouldSetResponder={() => true}
      onLayout={(e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      style={[StyleSheet.absoluteFill, styles.root, fadeIn]}
    >
      <Animated.View pointerEvents="none" style={[styles.hole, holeStyle]}>
        {hole ? <Ring key={step} radius={radius} /> : null}
      </Animated.View>
      <View style={[styles.cardWrap, { top: cardTop }]} pointerEvents="box-none">
        {measured ? <Card key={step} step={step} counter={counter} onHeight={setCardH} /> : null}
      </View>
    </Animated.View>
  );
}

/** a paper ring round the hole that pops in at each step */
function Ring({ radius }: { radius: number }) {
  const pop = usePopIn(motion.revealDurShort);
  return <Animated.View style={[StyleSheet.absoluteFill, styles.ring, { borderRadius: radius }, pop]} />;
}

function Card({ step, counter, onHeight }: { step: TourStepId; counter: string; onHeight: (h: number) => void }) {
  const t = useCopy();
  const tour = useTour();
  const copy = t.tour.steps[step];
  const rise = useFadeIn(motion.revealDurShort, motion.stagger);
  const press = usePress();
  const skipPress = usePress(0.97);
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      onLayout={(e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height)}
      style={[styles.card, rise]}
    >
      <View style={styles.counterRow}>
        <View style={styles.dots}>
          {Array.from({ length: tour.total }, (_, i) => (
            <View key={i} style={[styles.dot, i === tour.index && styles.dotOn]} />
          ))}
        </View>
        <Text style={styles.counter}>{counter}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {copy.title}
      </Text>
      <Text style={styles.line}>{copy.line}</Text>
      <View style={styles.actions}>
        {tour.last ? (
          <View />
        ) : (
          <Pressable accessibilityRole="button" onPress={tour.skip} onPressIn={skipPress.onPressIn} onPressOut={skipPress.onPressOut} style={styles.skipHit}>
            <Animated.Text style={[styles.skip, skipPress.style]}>{t.tour.skip}</Animated.Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            tour.next();
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
        >
          <Animated.View style={[styles.button, tour.last && styles.buttonGo, press.style]}>
            <Text style={[styles.buttonText, tour.last && styles.buttonGoText]}>{tour.last ? t.tour.go : t.tour.next}</Text>
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 50, overflow: 'hidden' },
  hole: { position: 'absolute', borderWidth: B, borderColor: alpha(colors.ink, SCRIM) },
  ring: { borderWidth: 2, borderColor: colors.paper },
  cardWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: MARGIN, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 18,
    gap: 8,
    borderRadius: 24,
    backgroundColor: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.inkLine },
  dotOn: { width: 16, backgroundColor: colors.paper },
  counter: { fontFamily: fonts.bodyBold, fontSize: type.meta.size, lineHeight: type.meta.line, color: colors.mist },
  title: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingTop: 6, marginTop: -2, paddingBottom: 6, marginBottom: -6, color: colors.paper },
  line: { fontFamily: fonts.body, fontSize: type.body.size, lineHeight: type.body.line, color: colors.mist },
  actions: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  skipHit: { minHeight: 44, justifyContent: 'center', paddingRight: 8 },
  skip: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.mist },
  button: { minHeight: 44, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  // the last step: the screen's one blue
  buttonGo: { backgroundColor: colors.blue },
  buttonGoText: { color: colors.paper },
});
