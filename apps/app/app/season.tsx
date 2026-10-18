import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { greekCaps } from '@netprophet/copy';
import { BallArt } from '../src/components/Avatar';
import { CARD_RATIO } from '../src/components/BallerCard';
import { SeasonShareCard } from '../src/components/SeasonCards';
import { useCopy } from '../src/i18n';
import { track } from '../src/lib/analytics';
import { useLook, useMyAvatar, useSeason } from '../src/lib/data';
import { seasonMessage, seasonView, type SeasonStat } from '../src/lib/season';
import { shareCard } from '../src/lib/shareCard';
import { useCountFromZero, usePopIn, usePress, useStgIn } from '../src/lib/motion';
import { colors, fonts, motion, text } from '../src/theme';

/**
 * Pro «Η σεζόν σου», full screen on ink from Εγώ and the month-end moment: your Baller and the month in big numbers
 * that count up one after another (lime only on what you earned). Without Pro the matches, wins, losses and points
 * show, and the rest is a locked card that opens Pro; the month's first win can still go out as a card. With Pro: sets,
 * runs, deciding sets, tie-breaks, tournaments, σερί, the best win, the Ladder and ↑ ↓ against last month. «Μοιράσου
 * τη σεζόν» (the screen's one blue) sends the recap card. Reads facts only: nothing here changes points or places.
 */
const BALLER = 120;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function SeasonScreen() {
  const t = useCopy();
  const s = t.season;
  const params = useLocalSearchParams<{ month?: string; from?: string }>();
  const month = params.month && MONTH_KEY.test(params.month) ? params.month : null;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 40, 360);
  const { season, loading, error } = useSeason(month);
  const my = useMyAvatar();
  const look = useLook();
  const eq = look.look?.equipped;
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const back = usePress();
  const send = usePress();
  const ball = usePopIn(motion.revealDur, motion.stagger);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const v = season ? seasonView(season, t) : null;

  const seen = useRef(false);
  useEffect(() => {
    if (!season || seen.current) return;
    seen.current = true;
    track('season_viewed', { pro: season.pro, month: season.month, from: params.from ?? 'direct' });
  }, [season, params.from]);

  const go = async () => {
    if (!season) return;
    setBusy(true);
    setFailed(false);
    try {
      const via = await shareCard(ref, seasonMessage(season, t), s.share);
      track('season_shared', { via });
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  const cardStats: SeasonStat[] = v ? (v.more ? [v.free[0]!, v.free[1]!, v.free[3]!, v.more.find((x) => x.key === 'best_streak')!] : v.free) : [];
  // the tiles count up one after another: the free four first, then the Pro ones
  let tile = 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={close} onPressIn={back.onPressIn} onPressOut={back.onPressOut} hitSlop={10} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        <View style={styles.head}>
          {v ? <Text style={styles.kicker}>{v.kicker}</Text> : null}
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.sub}>{s.sub}</Text>
        </View>
        {loading && !season ? <ActivityIndicator color={colors.mist} style={styles.loading} /> : null}
        {error && !season ? <Text style={styles.note}>{s.error}</Text> : null}
        {v ? (
          <>
            <View style={styles.hero}>
              {my.avatar ? (
                <Animated.View style={ball}>
                  <BallArt look={my.avatar.look} size={BALLER} kit={eq?.kit ?? 'kit_green'} gear={eq?.gear ?? null} frame={eq?.frame ?? null} cheer raised />
                </Animated.View>
              ) : null}
              <View style={styles.grid}>
                {v.free.map((x) => (
                  <Tile key={x.key} stat={x} i={tile++} />
                ))}
              </View>
            </View>
            {v.noPlayer ? <Text style={styles.note}>{s.noPlayer}</Text> : v.noMatches ? <Text style={styles.note}>{s.empty}</Text> : null}
            {!v.pro && v.freeCard ? <TextLink label={s.freeCard} onPress={() => router.push({ pathname: '/win-card', params: { match: v.freeCard!, from: 'season' } })} /> : null}
            {v.more ? (
              <>
                {v.vsLast ? <Text style={styles.vsLast}>{v.vsLast}</Text> : null}
                <View style={styles.grid}>
                  {v.more.map((x) => (
                    <Tile key={x.key} stat={x} i={tile++} small />
                  ))}
                </View>
                {v.bestWin ? (
                  <Block i={tile++}>
                    <Text style={styles.blockLabel}>{greekCaps(s.bestWin)}</Text>
                    <Text style={styles.bestLine}>{v.bestWin.line}</Text>
                    <Text style={styles.bestScore}>{v.bestWin.score}</Text>
                    {v.bestWin.where ? <Text style={styles.blockMeta}>{v.bestWin.where}</Text> : null}
                    <TextLink label={t.winCard.open} onPress={() => router.push({ pathname: '/win-card', params: { match: v.bestWin!.matchId, from: 'season' } })} />
                  </Block>
                ) : null}
                {v.ladder ? (
                  <Block i={tile++}>
                    <Text style={styles.blockLabel}>{greekCaps(v.ladder.label)}</Text>
                    <Text style={styles.ladderValue}>{v.ladder.value}</Text>
                  </Block>
                ) : null}
              </>
            ) : (
              <Locked i={tile++} />
            )}
            {my.avatar ? (
              <View style={[styles.cardBox, { minHeight: cardW * CARD_RATIO }]}>
                <SeasonShareCard
                  ref={ref}
                  width={cardW}
                  title={`${s.cardTitle} · ${v.month}`}
                  stats={cardStats}
                  bestWin={v.bestWin ? `${v.bestWin.line} ${v.bestWin.score}` : null}
                  look={my.avatar.look}
                  kit={eq?.kit ?? 'kit_green'}
                  gear={eq?.gear ?? null}
                  frame={eq?.frame ?? null}
                  bg={eq?.background ?? null}
                />
              </View>
            ) : null}
            {failed ? <Text style={styles.note}>{s.failed}</Text> : null}
            <Pressable accessibilityRole="button" disabled={busy || !my.avatar} onPress={() => void go()} onPressIn={send.onPressIn} onPressOut={send.onPressOut}>
              <Animated.View style={[styles.cta, busy && styles.ctaBusy, send.style]}>
                <Text style={styles.ctaText}>{busy ? s.making : s.share}</Text>
              </Animated.View>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** one number: it rises in and counts up from 0, staggered (tokens: reveal 700ms, stagger 70ms) */
function Tile({ stat, i, small = false }: { stat: SeasonStat; i: number; small?: boolean }) {
  const delay = motion.stagger * (i + 2);
  const enter = useStgIn(motion.revealDur, delay);
  const shown = useCountFromZero(stat.value, motion.revealDur, delay);
  return (
    <Animated.View style={[styles.tile, small && styles.tileSmall, enter]}>
      <View style={styles.tileTop}>
        <Text style={[small ? styles.valueSmall : styles.value, { color: stat.earned ? colors.lime : colors.paper }]}>{shown}</Text>
        {stat.arrow ? <Text style={styles.arrow}>{stat.arrow}</Text> : null}
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {stat.label}
      </Text>
    </Animated.View>
  );
}

function Block({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 2));
  return <Animated.View style={[styles.block, enter]}>{children}</Animated.View>;
}

/** a quiet text link on ink: paper, never blue (the share button is the screen's one blue) */
function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePress(0.97);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.linkHit}>
      <Animated.Text style={[styles.link, press.style]}>{label}</Animated.Text>
    </Pressable>
  );
}

/** without Pro: the rest of the season behind a lock, its labels showing so you see what is there */
function Locked({ i }: { i: number }) {
  const t = useCopy();
  const s = t.season;
  const press = usePress(0.97);
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 2));
  const labels = [s.stats.sets, s.stats.winRun, s.stats.bestStreak, s.bestWin, s.stats.tiebreaks, s.stats.ladder];
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=season')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.block, enter, press.style]}>
        <View style={styles.lockedGrid}>
          {labels.map((l) => (
            <View key={l} style={styles.lockedTile}>
              <Text style={styles.lockedValue}>?</Text>
              <Text style={styles.tileLabel} numberOfLines={1}>
                {l}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.lockTitle}>{s.locked.title}</Text>
        <Text style={styles.blockMeta}>{s.locked.line}</Text>
        <Text style={styles.lockCta}>{s.locked.cta}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 18 },
  backHit: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
  head: { gap: 8 },
  kicker: { ...text.label, color: colors.mist },
  title: { ...text.title, color: colors.paper },
  sub: { ...text.subtitle, color: colors.mist },
  loading: { marginTop: 40 },
  hero: { alignItems: 'center', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.inkRaised, gap: 2 },
  tileSmall: { flexBasis: '30%', paddingHorizontal: 12 },
  tileTop: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  // big numbers: line heights above the font size so iOS keeps the digits whole
  value: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 50 },
  valueSmall: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 34 },
  arrow: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.mist },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.mist },
  vsLast: { ...text.meta, color: colors.mist },
  block: { padding: 18, borderRadius: 22, backgroundColor: colors.inkRaised, gap: 6 },
  blockLabel: { ...text.label, color: colors.mist },
  blockMeta: { ...text.meta, color: colors.mist },
  bestLine: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 28, color: colors.paper },
  // the score of a win is what happened: lime
  bestScore: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 36, color: colors.lime },
  ladderValue: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 36, color: colors.paper },
  linkHit: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  lockedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6, opacity: 0.55 },
  lockedTile: { flexGrow: 1, flexBasis: '45%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.inkLine },
  lockedValue: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 30, color: colors.mist },
  lockTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 28, color: colors.paper },
  lockCta: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, marginTop: 4 },
  note: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.mist, textAlign: 'center' },
  cardBox: { alignItems: 'center', marginTop: 8 },
  cta: { minHeight: 54, marginTop: 'auto', borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
