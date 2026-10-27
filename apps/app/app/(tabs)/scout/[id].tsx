import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import { FitText } from '../../../src/components/FitText';
import { FormDots } from '../../../src/components/PlayerListRow';
import { StatBlockCard } from '../../../src/components/StatBlocks';
import { useCopy } from '../../../src/i18n';
import { useScout } from '../../../src/lib/data';
import { HoldName, HoldSegs } from '../../../src/lib/playerHold';
import type { StatsFormat } from '../../../src/lib/matchStats';
import { usePress, useStgIn } from '../../../src/lib/motion';
import type { ScoutFormat, ScoutLine, ScoutView } from '../../../src/lib/scout';
import { colors, fonts, motion, text } from '../../../src/theme';

/**
 * «Ο αντίπαλος πριν το ματς» (Pro): the other side of your own next match. Founder, 22 Oct 2026: as much as we know,
 * never less than the free player card. One idea per card: who they are and their last ten, μεταξύ σας with every
 * meeting, the pressure numbers, singles and doubles in the blocks of «Τα στατιστικά σου», this tournament so far,
 * common opponents, how they play, and every match.
 * The database refuses anyone else's match and anyone without Pro; without Pro this screen opens the Pro sheet.
 */
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;
/** the history opens with ten rows, ten more a tap */
const HISTORY_STEP = 10;

export default function ScoutScreen() {
  const t = useCopy();
  const s = t.scout;
  const { id } = useLocalSearchParams<{ id: string }>();
  const scout = useScout(String(id));
  const back = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));

  useEffect(() => {
    if (scout.error === 'pro_required') router.replace('/pro?from=scout');
  }, [scout.error]);

  const message = scout.error === 'not_your_match' ? s.notYours : scout.error === 'match_over' ? s.over : scout.error === 'failed' ? s.error : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={scout.loading && scout.opponents.length > 0} onRefresh={scout.refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        <Section i={0}>
          <View style={styles.head}>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>{t.pro.title}</Text>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            {scout.when ? <Text style={styles.subtitle}>{scout.when}</Text> : null}
            {scout.event ? <Text style={styles.subtitle}>{scout.event}</Text> : null}
          </View>
        </Section>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {scout.opponents.map((o) => (
          <Opponent key={o.id} o={o} inTournament={scout.event !== null} />
        ))}
        {scout.opponents.length > 0 ? <Text style={styles.fair}>{s.fair}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Section({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(motion.revealDur, 50 + Math.min(i, 8) * motion.stagger);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

function Opponent({ o, inTournament }: { o: ScoutView; inTournament: boolean }) {
  const t = useCopy();
  const s = t.scout;
  const [format, setFormat] = useState<StatsFormat | null>(o.formats[0]?.format ?? null);
  const [shown, setShown] = useState(HISTORY_STEP);
  const part = o.formats.find((f) => f.format === format) ?? null;
  let i = 1;
  return (
    <>
      <Section i={i++}>
        <View style={styles.hero}>
          <Text style={styles.first}>{o.first}</Text>
          <FitText text={o.surname} style={styles.surname} />
          {o.sub ? <Text style={styles.heroSub}>{o.sub}</Text> : null}
          <View style={styles.formRow}>
            <Text style={styles.heroSub}>{o.year}</Text>
            <Text style={styles.heroSub}>{s.last10}</Text>
          </View>
          <FormDots form={o.form} on={colors.lime} off={colors.inkLine} size={14} gap={5} baseDelay={450} />
        </View>
      </Section>

      <Section i={i++}>
        <View style={styles.card}>
          <Text style={styles.label}>{greekCaps(s.h2h)}</Text>
          {o.h2h.record ? <Text style={styles.big}>{o.h2h.record}</Text> : null}
          <Text style={styles.line}>{o.h2h.line}</Text>
          {o.h2h.meetings.length > 1 ? (
            <View>
              {o.h2h.count ? <Text style={styles.muted}>{o.h2h.count}</Text> : null}
              {o.h2h.meetings.map((m, k) => (
                <LineRow key={m.key} m={m} first={k === 0} />
              ))}
            </View>
          ) : null}
        </View>
      </Section>

      <Section i={i++}>
        <View style={styles.tiles}>
          <Tile value={o.deciding} label={s.deciding} />
          <Tile value={o.tiebreaks} label={s.tiebreaks} />
          <Tile value={o.known} label={s.known} wide />
        </View>
      </Section>

      <Section i={i++}>
        <View style={styles.numbersHead}>
          <Text style={styles.sectionTitle}>{s.numbers}</Text>
          {o.formats.length > 1 ? (
            <View style={styles.segment} accessibilityRole="tablist">
              {o.formats.map((f) => (
                <Segment key={f.format} label={f.label} on={f.format === format} onPress={() => setFormat(f.format)} />
              ))}
            </View>
          ) : null}
        </View>
      </Section>
      {part ? (
        <View key={part.format} style={styles.blocks}>
          <FormatHero f={part} />
          {part.blocks.map((b, k) => (
            <StatBlockCard key={b.key} block={b} i={k} />
          ))}
        </View>
      ) : (
        <Text style={styles.message}>{s.noNumbers}</Text>
      )}

      {inTournament ? (
        <Section i={i++}>
          <View style={styles.card}>
            <Text style={styles.label}>{greekCaps(s.path)}</Text>
            {o.path.length === 0 ? <Text style={styles.line}>{s.pathNone}</Text> : o.path.map((m, k) => <LineRow key={m.key} m={m} first={k === 0} />)}
          </View>
        </Section>
      ) : null}

      <Section i={i++}>
        <View style={styles.card}>
          <Text style={styles.label}>{greekCaps(s.common)}</Text>
          {o.common.length === 0 ? (
            <Text style={styles.line}>{s.noCommon}</Text>
          ) : (
            <>
              <View style={styles.commonHead}>
                <Text style={[styles.commonName, styles.mutedText]} />
                <Text style={styles.commonCol}>{s.you}</Text>
                <Text style={styles.commonCol} numberOfLines={1}>
                  {o.first}
                </Text>
              </View>
              {o.common.map((c) => (
                <View key={c.id} style={styles.commonRow}>
                  <Text style={styles.commonName} numberOfLines={1}>
                    <HoldName tournamentId={null} playerId={c.id}>
                      {c.name}
                    </HoldName>
                  </Text>
                  <Text style={styles.commonValue}>{c.me}</Text>
                  <Text style={styles.commonValue}>{c.them}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </Section>

      <Section i={i++}>
        <View style={styles.card}>
          <Text style={styles.label}>{greekCaps(s.traits)}</Text>
          {o.traits.length === 0 ? (
            <Text style={styles.line}>{s.traitsNone}</Text>
          ) : (
            <View style={styles.chips}>
              {o.traits.map((x) => (
                <View key={x.id} style={styles.chip}>
                  <Text style={styles.chipText}>{x.label}</Text>
                  <Text style={styles.chipN}>{x.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Section>

      {o.history.length > 0 ? (
        <Section i={i++}>
          <View style={styles.card}>
            <Text style={styles.label}>{greekCaps(s.history)}</Text>
            {o.history.slice(0, shown).map((m, k) => (
              <LineRow key={m.key} m={m} first={k === 0} />
            ))}
            {shown < o.history.length ? (
              <Pressable accessibilityRole="button" onPress={() => setShown((n) => n + HISTORY_STEP)} style={styles.moreHit}>
                <Text style={styles.more}>{s.historyMore}</Text>
              </Pressable>
            ) : o.historyCap ? (
              <Text style={styles.muted}>{o.historyCap}</Text>
            ) : null}
          </View>
        </Section>
      ) : null}
    </>
  );
}

/** one format's record on ink: W-L, the rate, the wins in a row now and at most */
function FormatHero({ f }: { f: ScoutFormat }) {
  const t = useCopy();
  const h = t.matchStats.hero;
  return (
    <View style={styles.formatHero}>
      <View style={styles.formatTop}>
        <Text style={styles.formatRecord}>{f.record}</Text>
        <View style={styles.rate}>
          <Text style={styles.rateNum}>{f.pct}</Text>
          <Text style={styles.heroSub}>{h.pct}</Text>
        </View>
      </View>
      {f.runs ? (
        <View style={styles.runs}>
          <View style={styles.run}>
            <Text style={[styles.runNum, f.runs.current > 0 && styles.lime]}>{f.runs.current}</Text>
            <Text style={styles.heroSub}>{h.runNow}</Text>
          </View>
          <View style={styles.run}>
            <Text style={styles.runNum}>{f.runs.best}</Text>
            <Text style={styles.heroSub}>{h.runBest}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** a match: ✓ on lime for a win, who, the score from that side, a quiet line */
function LineRow({ m, first }: { m: ScoutLine; first: boolean }) {
  return (
    <View style={[styles.row, !first && styles.rowLine]}>
      <View style={[styles.mark, m.won ? styles.markWin : styles.markLoss]}>{m.won ? <Text style={styles.tick}>✓</Text> : null}</View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          {/* a meeting between you has no names to show: the score leads */}
          <Text style={styles.against}>{m.againstSegs.length > 0 ? <HoldSegs tournamentId={null} segs={m.againstSegs} /> : m.score}</Text>
          {m.against && m.score ? <Text style={styles.score}>{m.score}</Text> : null}
        </View>
        {m.partnerSegs ? (
          <Text style={styles.muted}>
            <HoldSegs tournamentId={null} segs={m.partnerSegs} />
          </Text>
        ) : null}
        {m.meta ? <Text style={styles.muted}>{m.meta}</Text> : null}
      </View>
    </View>
  );
}

/** one half of the format toggle: the chosen one in ink (the screen has no blue) */
function Segment({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress(0.96);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.segHit}>
      <Animated.View style={[styles.seg, on && styles.segOn, press.style]}>
        <Text style={[styles.segText, on && styles.segTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function Tile({ value, label, wide = false }: { value: string; label: string; wide?: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const MARK = 26;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  head: { gap: 6 },
  proPill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  title: { ...text.title },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  message: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  hero: { padding: 18, borderRadius: 28, backgroundColor: colors.ink, gap: 4 },
  first: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, paddingBottom: 5, marginBottom: -5, color: colors.paper },
  surname: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 52, paddingBottom: 10, marginBottom: -10, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  heroSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  card: { padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.inkSoft },
  big: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 48, paddingBottom: 10, marginBottom: -10, color: colors.ink },
  line: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.ink },
  muted: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  mutedText: { color: colors.inkSoft },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.5%', padding: 14, borderRadius: 18, backgroundColor: colors.white, gap: 2 },
  tileWide: { width: '100%' },
  tileValue: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  numbersHead: { gap: 10, paddingTop: 6 },
  sectionTitle: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, paddingBottom: 6, marginBottom: -6, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: colors.white, gap: 4 },
  segHit: { flex: 1, minHeight: 44, justifyContent: 'center' },
  seg: { minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  segTextOn: { color: colors.paper },
  blocks: { gap: 12 },
  formatHero: { padding: 18, borderRadius: 24, backgroundColor: colors.ink, gap: 12 },
  formatTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  formatRecord: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 72, color: colors.paper },
  rate: { alignItems: 'flex-end', paddingBottom: 8 },
  rateNum: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 42, color: colors.paper },
  runs: { flexDirection: 'row', gap: 10 },
  run: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.inkDeep, gap: 2 },
  runNum: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 36, color: colors.paper },
  lime: { color: colors.lime },
  commonHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderTopWidth: 1, borderTopColor: colors.navLine },
  commonName: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  commonCol: { width: 64, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  commonValue: { width: 64, textAlign: 'right', fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingBottom: 4, marginBottom: -4, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  chipN: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 22, paddingBottom: 4, marginBottom: -4, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.navLine, paddingTop: 12 },
  mark: { width: MARK, height: MARK, borderRadius: MARK / 2, alignItems: 'center', justifyContent: 'center', marginTop: -1 },
  markWin: { backgroundColor: colors.lime },
  markLoss: { borderWidth: 2, borderColor: colors.fog },
  tick: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 18, color: colors.ink },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  against: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  score: { flexShrink: 0, maxWidth: '55%', textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  moreHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  more: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  fair: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
