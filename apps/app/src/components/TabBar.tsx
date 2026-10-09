import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { usePress } from '../lib/motion';
import { colors, fonts } from '../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Tabs in the bar and their column weights (prototype: 1fr 1.5fr 1fr 1.2fr). Εγώ opens from the header avatar. */
const WEIGHTS: Record<string, number> = { index: 1, results: 1.5, players: 1, ladder: 1.2 };
const COLOR_MS = 350;

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const weight = WEIGHTS[route.name];
        if (weight === undefined) return null;
        const focused = state.index === index;
        const label = String(descriptors[route.key]?.options.title ?? route.name);
        return (
          <TabItem
            key={route.key}
            label={label}
            weight={weight}
            focused={focused}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </Animated.View>
  );
}

function TabItem({ label, weight, focused, onPress }: { label: string; weight: number; focused: boolean; onPress: () => void }) {
  const press = usePress();
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, { duration: COLOR_MS });
  }, [focused, on]);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], ['rgba(15,32,25,0)', colors.ink]),
  }));
  const fg = useAnimatedStyle(() => ({ color: interpolateColor(on.value, [0, 1], [colors.ink, colors.paper]) }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={{ flex: weight }}
    >
      <Animated.View style={[styles.item, bg, press.style]}>
        <Animated.Text numberOfLines={1} style={[styles.label, fg]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.navLine,
  },
  item: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
