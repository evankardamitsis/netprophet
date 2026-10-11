import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AddMatchButton } from '../../src/components/AddMatchButton';
import { ResultRow } from '../../src/components/ResultRow';
import { useCopy } from '../../src/i18n';
import { useResults } from '../../src/lib/data';
import { colors, ease, fonts } from '../../src/theme';

/**
 * Αποτελέσματα (prototype V2, isRes): the scoreboard of the last two weeks, grouped by day and event.
 * M1 scope: scoreboard, «Ανατροπή» and «Το ’πες». Reactions, kudos, the filter and the sponsored card come later.
 */
const TITLE_IN_MS = 400;
/**
 * The 60px title's line height is below its size; iOS clips the tonos (Αποτελέσματα). Extra top padding,
 * cancelled by a negative margin, keeps it drawn.
 */
const ACCENT_PAD = 10;

export default function ResultsScreen() {
  const t = useCopy();
  const { groups, loading, error, refresh } = useResults();
  const titleIn = useInA();
  let index = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && groups.length > 0} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <View style={styles.list}>
          <Animated.View style={[styles.head, titleIn]}>
            <Text style={styles.title}>{t.results.title}</Text>
            <Text style={styles.subtitle}>{t.results.subtitle}</Text>
          </Animated.View>
          {groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              {g.items.map((item) => (
                <ResultRow key={item.id} item={item} index={index++} />
              ))}
            </View>
          ))}
          {!loading && groups.length === 0 ? <Text style={styles.empty}>{error ? t.results.error : t.results.empty}</Text> : null}
        </View>
      </ScrollView>
      <AddMatchButton />
    </View>
  );
}

/** inA: fade in from 12px below on the prototype ease. */
function useInA() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: TITLE_IN_MS, easing: ease });
  }, [p]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px, 84px at the bottom while «+ Ματς» shows
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 84 },
  list: { gap: 10 },
  head: { gap: 6 },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 60,
    lineHeight: 57,
    color: colors.ink,
    paddingTop: ACCENT_PAD,
    marginTop: -ACCENT_PAD,
  },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  group: { gap: 8 },
  groupTitle: {
    marginTop: 4,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.52,
    color: colors.inkSoft,
  },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
