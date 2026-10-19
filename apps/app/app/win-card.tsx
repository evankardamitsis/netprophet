import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CARD_RATIO } from '../src/components/BallerCard';
import { WinShareCard } from '../src/components/SeasonCards';
import { useCopy } from '../src/i18n';
import { track } from '../src/lib/analytics';
import { useLook, useMyAvatar, useWinCard } from '../src/lib/data';
import { winCardMessage, winCardView } from '../src/lib/season';
import { shareCard } from '../src/lib/shareCard';
import { usePopIn, usePress } from '../src/lib/motion';
import { colors, fonts, motion, text } from '../src/theme';

/**
 * «Μοιράσου τη νίκη» (Pro «Η σεζόν σου»), full screen from your own win on Αποτελέσματα or the season: the card as it
 * will look and «Στείλ’ την» (the screen's one blue). Pro makes a card for every win; without Pro the first win of each
 * month is free and any other shows the Pro lock instead. The database decides which; the route only names the match.
 */
export default function WinCardScreen() {
  const t = useCopy();
  const w = t.winCard;
  const { match, from } = useLocalSearchParams<{ match?: string; from?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 40, 360);
  const { card, loading, error } = useWinCard(match ?? '');
  const my = useMyAvatar();
  const look = useLook();
  const eq = look.look?.equipped;
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const back = usePress();
  const send = usePress();
  const lock = usePress();
  const pop = usePopIn(motion.revealDur, motion.stagger * 2);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/results'));

  useEffect(() => {
    if (error === 'pro_required') track('win_card_locked', { from: from ?? 'direct' });
  }, [error, from]);

  const go = async () => {
    if (!card) return;
    setBusy(true);
    setFailed(false);
    try {
      const via = await shareCard(ref, winCardMessage(card, t), w.title);
      track('win_card_shared', { via, free: card.free && !card.pro });
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <Pressable accessibilityRole="button" onPress={close} onPressIn={back.onPressIn} onPressOut={back.onPressOut} hitSlop={10} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        <View style={styles.head}>
          <Text style={styles.title}>{w.title}</Text>
          <Text style={styles.sub}>{card?.free && !card.pro ? w.free : w.sub}</Text>
        </View>
        {loading ? <ActivityIndicator color={colors.mist} style={styles.loading} /> : null}
        {card && my.avatar ? (
          <Animated.View style={[styles.cardBox, { minHeight: cardW * CARD_RATIO }, pop]}>
            <WinShareCard
              ref={ref}
              width={cardW}
              view={winCardView(card, t)}
              look={my.avatar.look}
              kit={eq?.kit ?? 'kit_green'}
              gear={eq?.gear ?? null}
              frame={eq?.frame ?? null}
              bg={eq?.background ?? null}
            />
          </Animated.View>
        ) : null}
        {error === 'pro_required' ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=win_card')} onPressIn={lock.onPressIn} onPressOut={lock.onPressOut}>
            <Animated.View style={[styles.lock, lock.style]}>
              <Text style={styles.lockTitle}>{w.locked.title}</Text>
              <Text style={styles.lockLine}>{w.locked.line}</Text>
              <Text style={styles.lockCta}>{w.locked.cta}</Text>
            </Animated.View>
          </Pressable>
        ) : null}
        {error && error !== 'pro_required' ? (
          <Text style={styles.note}>{error === 'not_your_win' ? w.notYours : error === 'not_shareable' ? w.notShareable : w.error}</Text>
        ) : null}
        {failed ? <Text style={styles.note}>{w.failed}</Text> : null}
        {card ? (
          <Pressable accessibilityRole="button" disabled={busy || !my.avatar} onPress={() => void go()} onPressIn={send.onPressIn} onPressOut={send.onPressOut}>
            <Animated.View style={[styles.cta, busy && styles.ctaBusy, send.style]}>
              <Text style={styles.ctaText}>{busy ? w.making : w.send}</Text>
            </Animated.View>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 18 },
  // 44pt to tap; the negative margin keeps the layout of the 32pt line it was
  backHit: { alignSelf: 'flex-start', minHeight: 44, marginVertical: -6, justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
  head: { gap: 8 },
  title: { ...text.title, color: colors.paper },
  sub: { ...text.subtitle, color: colors.mist },
  loading: { marginTop: 40 },
  cardBox: { alignItems: 'center' },
  // the Pro lock: a raised ink card, never blue (the screen's one blue is the send button, absent here)
  lock: { padding: 18, borderRadius: 22, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkLine, gap: 8 },
  lockTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 26, color: colors.paper },
  lockLine: { ...text.meta, color: colors.mist },
  lockCta: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, marginTop: 4 },
  note: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.paper, textAlign: 'center' },
  cta: { minHeight: 54, marginTop: 'auto', borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
