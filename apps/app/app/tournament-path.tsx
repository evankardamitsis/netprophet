import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { greekCaps } from '@netprophet/copy';
import { CloseButton, EntryPills, PathView } from '../src/components/PlayerRun';
import { useCopy } from '../src/i18n';
import { useFadeUpIn, usePress } from '../src/lib/motion';
import { titleOf } from '../src/lib/playerRun';
import { carry, usePlayerRun, type PlayerParams } from '../src/lib/usePlayerRun';
import { colors, fonts, motion, text } from '../src/theme';

/**
 * «Η πορεία στο ταμπλό» (founder, 21 Oct, after build 12: the draw at the bottom of the sheet "looked bad and did not
 * light up"): the player's rounds as one column built for a phone, first round on top, drawn step by step. Pills
 * switch to their other categories and pairs; «Όλο το ταμπλό ›» opens the whole draw with this path lit.
 */
export default function TournamentPathScreen() {
  const params = useLocalSearchParams<{ tournament: string; player: string; match?: string; slot?: string; entry?: string }>();
  const p: PlayerParams = { tournament: String(params.tournament), player: String(params.player), match: params.match, slot: params.slot, entry: params.entry };
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const f = t.tournaments.focus;
  const state = usePlayerRun(p);
  const { me, entries, entry, run } = state;
  const head = useFadeUpIn(motion.revealDur, 0);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/tournament/${p.tournament}`));
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <CloseButton onPress={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {me ? (
          <Animated.View style={[styles.head, head]}>
            <Text style={styles.label}>{greekCaps(f.openPath)}</Text>
            <Text style={styles.title}>{titleOf(me, entry, t)}</Text>
          </Animated.View>
        ) : null}
        <EntryPills entries={entries} picked={entry} onPick={state.pick} />
        {run && run.steps.length > 0 ? (
          // a new pill draws the path again
          <View key={entry!.key}>
            <PathView run={run} />
            <WholeDraw label={f.wholeDraw} onPress={() => router.push({ pathname: '/tournament-draw', params: carry(p, entry) })} />
          </View>
        ) : state.data ? (
          <Text style={styles.empty}>{f.noRun}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function WholeDraw({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePress();
  const enter = useFadeUpIn(motion.revealDur, motion.revealDur);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.wholeHit}>
        <Animated.View style={[styles.whole, press.style]}>
          <Text style={styles.wholeText}>{label}</Text>
          <Text style={styles.wholeGo}>›</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, gap: 18 },
  head: { gap: 4 },
  label: { ...text.label },
  title: { ...text.title },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  wholeHit: { alignSelf: 'center', marginTop: 8, minHeight: 44, justifyContent: 'center' },
  whole: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 2, borderColor: colors.ink },
  wholeText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  wholeGo: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 22, color: colors.ink },
});
