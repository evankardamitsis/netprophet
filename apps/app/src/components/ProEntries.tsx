import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import { useCopy } from '../i18n';
import { usePopIn, usePress } from '../lib/motion';
import { showsTrial, type ProMoment } from '../lib/proEntries';
import { openProEntry, useIsPro, useProEntry } from '../lib/proEntry';
import { useProOffer } from '../lib/purchase';
import { colors, fonts, text } from '../theme';

/**
 * Pro made visible, never pushy and never advantage (founder, 22 Oct 2026): a quiet line at the moment Pro helps, the
 * header's small entry, Εγώ's card and the locked teaser on a player's card. All of them sell information, alerts and
 * convenience; none shows to a Pro player (rules and the once-a-day rest are in lib/proEntries).
 */

/** one quiet line, «Δες τον αντίπαλό σου με Pro ›»; nothing for Pro players or when it rests for the day */
export function ProLine({ moment, label }: { moment: ProMoment; label: string }) {
  const { show, open } = useProEntry(moment);
  const press = usePress();
  const pop = usePopIn(450, 200);
  if (!show) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.lineHit}>
      <Animated.View style={[press.style, pop]}>
        <Text style={styles.line}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** the header's small «PRO» beside the points: paper outline on ink (lime and blue stay for what they mean) */
export function HeaderProPill() {
  const t = useCopy();
  const { show } = useProEntry('header');
  const press = usePress();
  if (!show) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.pro.entries.headerLabel}
      onPress={() => openProEntry('header')}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={6}
      style={styles.pillHit}
    >
      <Animated.View style={[styles.pill, press.style]}>
        <Text style={styles.pillText}>{t.pro.entries.meTag}</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Εγώ, for a player without Pro: the dark card high on the page (as the home's Pro card), what Pro really gives today
 * in three short lines and one paper button on ink, so the screen's blue stays free. The free week only if the server
 * says it is there to take.
 */
export function MeProCard() {
  const t = useCopy();
  const e = t.pro.entries;
  const pro = useIsPro();
  const { offer } = useProOffer();
  const press = usePress(0.98);
  if (pro !== false) return null;
  const trial = showsTrial(pro, offer?.trial_available);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${t.pro.promise}. ${e.meCta}`} onPress={() => openProEntry('me')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.card, press.style]}>
        <View style={styles.top}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{e.meTag}</Text>
          </View>
          {trial ? <Text style={styles.trial}>{e.meTrial}</Text> : null}
        </View>
        <Text style={styles.promise}>{t.pro.promise}</Text>
        <View style={styles.benefits}>
          {e.meBenefits.map((b) => (
            <Text key={b} style={styles.benefit}>
              <Text style={styles.mark}>+ </Text>
              {b}
            </Text>
          ))}
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{e.meCta}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * A player's card, below what the free card shows: one compact block of what Pro adds (all matches, head to head, by
 * surface), greyed and locked. A tap opens Pro. Not on your own card, where those numbers are «Τα στατιστικά σου».
 */
export function ProTeaser() {
  const t = useCopy();
  const e = t.pro.entries;
  const { show, open } = useProEntry('player');
  const press = usePress(0.98);
  if (!show) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={e.teaserLabel} onPress={open} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.teaser, press.style]}>
        <View style={styles.teaserTop}>
          <Text style={styles.teaserHead}>{greekCaps(e.teaserTag)}</Text>
          <Text style={styles.teaserGo}>›</Text>
        </View>
        {e.teaserRows.map((row, i) => (
          <View key={row} style={styles.teaserRow}>
            <Text style={styles.teaserLabel}>{row}</Text>
            <View style={[styles.bar, { width: 56 - i * 10 }]} />
          </View>
        ))}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lineHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  line: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  pillHit: { minHeight: 44, justifyContent: 'center' },
  pill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.paper },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, color: colors.paper },
  card: { padding: 16, borderRadius: 18, backgroundColor: colors.ink, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.paper },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.ink },
  trial: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist },
  promise: { ...text.heading, fontSize: 24, lineHeight: 26, color: colors.paper },
  benefits: { gap: 4 },
  benefit: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  mark: { fontFamily: fonts.bodyBold, color: colors.paper },
  cta: { minHeight: 46, marginTop: 4, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  teaser: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.sand, gap: 8 },
  teaserTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teaserHead: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.inkSoft },
  teaserGo: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.inkSoft },
  teaserRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: 0.55 },
  teaserLabel: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.stone },
});
