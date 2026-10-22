import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  cubicBezier,
  useReducedMotion,
  type CSSTransitionProperties,
} from "react-native-reanimated";
import { useCopy } from "../i18n";
import { usePopIn, usePress } from "../lib/motion";
import { measureView, useTour, useTourRegistry } from "../lib/tour";
import {
  placeTooltip,
  scrollsHome,
  spotlight,
  targetOf,
  type Rect,
  type TourStepId,
} from "../lib/tourSteps";
import { fmt } from "../lib/votes";
import {
  alpha,
  bezier,
  colors,
  fonts,
  motion,
  springBezier,
  type,
} from "../theme";

/**
 * The first-visit tour over Σήμερα (founder, 20 Oct): the screen dims to ink, a cut-out lights the place being told
 * about (the first vote row, the σερί, the first tournament, three tabs), and an ink card says what it is in a title
 * and one line, with «Επόμενο ›», «1 από 6» and a quiet «Παράλειψη». The last step's «Πάμε» is the screen's one blue.
 *
 * The cut-out is one view with a border as wide as the screen in the scrim colour, so its hole has round corners; it
 * slides from place to place on Reanimated CSS transitions (plain style values, nothing on a shared value). With the
 * system's reduce motion nothing moves: the hole jumps, the card only fades.
 *
 * Between steps the card glides with the cut-out (same spring) and only its words change: the title, then the line,
 * fade up a stagger apart, and the active dot stretches to the new place. Leaving (skip or the last step) fades the
 * whole layer out before the tour ends, so Σήμερα comes back softly instead of in one frame.
 */
const SCRIM = 0.78;
/**
 * The border reaches this many screen sizes out from the hole, so it covers everything around it even mid-slide
 * (the spring overshoots). Sized from the screen, not a fixed huge number: iOS does not draw a layer past its
 * texture limit (a 3000pt border at 3x left the scrim blank on an iPhone).
 */
const REACH = 1.25;
const PAD = 8;
/** a vote row or a tournament card is lit with round corners; the header and the tabs are pills */
const CARD_RADIUS = 22;
const GAP = 14;
const MARGIN = 16;
/** a first guess at the card's height, until it is laid out */
const CARD_H = 200;
const EASE_CSS = cubicBezier(...bezier);
const SPRING_CSS = cubicBezier(...springBezier);
/** the layer's fade out when the tour ends */
const EXIT = motion.revealDurShort / 2;

const FADE = { from: { opacity: 0 }, to: { opacity: 1 } };
const FADE_UP = {
  from: { opacity: 0, transform: [{ translateY: 12 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

/** one frame, so a scroll has landed before the place is measured */
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** fade in (and rise 12px unless the system asks for less motion: then only the fade) */
function useFadeIn(durationMs: number, delayMs = 0) {
  const reduced = useReducedMotion();
  return useMemo(
    () => ({
      animationName: reduced ? FADE : FADE_UP,
      animationDuration: durationMs,
      animationDelay: delayMs,
      animationFillMode: "backwards" as const,
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
  const { measure, reveal } = useTourRegistry();
  const reduced = useReducedMotion();
  const dims = useWindowDimensions();
  const root = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** the cut-out in the overlay's own coordinates; null: nothing to light (the card sits in the middle) */
  const [hole, setHole] = useState<Rect | null>(null);
  /** the step the cut-out stands on now: the card changes with it, not before the new place is measured */
  const [shown, setShown] = useState<TourStepId | null>(null);
  const measured = shown !== null;
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
      const local = (r: Rect | null): Rect | null =>
        r && { x: r.x - ox, y: r.y - oy, width: r.width, height: r.height };
      let bounds = { top: 0, bottom: h, left: 0, right: w };
      if (scrollsHome(step)) {
        // a place on Σήμερα's list: between the header and the tab bar, scrolled into view first
        await reveal(targetOf(step));
        await frame();
        const [head, tab] = await Promise.all([measure("stats"), measure("tab:results")]).then((rs) => rs.map(local));
        bounds = {
          ...bounds,
          top: head ? head.y + head.height + PAD : 0,
          bottom: tab ? tab.y - PAD / 2 : h,
        };
      }
      const target = local(await measure(targetOf(step)));
      if (!live) return;
      setHole(target ? spotlight(target, PAD / 2, bounds) : null);
      setShown(step);
    };
    // two frames: Σήμερα's scroll to the top has landed
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => void run());
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [step, measure, reveal, dims.width, dims.height]);

  useEffect(() => {
    if (!measured || placed) return undefined;
    const id = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(id);
  }, [measured, placed]);

  // the tour ends after the layer has faded out (at once with reduce motion)
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );
  const leave = useCallback(
    (end: () => void) => {
      if (exitTimer.current) return;
      if (reduced) {
        end();
        return;
      }
      setLeaving(true);
      exitTimer.current = setTimeout(end, EXIT);
    },
    [reduced],
  );
  const { skip, next } = tour;
  const onSkip = useCallback(() => leave(skip), [leave, skip]);
  const onNext = useCallback(
    (last: boolean) => {
      if (last) leave(next);
      else next();
    },
    [leave, next],
  );

  // Android's back skips the tour rather than leaving the app under it
  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onSkip();
      return true;
    });
    return () => sub.remove();
  }, [onSkip]);

  const fadeIn = useFadeIn(motion.revealDurShort);
  const radius = hole ? Math.min(hole.height / 2, shown && scrollsHome(shown) ? CARD_RADIUS : hole.height) : 0;
  const slide = placed && !reduced ? motion.revealDur : 0;
  const B = Math.ceil(
    Math.max(size.width, size.height, dims.width, dims.height) * REACH,
  );
  const holeStyle: CSSTransitionProperties & {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: number;
    borderWidth: number;
  } = {
    borderWidth: B,
    left: (hole?.x ?? size.width / 2) - B,
    top: (hole?.y ?? size.height / 2) - B,
    width: (hole?.width ?? 0) + 2 * B,
    height: (hole?.height ?? 0) + 2 * B,
    borderRadius: radius + B,
    transitionProperty: ["left", "top", "width", "height", "borderRadius"],
    transitionDuration: slide,
    transitionTimingFunction: SPRING_CSS,
  };
  const cardTop = hole
    ? placeTooltip(hole, size.height, cardH, GAP, MARGIN)
    : Math.max(MARGIN, (size.height - cardH) / 2);
  // the card glides with the cut-out once it has been placed
  const cardStyle: CSSTransitionProperties & { top: number } = {
    top: cardTop,
    transitionProperty: "top",
    transitionDuration: slide,
    transitionTimingFunction: SPRING_CSS,
  };
  const exitStyle: CSSTransitionProperties & { opacity: number } = {
    opacity: leaving ? 0 : 1,
    transitionProperty: "opacity",
    transitionDuration: EXIT,
    transitionTimingFunction: EASE_CSS,
  };

  return (
    <Animated.View
      ref={root}
      accessibilityViewIsModal
      accessibilityLabel={t.tour.label}
      // every touch outside the card stays with the tour
      onStartShouldSetResponder={() => true}
      onLayout={(e: LayoutChangeEvent) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
      style={[StyleSheet.absoluteFill, styles.root, fadeIn]}
    >
      <Animated.View
        pointerEvents={leaving ? "none" : "box-none"}
        style={[StyleSheet.absoluteFill, exitStyle]}
      >
        {/* the cut-out is clipped in a layer of its own: its border reaches far past the screen, and on the web a
          clipping parent of the card would scroll that overflow when a button takes focus */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.clip]}
        >
          <Animated.View style={[styles.hole, holeStyle]}>
            {hole ? <Ring key={shown ?? step} radius={radius} /> : null}
          </Animated.View>
        </View>
        <Animated.View
          style={[styles.cardWrap, cardStyle]}
          pointerEvents="box-none"
        >
          {shown ? (
            <Card
              step={shown}
              onHeight={setCardH}
              onNext={onNext}
              onSkip={onSkip}
            />
          ) : null}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** a paper ring round the hole that pops in at each step */
function Ring({ radius }: { radius: number }) {
  const pop = usePopIn(motion.revealDurShort);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.ring,
        { borderRadius: radius },
        pop,
      ]}
    />
  );
}

function Card({
  step,
  onHeight,
  onNext,
  onSkip,
}: {
  step: TourStepId;
  onHeight: (h: number) => void;
  onNext: (last: boolean) => void;
  onSkip: () => void;
}) {
  const t = useCopy();
  const tour = useTour();
  const copy = t.tour.steps[step];
  // the card's own step, so the count and the button never run ahead of the cut-out
  const index = Math.max(0, tour.steps.indexOf(step));
  const total = tour.steps.length;
  const last = index === total - 1;
  const counter = fmt(t.tour.counter, { n: index + 1, total });
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `${counter}. ${copy.title}. ${copy.line}`,
    );
  }, [counter, copy]);
  const rise = useFadeIn(motion.revealDurShort, motion.stagger);
  const dotMove: CSSTransitionProperties = {
    transitionProperty: ["width", "backgroundColor"],
    transitionDuration: motion.revealDurShort,
    transitionTimingFunction: SPRING_CSS,
  };
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
          {Array.from({ length: total }, (_, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, i === index && styles.dotOn, dotMove]}
            />
          ))}
        </View>
        <Text style={styles.counter}>{counter}</Text>
      </View>
      <Words key={step} title={copy.title} line={copy.line} />
      <View style={styles.actions}>
        {last ? (
          <View />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onSkip}
            onPressIn={skipPress.onPressIn}
            onPressOut={skipPress.onPressOut}
            style={styles.skipHit}
          >
            <Animated.Text style={[styles.skip, skipPress.style]}>
              {t.tour.skip}
            </Animated.Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            onNext(last);
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
        >
          <Animated.View
            style={[styles.button, last && styles.buttonGo, press.style]}
          >
            <Text style={[styles.buttonText, last && styles.buttonGoText]}>
              {last ? t.tour.go : t.tour.next}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** the step's title and line: on each step they fade up again, the line a stagger after the title */
function Words({ title, line }: { title: string; line: string }) {
  const titleIn = useFadeIn(motion.revealDurShort, motion.stagger);
  const lineIn = useFadeIn(motion.revealDurShort, motion.stagger * 2);
  return (
    <>
      <Animated.Text accessibilityRole="header" style={[styles.title, titleIn]}>
        {title}
      </Animated.Text>
      <Animated.Text style={[styles.line, lineIn]}>{line}</Animated.Text>
    </>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 50 },
  clip: { overflow: "hidden" },
  hole: { position: "absolute", borderColor: alpha(colors.ink, SCRIM) },
  ring: { borderWidth: 2, borderColor: colors.paper },
  cardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: MARGIN,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 18,
    gap: 8,
    borderRadius: 24,
    backgroundColor: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.inkLine,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.inkLine,
  },
  dotOn: { width: 16, backgroundColor: colors.paper },
  counter: {
    fontFamily: fonts.bodyBold,
    fontSize: type.meta.size,
    lineHeight: type.meta.line,
    color: colors.mist,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 26,
    lineHeight: 28,
    paddingTop: 6,
    marginTop: -2,
    paddingBottom: 6,
    marginBottom: -6,
    color: colors.paper,
  },
  line: {
    fontFamily: fonts.body,
    fontSize: type.body.size,
    lineHeight: type.body.line,
    color: colors.mist,
  },
  actions: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  skipHit: { minHeight: 44, justifyContent: "center", paddingRight: 8 },
  skip: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.mist },
  button: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  // the last step: the screen's one blue
  buttonGo: { backgroundColor: colors.blue },
  buttonGoText: { color: colors.paper },
});
