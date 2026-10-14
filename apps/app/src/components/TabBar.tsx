import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { usePress } from '../lib/motion';
import { useUnlocks } from '../lib/unlocks';
import { colors, fonts, motion } from '../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * The bottom bar (founder, 14 Oct: "make it as good as possible"). Text tabs only (glyphs, no icons). Each tab is as wide
 * as its label plus an equal share of what is left, so the labels sit evenly whatever their length. The open tab is a
 * paper pill that slides from tab to tab with the spring; a light tick on every change. Εγώ opens from the header.
 * Until the Ladder unlocks it is left out (the route stays).
 */
const IN_BAR = ['index', 'results', 'players', 'ladder'];
const COLOR_MS = 250;

type Box = { x: number; width: number };

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { has } = useUnlocks();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillOn = useSharedValue(0);

  const focusedName = state.routes[state.index]?.name ?? '';
  const focusedBox = boxes[focusedName];
  useEffect(() => {
    if (!focusedBox) {
      // a screen outside the bar (a player's profile, Εγώ): the pill fades where it was
      pillOn.value = withTiming(0, { duration: COLOR_MS });
      return;
    }
    const first = pillW.value === 0;
    pillX.value = first ? focusedBox.x : withSpring(focusedBox.x, motion.spring);
    pillW.value = first ? focusedBox.width : withSpring(focusedBox.width, motion.spring);
    pillOn.value = withTiming(1, { duration: COLOR_MS });
  }, [focusedBox, pillX, pillW, pillOn]);

  const pill = useAnimatedStyle(() => ({
    opacity: pillOn.value,
    width: pillW.value,
    transform: [{ translateX: pillX.value }],
  }));

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
              label={label}
              focused={focused}
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
  label,
  focused,
  onPress,
  onLayout,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const press = usePress();
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, { duration: COLOR_MS });
  }, [focused, on]);
  const fg = useAnimatedStyle(() => ({ color: interpolateColor(on.value, [0, 1], [colors.mist, colors.ink]) }));
  return (
    <Pressable
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
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: 6, paddingHorizontal: 8, backgroundColor: colors.ink },
  row: { flexDirection: 'row' },
  // grows from the label's own width, so the space between labels is even
  tab: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, backgroundColor: colors.paper },
  item: { minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18 },
});
