import { useEffect, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import { PlayerListRow } from '../../src/components/PlayerListRow';
import { useCopy } from '../../src/i18n';
import { usePlayerSearch, usePlayersHome } from '../../src/lib/data';
import { fmt } from '../../src/lib/votes';
import { colors, ease, fonts } from '../../src/theme';

/**
 * Παίκτες (prototype V2, isPlayers): search the roster, and before searching your friends and who plays
 * today. The prototype only fakes the search; here it is a real field (2+ letters, Greek or Greeklish).
 */
const TITLE_IN_MS = 400;
/** the 60px title's line height is below its size; this keeps the tonos drawn on iOS */
const ACCENT_PAD = 10;
/** web: the ink border is the focus state, not the browser's own ring (a web-only style RN does not type) */
const NO_WEB_RING = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export default function PlayersScreen() {
  const t = useCopy();
  const home = usePlayersHome();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const search = usePlayerSearch(query);
  const titleIn = useInA();

  const rows = search.rows ?? home.rows;
  const label =
    search.rows === null
      ? t.players.listLabel
      : search.rows.length === 0
        ? search.searching
          ? ''
          : t.players.noneFound
        : search.rows.length === 1
          ? t.players.countOne
          : fmt(t.players.countMany, { n: search.rows.length });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={home.loading && home.rows.length > 0} onRefresh={home.refresh} tintColor={colors.ink} />}
      >
        <View style={styles.list}>
          <Animated.View style={[styles.head, titleIn]}>
            <Text style={styles.title}>{t.players.title}</Text>
            <Text style={styles.subtitle}>{t.players.subtitle}</Text>
          </Animated.View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={home.total ? fmt(t.players.search, { n: home.total }) : ''}
            placeholderTextColor={colors.inkSoft}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel={t.players.title}
            style={[styles.search, NO_WEB_RING, { borderColor: focused || query ? colors.ink : colors.fog }]}
          />
          {label ? <Text style={styles.label}>{greekCaps(label)}</Text> : null}
          {rows.map((row, i) => (
            <PlayerListRow key={row.id} row={row} index={i} onPress={() => router.push(`/player/${row.id}`)} />
          ))}
          {search.rows === null && !home.loading && home.rows.length === 0 ? (
            <Text style={styles.empty}>{home.error ? t.players.error : t.players.empty}</Text>
          ) : null}
        </View>
      </ScrollView>
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
  // prototype: padding 18px 20px 14px (no «+ Ματς» on this tab)
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14 },
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
  search: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.52, color: colors.inkSoft },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
