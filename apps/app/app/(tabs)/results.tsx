import { Fragment, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { BallerNote } from '../../src/components/BallerNote';
import { Logo } from '../../src/components/Logo';
import { ProLine } from '../../src/components/ProEntries';
import { ResultRow } from '../../src/components/ResultRow';
import { SafetySheet } from '../../src/components/SafetySheet';
import { Toast } from '../../src/components/Toast';
import { useCopy } from '../../src/i18n';
import { useResults, useResultsTournaments, type SafetyTarget } from '../../src/lib/data';
import { useTabScrollTop } from '../../src/lib/scrollTop';
import { useFadeUpIn, usePress } from '../../src/lib/motion';
import { bezier, colors, fonts, motion, text, type } from '../../src/theme';

/**
 * Αποτελέσματα (prototype V2, isRes): the scoreboard of the last two weeks, grouped by day and event.
 * Scoreboard, «Ανατροπή», «Το ’πες», reactions and «Πες κάτι στον …». On top, quietly (founder, 17 Oct): a name search
 * and the tournaments as chips; a chip loads all of that tournament's results. The sponsored card comes later.
 * The search stays at the top while the results scroll (founder, 20 Oct); title and subtitle scroll away. The chips are
 * hidden behind a quiet «Τουρνουά ↓» beside the search; a chip picks and folds the row, and the toggle then names it.
 */
const TITLE_IN_MS = 400;
/** the chips row: 44pt targets plus the gap under the search */
const CHIPS_H = 50;
const EASE_CSS = cubicBezier(...bezier);
/** typing settles this long before the search goes out */
const SEARCH_MS = 350;

export default function ResultsScreen() {
  // a tap on the open tab (or two) scrolls back to the top
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollTop(scrollRef);
  const t = useCopy();
  // a reaction push opens Αποτελέσματα on the match's tournament (?tournament=)
  const params = useLocalSearchParams<{ tournament?: string }>();
  const [tournament, setTournament] = useState<string | null>(typeof params.tournament === 'string' ? params.tournament : null);
  // the chips start folded, also when a push picks the tournament: the toggle then shows its name
  const [chipsOpen, setChipsOpen] = useState(false);
  useEffect(() => {
    if (typeof params.tournament === 'string' && params.tournament) {
      setTournament(params.tournament);
      setChipsOpen(false);
    }
  }, [params.tournament]);
  const pick = (id: string | null) => {
    setTournament(id);
    setChipsOpen(false);
  };
  // the bar is stuck once the title has scrolled away: a hairline appears under it
  const barY = useRef(0);
  const [stuck, setStuck] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = e.nativeEvent.contentOffset.y > barY.current;
    if (now !== stuck) setStuck(now);
  };
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed), SEARCH_MS);
    return () => clearTimeout(timer);
  }, [typed]);
  const { groups, loading, error, refresh } = useResults({ tournament, query });
  const tournaments = useResultsTournaments();
  const filtered = tournament !== null || query.trim().length >= 2;
  const picked = tournament !== null ? tournaments.find((x) => x.id === tournament)?.name ?? null : null;
  const toggleLabel = `${picked ?? t.results.tournaments} ${chipsOpen ? '↑' : '↓'}`;
  const ms = reduced ? 0 : motion.revealDurShort;
  const titleIn = useFadeUpIn(TITLE_IN_MS);
  const [safety, setSafety] = useState<SafetyTarget | null>(null);
  const [said, setSaid] = useState<{ text: string; n: number } | null>(null);
  // the first result of a match you played yourself carries the one quiet Pro line (non-Pro only, once a day)
  const firstMine = groups.flatMap((g) => g.items).find((x) => x.mine)?.id ?? null;
  let index = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loading && groups.length > 0} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Animated.View style={[styles.head, titleIn]}>
          <Text style={styles.title}>{t.results.title}</Text>
          <Text style={styles.subtitle}>{t.results.subtitle}</Text>
        </Animated.View>
        <Animated.View
          onLayout={(e) => { barY.current = e.nativeEvent.layout.y; }}
          style={[styles.bar, { borderBottomColor: stuck ? colors.navLine : colors.paper, transitionProperty: 'borderBottomColor', transitionDuration: ms }]}
        >
          <View style={styles.searchRow}>
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
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: chipsOpen }}
                accessibilityLabel={picked ?? t.results.tournaments}
                onPress={() => setChipsOpen((o) => !o)}
                style={styles.toggle}
                hitSlop={4}
              >
                <Text style={[styles.toggleText, picked !== null && styles.toggleTextOn]} numberOfLines={1}>
                  {toggleLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {tournaments.length > 0 ? (
            <Animated.View
              pointerEvents={chipsOpen ? 'auto' : 'none'}
              accessibilityElementsHidden={!chipsOpen}
              importantForAccessibility={chipsOpen ? 'auto' : 'no-hide-descendants'}
              style={[
                styles.chipsWrap,
                {
                  height: chipsOpen ? CHIPS_H : 0,
                  opacity: chipsOpen ? 1 : 0,
                  transitionProperty: ['height', 'opacity'],
                  transitionDuration: ms,
                  transitionTimingFunction: EASE_CSS,
                },
              ]}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips} style={styles.chipsRow}>
                <Chip label={t.results.all} on={tournament === null} onPress={() => pick(null)} />
                {tournaments.map((x) => (
                  <Chip key={x.id} label={x.name} logo={x.logo ?? null} on={tournament === x.id} onPress={() => pick(tournament === x.id ? null : x.id)} />
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}
        </Animated.View>
        <View style={styles.list}>
          {groups.map((g) => (
            <View key={g.key} style={styles.group}>
              {g.firstOfDay ? <Text style={styles.day}>{g.day}</Text> : null}
              <View style={styles.event}>
                <View style={styles.eventHead}>
                  {g.logo ? <Logo path={g.logo.path} name={g.title} size={24} /> : null}
                  <Text style={styles.eventTitle}>{g.title}</Text>
                </View>
                {g.category || g.detail ? (
                  <View style={styles.eventSub}>
                    {g.category ? <Text style={styles.eventCategory}>{g.category}</Text> : null}
                    {g.detail ? <Text style={[text.meta, styles.eventDetail]}>{g.detail}</Text> : null}
                  </View>
                ) : null}
              </View>
              {g.items.map((item) => (
                <Fragment key={item.id}>
                  <ResultRow item={item} index={index++} onLongPress={(id) => setSafety({ kind: 'match', id })} />
                  {item.id === firstMine ? <ProLine moment="result" label={t.pro.entries.result} /> : null}
                </Fragment>
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
function Chip({ label, logo, on, onPress }: { label: string; logo?: string | null; on: boolean; onPress: () => void }) {
  const press = usePress(0.95);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.chipHit}>
      <Animated.View style={[styles.chip, on && styles.chipOn, logo !== undefined && styles.chipWithLogo, press.style]}>
        {logo !== undefined ? <Logo path={logo} name={label} size={18} onInk={on} /> : null}
        <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px, 84px at the bottom while «+ Ματς» shows; each block carries the side padding so the
  // stuck bar's paper runs edge to edge
  scroll: { paddingTop: 18, paddingBottom: 84 },
  list: { gap: 10, paddingHorizontal: 20, paddingTop: 4 },
  head: { gap: 6, paddingHorizontal: 20, paddingBottom: 4 },
  // stuck at the top: paper under it, a hairline once the title has gone
  bar: { paddingHorizontal: 20, paddingVertical: 6, backgroundColor: colors.paper, borderBottomWidth: StyleSheet.hairlineWidth },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // a quiet text toggle: ink when a tournament is picked, inkSoft otherwise (not blue, not lime)
  toggle: { minHeight: 44, maxWidth: '45%', justifyContent: 'center', paddingHorizontal: 4 },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.inkSoft },
  toggleTextOn: { color: colors.ink },
  chipsWrap: { overflow: 'hidden' },
  title: { ...text.title },
  subtitle: text.subtitle,
  search: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.navLine,
    backgroundColor: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  // the chips run edge to edge under the search, in 44pt targets
  chipsRow: { marginHorizontal: -20, marginTop: 6, flexGrow: 0 },
  chipHit: { minHeight: 44, justifyContent: 'center' },
  chips: { gap: 8, paddingHorizontal: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.navLine },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  // a tournament chip leads with its logo, a little tighter on the left so the round sits evenly
  chipWithLogo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  chipTextOn: { color: colors.paper },
  group: { gap: 8 },
  // the day is the small label; the tournament is the heading of its rows
  day: { ...text.label, marginTop: 10 },
  event: { gap: 2, paddingHorizontal: 4, marginBottom: 2 },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // the category in bold ink and the round quiet beside it, as on Σήμερα's tournament heads
  eventSub: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6 },
  eventCategory: { fontFamily: fonts.bodyBold, fontSize: type.body.size, lineHeight: type.meta.line, color: colors.ink },
  eventDetail: { flexShrink: 1 },
  eventTitle: { flexShrink: 1, fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
