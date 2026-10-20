import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCopy } from '../i18n';
import { usePro } from '../lib/data';
import type { MeView } from '../lib/me';
import { useUnlocks } from '../lib/unlocks';
import { colors, fonts } from '../theme';

/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

/**
 * «Τα ματς σου»: last results with Ν / Η, then the next match or how to add one (moved from Εγώ's stats page to
 * «Τα στατιστικά σου», 18 Oct 2026: your matches live with your match numbers, apart from your votes).
 */
export function RecentMatches({ v }: { v: MeView }) {
  const t = useCopy();
  const { state } = usePro();
  const proOpen = useUnlocks().has('pro_sheet');
  const scout = () => (state?.pro ? router.push(`/scout/${v.nextMatchId}`) : router.push('/pro?from=scout'));
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>{t.me.matches.title}</Text>
      <View style={styles.card}>
        {v.last.map((m, i) => (
          <View key={i} style={[styles.matchRow, i > 0 && styles.matchLine]}>
            <View style={[styles.letter, m.win ? styles.letterWin : styles.letterLoss]}>
              <Text style={[styles.letterText, { color: m.win ? colors.ink : colors.lime }]}>{m.win ? t.me.matches.win : t.me.matches.loss}</Text>
            </View>
            <View style={styles.matchText}>
              <Text style={styles.matchAgainst}>{m.against}</Text>
              {m.with ? <Text style={styles.muted}>{m.with}</Text> : null}
              <Text style={styles.muted}>{[m.score, m.when].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
        ))}
        {v.next ? (
          <View style={[styles.nextBox, v.last.length > 0 && styles.matchLine]}>
            <Text style={styles.label}>{t.me.matches.next}</Text>
            <Text style={styles.nextText}>{v.next}</Text>
            {v.nextMatchId && proOpen ? (
              <Pressable accessibilityRole="button" onPress={scout} style={styles.scoutRow}>
                <Text style={styles.link}>{t.scout.open}</Text>
                {state?.pro ? null : (
                  <View style={styles.proPill}>
                    <Text style={styles.proPillText}>{t.pro.title}</Text>
                  </View>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={[styles.nextBox, v.last.length > 0 && styles.matchLine]}>
            <Text style={styles.muted}>{t.me.matches.nextEmpty}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/add-match')} style={styles.linkHit}>
              <Text style={styles.link}>{t.me.matches.add}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  heading: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, paddingBottom: 6, marginBottom: -6, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  card: { padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 10 },
  muted: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  matchLine: { borderTopWidth: 1, borderTopColor: colors.navLine, paddingTop: 10 },
  letter: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  letterWin: { backgroundColor: colors.lime },
  letterLoss: { backgroundColor: colors.ink },
  letterText: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 20, paddingBottom: 4, marginBottom: -4 },
  matchText: { flex: 1, minWidth: 0 },
  matchAgainst: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  nextBox: { gap: 4 },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink },
  linkHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  scoutRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  proPill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
});
