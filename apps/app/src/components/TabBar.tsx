import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { cubicBezier, useReducedMotion, type CSSTransitionProperties } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { usePopIn, usePress } from '../lib/motion';
import { clearSeenResultPushes } from '../lib/push';
import { hasNewResults, useResultsSeen } from '../lib/resultsSeen';
import { useTourTarget } from '../lib/tour';
import type { TourTarget } from '../lib/tourSteps';
import { useUnlocks } from '../lib/unlocks';
import { colors, fonts, springBezier } from '../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * The bottom bar (founder, 14 Oct: "make it as good as possible"). Text tabs only (glyphs, no icons). Each tab is as wide
 * as its label plus an equal share of what is left, so the labels sit evenly whatever their length. The open tab is a
 * paper pill that slides from tab to tab with the spring; a light tick on every change. Εγώ opens from the header.
 * Until the Ladder unlocks it is left out (the route stays). A lime dot on «Αποτελέσματα» while a result newer than your
 * last visit is waiting (lime: something happened); opening the tab clears it.
 */
const IN_BAR = ['index', 'results', 'tournaments', 'ladder'];
const COLOR_MS = 250;
/**
 * The pill slides on the prototype's --spring curve. Pill and label colour are Reanimated CSS transitions on plain
 * style values (20 Oct): React always holds the end state, and nothing rides on a shared value that could be lost.
 */
const PILL_MS = 500;
const SPRING_CSS = cubicBezier(...springBezier);

type Box = { x: number; width: number };

export function TabBar({ state, descriptors, navigation, resultsAt }: TabBarProps & { resultsAt: string | null }) {
  const insets = useSafeAreaInsets();
  const { has } = useUnlocks();
  const results = useResultsSeen();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  // where the pill was last: on a screen outside the bar (a player's profile, Εγώ) it fades there
  const [lastBox, setLastBox] = useState<Box | null>(null);
  // the first placement is drawn in place; only later moves slide
  const [placed, setPlaced] = useState(false);
  const reduced = useReducedMotion();

  const focusedName = state.routes[state.index]?.name ?? '';
  const focusedBox = boxes[focusedName];
  const onResults = focusedName === 'results';
  const { markSeen } = results;
  useEffect(() => {
    if (onResults && resultsAt) markSeen(resultsAt);
    // on «Αποτελέσματα» the day's results are in front of you: their pushes go
    if (onResults) void clearSeenResultPushes();
  }, [onResults, resultsAt, markSeen]);
  const resultsNew = !onResults && hasNewResults(resultsAt, results.seenAt);
  useEffect(() => {
    if (!focusedBox) return undefined;
    setLastBox(focusedBox);
    // one frame after the first placement, so that placement itself does not slide in
    const id = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(id);
  }, [focusedBox]);
  const box = focusedBox ?? lastBox;
  const pill: CSSTransitionProperties & Pick<ViewStyle, 'opacity' | 'left' | 'width'> = {
    opacity: focusedBox ? 1 : 0,
    left: box?.x ?? 0,
    width: box?.width ?? 0,
    transitionProperty: ['left', 'width', 'opacity'],
    // the first placement is drawn in place, and with the system's reduce motion every move is
    transitionDuration: placed && !reduced ? [PILL_MS, PILL_MS, COLOR_MS] : 0,
    transitionTimingFunction: [SPRING_CSS, SPRING_CSS, 'linear'],
  };

  return (
    // the home indicator's strip is part of the bar, but the labels sit just above it, not a thumb's height above
    <View style={[styles.bar, { paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 8, 8) : 10 }]}>
      <View style={styles.row}>
        <Animated.View pointerEvents="none" style={[styles.pill, pill]} />
        {state.routes.map((route, index) => {
          if (!IN_BAR.includes(route.name) || (route.name === 'ladder' && !has('ladder_friends'))) return null;
          const focused = state.index === index;
          const label = String(descriptors[route.key]?.options.title ?? route.name);
          return (
            <TabItem
              key={route.key}
              tourId={`tab:${route.name}` as TourTarget}
              label={label}
              focused={focused}
              dot={route.name === 'results' && resultsNew}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setBoxes((b) => (b[route.name]?.x === x && b[route.name]?.width === width ? b : { ...b, [route.name]: { x, width } }));
              }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => undefined);
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  tourId,
  label,
  focused,
  dot,
  onPress,
  onLayout,
}: {
  /** the first-visit tour points at the tab by this id */
  tourId: TourTarget;
  label: string;
  focused: boolean;
  dot: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const press = usePress();
  const reduced = useReducedMotion();
  const fg = { color: focused ? colors.ink : colors.mist, transitionProperty: 'color', transitionDuration: reduced ? 0 : COLOR_MS } as const;
  const tourRef = useTourTarget(tourId);
  return (
    <Pressable
      ref={tourRef}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onLayout={onLayout}
      style={styles.tab}
    >
      <Animated.View style={[styles.item, press.style]}>
        <Animated.Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.label, fg]}>
          {label}
        </Animated.Text>
        {dot ? <Dot /> : null}
      </Animated.View>
    </Pressable>
  );
}

function Dot() {
  const pop = usePopIn(450);
  return <Animated.View style={[styles.dot, pop]} />;
}

const styles = StyleSheet.create({
  bar: { paddingTop: 6, paddingHorizontal: 8, backgroundColor: colors.ink },
  row: { flexDirection: 'row' },
  // grows from the label's own width, so the space between labels is even
  tab: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, backgroundColor: colors.paper },
  item: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.lime },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18 },
});
