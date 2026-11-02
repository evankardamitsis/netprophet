import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useCopy } from '../i18n';
import type { PlayerProState } from '../lib/data';
import { usePress, useStgIn } from '../lib/motion';
import { teaserRows, teaserTitle, type TeaserRow } from '../lib/playerPro';
import { showsTrial } from '../lib/proEntries';
import { openProEntry, useIsPro } from '../lib/proEntry';
import { useProOffer } from '../lib/purchase';
import { colors, fonts, motion } from '../theme';
import { ScoutReport } from './ScoutReport';

/**
 * A player's card, the Pro part (founder, 2 Nov 2026: Pro sees everything on every card, and the free card makes
 * it attractive to buy). Pro: everything we know about them, the report «Ο αντίπαλος πριν το ματς» shows, without the
 * parts the card already has. Free: a dark card with what there is to see, the real counts («Χώμα · 14 ματς») and
 * the result of each locked, one paper button on ink (the screen's blue stays free). Shown on every visit, not only
 * once a day: this is where the player looks. Nothing on your own card.
 */
export function PlayerProCard({ state, first, gender }: { state: PlayerProState; first: string; gender: 'm' | 'f' | null }) {
  const t = useCopy();
  const enter = useStgIn(motion.revealDur, 200);
  if (state.kind === 'pro') {
    return (
      <>
        <Animated.View style={[styles.proHead, enter]}>
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>{t.playerPro.tag}</Text>
          </View>
          <Text style={styles.proTitle}>{t.playerPro.proTitle}</Text>
        </Animated.View>
        <ScoutReport o={state.view} inTournament={false} hero={false} traits={false} you={state.hasPlayer} />
      </>
    );
  }
  if (state.kind !== 'free') return null;
  const rows = teaserRows(state.teaser, state.hasPlayer, t);
  if (rows.length === 0) return null;
  return <Teaser rows={rows} title={teaserTitle(first, gender, t)} />;
}

function Teaser({ rows, title }: { rows: TeaserRow[]; title: string }) {
  const t = useCopy();
  const p = t.playerPro;
  const pro = useIsPro();
  const { offer } = useProOffer();
  const press = usePress(0.98);
  const enter = useStgIn(motion.revealDur, 200);
  const trial = showsTrial(pro, offer?.trial_available);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${p.label}`} onPress={() => openProEntry('player')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.card, enter, press.style]}>
        <View style={styles.top}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{p.tag}</Text>
          </View>
          {trial ? <Text style={styles.trial}>{t.pro.entries.meTrial}</Text> : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{p.sub}</Text>
        <View style={styles.rows}>
          {rows.map((row, i) => (
            <Row key={row.key} row={row} index={i} />
          ))}
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{p.cta}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** what there is, its count, and the record locked: two blank bars where the wins and losses would be */
function Row({ row, index }: { row: TeaserRow; index: number }) {
  const enter = useStgIn(motion.revealDurShort, 320 + Math.min(index, 8) * motion.stagger);
  return (
    <Animated.View style={[styles.row, index > 0 && styles.rowLine, enter]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <Text style={styles.rowCount}>{row.count}</Text>
      </View>
      <View style={styles.locked} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.blank} />
        <Text style={styles.dash}>-</Text>
        <View style={styles.blank} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  proHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  proPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.paper },
  proTitle: { flexShrink: 1, fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, paddingBottom: 4, marginBottom: -4, color: colors.ink },
  card: { padding: 18, borderRadius: 24, backgroundColor: colors.ink, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.paper },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.ink },
  trial: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist },
  title: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, paddingBottom: 4, marginBottom: -4, color: colors.paper },
  sub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  rows: { paddingTop: 2 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.inkLine },
  rowText: { flexShrink: 1, gap: 1 },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  rowCount: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.mist },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blank: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.inkLine },
  dash: { fontFamily: fonts.displayHeavy, fontSize: 18, color: colors.inkLine },
  cta: { minHeight: 48, marginTop: 4, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
