import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { BracketTree } from '../../src/components/BracketTree';
import { CloseButton } from '../../src/components/PlayerRun';
import { RoundRobin } from '../../src/components/RoundRobin';
import { useCopy } from '../../src/i18n';
import { useFadeUpIn } from '../../src/lib/motion';
import { titleOf } from '../../src/lib/playerRun';
import { bracketRounds, groupViews } from '../../src/lib/tournaments';
import { usePlayerRun, type PlayerParams } from '../../src/lib/usePlayerRun';
import { colors, fonts, motion, text } from '../../src/theme';

/**
 * The whole draw of one of the player's categories, opened from their path: their matches stand out, the rest step
 * back, the slot they reach if they win is dashed, and it opens on the column of the match the hold was on (else the
 * one they play next).
 */
/** the tab bar keeps this screen mounted, so a new hold (other name, other point) builds it again: the params are its key */
export default function TournamentDrawScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Content key={[params.tournament, params.player, params.match, params.slot, params.entry, params.x, params.y].join('|')} />;
}

function Content() {
  const params = useLocalSearchParams<{ tournament: string; player: string; match?: string; slot?: string; entry?: string }>();
  const p: PlayerParams = { tournament: String(params.tournament), player: String(params.player), match: params.match, slot: params.slot, entry: params.entry };
  const t = useCopy();
  const { data: d, me, entry, run } = usePlayerRun(p);
  const head = useFadeUpIn(motion.revealDur, 0);
  const lit = useMemo(() => new Set((run?.steps ?? []).filter((s) => s.state !== 'next' && s.state !== 'later').map((s) => s.key)), [run]);
  const maybe = run?.steps.find((s) => s.state === 'next')?.key ?? null;
  const focusKey = run?.focusKey ?? run?.steps.find((s) => s.state === 'open')?.key ?? [...lit].pop() ?? null;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/tournament/${p.tournament}`));
  return (
    <View style={styles.screen}>
      <CloseButton onPress={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, styles.scrollEnd]} showsVerticalScrollIndicator={false}>
        {d && me && entry ? (
          <>
            <Animated.View style={head}>
              <Text style={styles.title}>{entry.tab}</Text>
              <Text style={styles.sub}>{titleOf(me, entry, t)}</Text>
            </Animated.View>
            {entry.draw.format === 'round_robin' ? (
              <RoundRobin groups={groupViews(entry.draw, d.masked, p.player, t)} focus tournamentId={d.id} />
            ) : (
              <BracketTree rounds={bracketRounds(entry.draw, d.masked, t)} me={p.player} lit={lit} maybe={maybe} focusKey={focusKey} tournamentId={d.id} tab={entry.tab} />
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, gap: 18 },
  scrollEnd: { paddingBottom: 32 },
  title: { ...text.title },
  sub: { marginTop: 2, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
});
