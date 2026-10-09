import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { greekCaps } from '@netprophet/copy';
import { alpha, colors, fonts, motion, spacing } from '../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Glyph-free bottom nav: text labels, an ink bar marks the current tab. */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing[2] }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = String(descriptors[route.key]?.options.title ?? route.name);
        return (
          <TabItem
            key={route.key}
            label={label}
            focused={focused}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

function TabItem({ label, focused, onPress }: { label: string; focused: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.92, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={styles.item}
    >
      <Animated.View style={[styles.inner, style]}>
        <Text numberOfLines={1} style={[styles.label, focused && styles.labelOn]}>
          {greekCaps(label)}
        </Text>
        <View style={[styles.dot, focused && styles.dotOn]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: alpha(colors.ink, 0.1),
    paddingTop: spacing[2],
  },
  item: { flex: 1, alignItems: 'center' },
  inner: { alignItems: 'center', paddingVertical: spacing[1], gap: 4 },
  label: { fontFamily: fonts.bodySemi, fontSize: 9, letterSpacing: 0.2, color: colors.muted },
  labelOn: { color: colors.ink },
  dot: { width: 16, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.ink },
});
