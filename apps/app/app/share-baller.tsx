import { useRef, useState } from 'react';
import { PixelRatio, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { BallerCard, CARD_RATIO } from '../src/components/BallerCard';
import { useCopy } from '../src/i18n';
import { track } from '../src/lib/analytics';
import { cardStats, ownerLine, shareMessage } from '../src/lib/ballerShare';
import { useBaller, useLook, useMePage, useMyAvatar } from '../src/lib/data';
import { usePopIn, usePress } from '../src/lib/motion';
import { colors, fonts, text } from '../src/theme';

/** the picture that goes out: 1080 × 1350 pixels (view-shot sizes in points) */
const OUT_W = 1080;

/**
 * «Μοιράσου τον Baller σου», full screen from Εγώ: the share card as it will look, and «Στείλ’ τον» (the screen's one
 * blue) sends it as a picture through the phone's share sheet. On the web, where a picture cannot go, the words and
 * the link go instead. Your data comes from the hooks, never from the route (the route is a URL on the web).
 */
export default function ShareBallerScreen() {
  const t = useCopy();
  const s = t.baller.share;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 40, 360);
  const my = useMyAvatar();
  const look = useLook();
  const baller = useBaller();
  const { view } = useMePage();
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const back = usePress();
  const send = usePress();
  const pop = usePopIn(500, 120);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const eq = look.look?.equipped;
  const message = shareMessage(t, baller.name);

  const go = async () => {
    setBusy(true);
    setFailed(false);
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) await navigator.share({ text: message });
        else await navigator.clipboard.writeText(message);
        track('baller_shared', { via: 'text' });
      } else if (card.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile', width: OUT_W / PixelRatio.get(), height: (OUT_W * CARD_RATIO) / PixelRatio.get() });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: s.title });
        track('baller_shared', { via: 'image' });
      } else {
        await Share.share({ message });
        track('baller_shared', { via: 'text' });
      }
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
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.sub}>{s.sub}</Text>
        </View>
        <Animated.View style={[styles.cardBox, { minHeight: cardW * CARD_RATIO }, pop]}>
          {my.avatar && view ? (
            <BallerCard
              ref={card}
              width={cardW}
              look={my.avatar.look}
              kit={eq?.kit ?? 'kit_green'}
              gear={eq?.gear ?? null}
              frame={eq?.frame ?? null}
              bg={eq?.background ?? null}
              name={baller.name}
              owner={ownerLine(view.first, view.surname)}
              stats={cardStats(t, view)}
            />
          ) : null}
        </Animated.View>
        {failed ? <Text style={styles.failed}>{s.failed}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy || !my.avatar || !view} onPress={() => void go()} onPressIn={send.onPressIn} onPressOut={send.onPressOut}>
          <Animated.View style={[styles.cta, busy && styles.ctaBusy, send.style]}>
            <Text style={styles.ctaText}>{busy ? s.making : s.send}</Text>
          </Animated.View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 18 },
  backHit: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
  head: { gap: 8 },
  title: { ...text.title, color: colors.paper },
  sub: { ...text.subtitle, color: colors.mist },
  cardBox: { alignItems: 'center' },
  failed: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.paper, textAlign: 'center' },
  cta: { minHeight: 54, marginTop: 'auto', borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
