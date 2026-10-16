import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ResultRow } from '../../src/components/ResultRow';
import { SafetySheet } from '../../src/components/SafetySheet';
import { Toast } from '../../src/components/Toast';
import { useCopy } from '../../src/i18n';
import { useResults, type SafetyTarget } from '../../src/lib/data';
import { colors, ease, fonts, text } from '../../src/theme';

/**
 * Αποτελέσματα (prototype V2, isRes): the scoreboard of the last two weeks, grouped by day and event.
 * Scoreboard, «Ανατροπή», «Το ’πες», reactions and «Πες κάτι στον …». The filter and the sponsored card come later.
 */
const TITLE_IN_MS = 400;

export default function ResultsScreen() {
  const t = useCopy();
  const { groups, loading, error, refresh } = useResults();
  const titleIn = useInA();
  const [safety, setSafety] = useState<SafetyTarget | null>(null);
  const [said, setSaid] = useState<{ text: string; n: number } | null>(null);
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
                <ResultRow key={item.id} item={item} index={index++} onLongPress={(id) => setSafety({ kind: 'match', id })} />
              ))}
            </View>
          ))}
          {!loading && groups.length === 0 ? <Text style={styles.empty}>{error ? t.results.error : t.results.empty}</Text> : null}
        </View>
      </ScrollView>
      {said ? <Toast key={said.n} text={said.text} /> : null}
      <SafetySheet target={safety} onClose={(text) => { setSafety(null); if (text) setSaid({ text, n: Date.now() }); }} />
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
  title: { ...text.title },
  subtitle: text.subtitle,
  group: { gap: 8 },
  groupTitle: { ...text.label, marginTop: 4 },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
