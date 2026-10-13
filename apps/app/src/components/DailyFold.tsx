import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCopy } from '../i18n';
import type { DailyFold as Fold } from '../lib/dailyFold';
import { usePress, useStgIn } from '../lib/motion';
import { cardSurface, colors, ease, fonts, motion } from '../theme';

/**
 * «Για σένα» (founder, 13 Oct): the day's reminders (the game of the day, matches someone logged with you) folded into
 * one row above the feed, so the feed starts with matches. A tap opens it; the cards inside keep their own entrances.
 * Closed on every visit. The count is ink, not lime: it is waiting, not earned.
 */
export function DailyFold({ fold, children }: { fold: Fold; children: ReactNode }) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  const press = usePress();
  const enter = useStgIn(400);
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, { duration: motion.revealDurShort, easing: ease });
  }, [open, turn]);
  const glyph = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));
  if (!fold.show) return null;
  return (
    <Animated.View style={[styles.wrap, enter]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t.feed.daily.title}. ${fold.preview}`}
        accessibilityHint={open ? t.feed.daily.close : t.feed.daily.open}
        onPress={() => setOpen((o) => !o)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[styles.row, press.style]}>
          <View style={styles.text}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t.feed.daily.title}</Text>
              {fold.count > 0 ? (
                <View style={styles.count}>
                  <Text style={styles.countText}>{fold.count}</Text>
                </View>
              ) : null}
            </View>
            {!open ? (
              <Text style={styles.preview} numberOfLines={2}>
                {fold.preview}
              </Text>
            ) : null}
          </View>
          <Animated.Text style={[styles.glyph, glyph]}>↓</Animated.Text>
        </Animated.View>
      </Pressable>
      {open ? <View style={styles.inside}>{children}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  row: {
    minHeight: 64,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: cardSurface,
    borderWidth: 1,
    borderColor: colors.mist,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.ink },
  count: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.paper },
  preview: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  glyph: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 26, color: colors.ink },
  inside: { gap: 14 },
});
