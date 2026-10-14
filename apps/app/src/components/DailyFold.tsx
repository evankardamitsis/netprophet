import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCopy } from '../i18n';
import type { DailyFold as Fold } from '../lib/dailyFold';
import { usePress, useStgIn } from '../lib/motion';
import { colors, ease, fonts, motion } from '../theme';

/**
 * «Για σένα» (founder, 13 Oct): the day's reminders (the game of the day, matches someone logged with you) folded into
 * one row above the feed, so the feed starts with matches. A tap opens it; the cards inside keep their own entrances.
 * Closed on every visit. Ink so it stands out from the white match cards (founder, 13 Oct); the count is paper, not
 * lime: it is waiting, not earned.
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
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.paper },
  count: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  preview: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.mist },
  glyph: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 26, color: colors.paper },
  inside: { gap: 14 },
});

/**
 * «Για σένα» once a day, full screen (founder, 14 Oct: "visible when you open the app every day ... so it doesnt get
 * buried in the feed, if the player closes it we leave it as is now"): the same cards as the fold, on paper, with
 * «Αργότερα» to close. The fold stays on the feed either way.
 */
export function ForYouSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent onRequestClose={onClose}>
      <View style={[sheet.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <StatusBar style="dark" />
        <Text style={sheet.title}>{t.feed.daily.title}</Text>
        <ScrollView contentContainerStyle={sheet.list} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onClose} style={sheet.close}>
          <Text style={sheet.closeText}>{t.feed.daily.later}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, gap: 16 },
  // the tonos of «Για» needs the room iOS would otherwise clip
  title: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 56, paddingTop: 8, color: colors.ink },
  list: { gap: 14, paddingBottom: 12 },
  close: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
});
