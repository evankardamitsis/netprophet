import { useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import { PlayerListRow } from '../../src/components/PlayerListRow';
import { useCopy } from '../../src/i18n';
import { usePlayerSearch, usePlayersHome } from '../../src/lib/data';
import { useFadeUpIn } from '../../src/lib/motion';
import { fmt } from '../../src/lib/votes';
import { colors, fonts, text } from '../../src/theme';

/**
 * Παίκτες (prototype V2, isPlayers): search the roster, and before searching your friends and who plays
 * today. The prototype only fakes the search; here it is a real field (2+ letters, Greek or Greeklish).
 */
const TITLE_IN_MS = 400;
/** web: the ink border is the focus state, not the browser's own ring (a web-only style RN does not type) */
const NO_WEB_RING = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export default function PlayersScreen() {
  const t = useCopy();
  // opened from Τουρνουά's search entry: the keyboard comes up at once
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const home = usePlayersHome();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const search = usePlayerSearch(query);
  const titleIn = useFadeUpIn(TITLE_IN_MS);

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
          <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/tournaments'))} style={styles.backHit}>
            <Text style={styles.back}>{t.tournaments.backTournaments}</Text>
          </Pressable>
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
            autoFocus={focus === '1'}
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


const styles = StyleSheet.create({
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px 14px (no «+ Ματς» on this tab)
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14 },
  list: { gap: 10 },
  head: { gap: 6 },
  title: { ...text.title },
  subtitle: text.subtitle,
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
  label: { ...text.label },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
