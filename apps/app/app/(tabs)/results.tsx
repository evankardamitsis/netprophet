import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BallerNote } from '../../src/components/BallerNote';
import { ResultRow } from '../../src/components/ResultRow';
import { SafetySheet } from '../../src/components/SafetySheet';
import { Toast } from '../../src/components/Toast';
import { useCopy } from '../../src/i18n';
import { useResults, useResultsTournaments, type SafetyTarget } from '../../src/lib/data';
import { usePress } from '../../src/lib/motion';
import { colors, ease, fonts, text } from '../../src/theme';

/**
 * Αποτελέσματα (prototype V2, isRes): the scoreboard of the last two weeks, grouped by day and event.
 * Scoreboard, «Ανατροπή», «Το ’πες», reactions and «Πες κάτι στον …». On top, quietly (founder, 17 Oct): a name search
 * and the tournaments as chips; a chip loads all of that tournament's results. The sponsored card comes later.
 */
const TITLE_IN_MS = 400;
/** typing settles this long before the search goes out */
const SEARCH_MS = 350;

export default function ResultsScreen() {
  const t = useCopy();
  const [tournament, setTournament] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed), SEARCH_MS);
    return () => clearTimeout(timer);
  }, [typed]);
  const { groups, loading, error, refresh } = useResults({ tournament, query });
  const tournaments = useResultsTournaments();
  const filtered = tournament !== null || query.trim().length >= 2;
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
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder={t.results.search}
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.search}
            accessibilityLabel={t.results.search}
          />
          {tournaments.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsRow}>
              <Chip label={t.results.all} on={tournament === null} onPress={() => setTournament(null)} />
              {tournaments.map((x) => (
                <Chip key={x.id} label={x.name} on={tournament === x.id} onPress={() => setTournament(tournament === x.id ? null : x.id)} />
              ))}
            </ScrollView>
          ) : null}
          {groups.map((g) => (
            <View key={g.key} style={styles.group}>
              {g.firstOfDay ? <Text style={styles.day}>{g.day}</Text> : null}
              <View style={styles.event}>
                <Text style={styles.eventTitle}>{g.title}</Text>
                {g.detail ? <Text style={text.meta}>{g.detail}</Text> : null}
              </View>
              {g.items.map((item) => (
                <ResultRow key={item.id} item={item} index={index++} onLongPress={(id) => setSafety({ kind: 'match', id })} />
              ))}
            </View>
          ))}
          {!loading && groups.length === 0 ? (
            error ? <Text style={styles.empty}>{t.results.error}</Text> : filtered ? <Text style={styles.empty}>{t.results.noneFound}</Text> : <BallerNote line={t.results.empty} />
          ) : null}
        </View>
      </ScrollView>
      {said ? <Toast key={said.n} text={said.text} /> : null}
      <SafetySheet target={safety} onClose={(text) => { setSafety(null); if (text) setSaid({ text, n: Date.now() }); }} />
    </View>
  );
}

/** a quiet chip: an outline, ink when picked (never lime: nothing was earned; never blue: not the screen's action) */
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress(0.95);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.chip, on && styles.chipOn, press.style]}>
        <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
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
  search: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.navLine,
    backgroundColor: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  // the chips run edge to edge under the search
  chipsRow: { marginHorizontal: -20 },
  chips: { gap: 8, paddingHorizontal: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.navLine },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  chipTextOn: { color: colors.paper },
  group: { gap: 8 },
  // the day is the small label; the tournament is the heading of its rows
  day: { ...text.label, marginTop: 10 },
  event: { gap: 2, paddingHorizontal: 4, marginBottom: 2 },
  eventTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
