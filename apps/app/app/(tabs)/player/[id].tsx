import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import { PlayerTraits } from '../../../src/components/PlayerTraits';
import { FitText } from '../../../src/components/FitText';
import { FormDots } from '../../../src/components/PlayerListRow';
import { SafetySheet } from '../../../src/components/SafetySheet';
import { TOAST_MS, Toast } from '../../../src/components/Toast';
import { useCopy } from '../../../src/i18n';
import { usePlayer, useTraits, type FollowOutcome, type SafetyTarget } from '../../../src/lib/data';
import { runJpop, useGrowIn, usePopIn, usePress, useRiseIn, useSlamIn, useStgIn } from '../../../src/lib/motion';
import type { ProfileView } from '../../../src/lib/players';
import { colors, fonts } from '../../../src/theme';

/**
 * A player's profile (prototype V2, the `over` view): dark hero card with level, follow, name,
 * area · direction, this year's record and the last five; then the next match and the last matches.
 * then «Πώς παίζει» (traits, voted by people who played them). The header and tab bar stay; no tab is highlighted.
 * Head-to-head and gifts come later.
 */
const JPOP_MS = 400;

export default function PlayerScreen() {
  const t = useCopy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, loading, error, notFound, refresh, toggleFollow } = usePlayer(String(id));
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const back = usePress();
  const [safety, setSafety] = useState<SafetyTarget | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const tid = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(tid);
  }, [toast]);

  const onFollow = async () => {
    const outcome: FollowOutcome = await toggleFollow();
    const text = outcome === 'followed' ? t.players.followed : outcome === 'unfollowed' ? t.players.unfollowed : t.players.followFailed;
    setToast((p) => ({ text, n: (p?.n ?? 0) + 1 }));
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/players'));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && profile !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          onPressIn={back.onPressIn}
          onPressOut={back.onPressOut}
          style={styles.backHit}
          hitSlop={8}
        >
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        {profile ? (
          <>
            <Profile key={profile.id} p={profile} onFollow={onFollow} onToast={(text) => setToast((q) => ({ text, n: (q?.n ?? 0) + 1 }))} />
            {!profile.isMe ? (
              <Pressable accessibilityRole="button" onPress={() => setSafety({ kind: 'player', id: profile.id })} style={styles.reportHit}>
                <Text style={styles.report}>{t.safety.report}</Text>
              </Pressable>
            ) : null}
          </>
        ) : !loading ? (
          <Text style={styles.note}>{notFound ? t.players.notFound : error ? t.players.error : ''}</Text>
        ) : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
      <SafetySheet target={safety} onClose={(text) => { setSafety(null); if (text) setToast((p) => ({ text, n: (p?.n ?? 0) + 1 })); }} />
    </View>
  );
}

function Profile({ p, onFollow, onToast }: { p: ProfileView; onFollow: () => void; onToast: (text: string) => void }) {
  const t = useCopy();
  const traits = useTraits(p.id, null);
  const hero = useStgIn(450, 0);
  const nameIn = useRiseIn(550, 70);
  const subIn = useRiseIn(550, 150);
  const line = useGrowIn(600, 200);
  const recIn = useRiseIn(500, 250);
  const formIn = useRiseIn(500, 300);
  const nextIn = useStgIn(450, 350);
  const lastIn = useStgIn(450, 420);
  return (
    <>
      <Animated.View style={[styles.hero, hero]}>
        <View style={styles.heroTop}>
          {p.level ? <LevelPill text={p.level} /> : <View />}
          {p.isMe ? null : <FollowPill on={p.isFollowed} onPress={onFollow} />}
        </View>
        <Animated.View style={nameIn}>
          <FitText text={p.first} style={styles.first} />
          <FitText text={p.surname} style={styles.surname} />
        </Animated.View>
        {p.sub ? <Animated.Text style={[styles.heroSub, subIn]}>{p.sub}</Animated.Text> : null}
        <View style={styles.dividerTrack}>
          <Animated.View style={[styles.divider, line]} />
        </View>
        <Animated.View style={[styles.stat, recIn]}>
          <Text style={styles.statLabel}>{t.players.thisYear}</Text>
          <Text style={styles.statValue}>{p.record}</Text>
        </Animated.View>
        <Animated.View style={[styles.stat, formIn]}>
          <Text style={styles.statLabel}>{t.players.last5}</Text>
          <FormDots form={p.form} on={colors.lime} off={colors.inkLine} size={14} gap={5} baseDelay={450} />
        </Animated.View>
      </Animated.View>

      {p.next ? (
        <Animated.View style={[styles.next, nextIn]}>
          <Text style={styles.cardHead}>{greekCaps(t.players.next)}</Text>
          <Text style={styles.nextText}>{p.next}</Text>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.last, lastIn]}>
        <Text style={[styles.cardHead, styles.blueHead]}>{greekCaps(t.players.lastMatches)}</Text>
        {p.last.length === 0 ? (
          <Text style={styles.lastText}>{t.players.noMatches}</Text>
        ) : (
          p.last.map((m, i) => (
            <View key={i} style={styles.lastRow}>
              <Text style={styles.lastText}>
                <Text style={styles.bold}>{m.result}</Text> {m.against}
              </Text>
              <Text style={styles.when}>{m.when}</Text>
            </View>
          ))
        )}
      </Animated.View>

      {p.isMe ? null : <PlayerTraits state={traits} first={p.first} onToast={onToast} />}
    </>
  );
}

function LevelPill({ text }: { text: string }) {
  const slam = useSlamIn(450, 250);
  return (
    <Animated.View style={[styles.levelPill, slam]}>
      <Text style={styles.levelText}>{text}</Text>
    </Animated.View>
  );
}

/** «+ Ακολούθησε» (white, blue text) or «✓ Στους φίλους σου» (lime); jpops when it changes. */
function FollowPill({ on, onPress }: { on: boolean; onPress: () => void }) {
  const t = useCopy();
  const enter = usePopIn(400, 220);
  const press = usePress();
  const jpop = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    runJpop(jpop, JPOP_MS);
  }, [on, jpop]);
  const jpopStyle = useAnimatedStyle(() => ({ transform: [{ scale: jpop.value }] }));
  return (
    <Animated.View style={[enter, jpopStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[styles.follow, { backgroundColor: on ? colors.lime : colors.white }, press.style]}>
          <Text style={[styles.followText, { color: on ? colors.ink : colors.blue }]}>{on ? t.players.following : t.players.follow}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** The 76px and 44px names have line heights under their size: the padding, cancelled by a margin, keeps the tonos on iOS. */
const FIRST_PAD = 14;
const SUR_PAD = 8;

const styles = StyleSheet.create({
  reportHit: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', marginTop: 8 },
  report: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  note: { paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  hero: { padding: 22, borderRadius: 28, backgroundColor: colors.ink, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  levelPill: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.lime },
  levelText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.ink },
  follow: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  followText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16 },
  first: {
    fontFamily: fonts.displayHeavy,
    fontSize: 76,
    lineHeight: 67,
    color: colors.paper,
    paddingTop: FIRST_PAD,
    marginTop: -FIRST_PAD,
  },
  surname: {
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    lineHeight: 42,
    color: colors.paper,
    paddingTop: SUR_PAD,
    marginTop: -SUR_PAD + 2,
  },
  heroSub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.mist },
  dividerTrack: { height: 1 },
  divider: { height: 1, backgroundColor: colors.inkLine },
  stat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statLabel: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.mist },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  next: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.lime, gap: 4 },
  cardHead: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.ink },
  // prototype: the «Τελευταία ματς» heading is blue (open question: one blue per screen)
  blueHead: { color: colors.blue },
  nextText: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 34, color: colors.ink },
  last: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.white, gap: 8 },
  lastRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lastText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.ink },
  bold: { fontFamily: fonts.bodyBold },
  when: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
});
