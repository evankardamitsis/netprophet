import { useEffect, useState } from 'react';
import { Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useCopy } from '../i18n';
import { track } from '../lib/analytics';
import { useStgIn } from '../lib/motion';
import { alpha, colors, ease, fonts } from '../theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../assets/logo-on-ink.svg');
const LOGO_RATIO = 426.4 / 80;

type App = 'whatsapp' | 'viber' | 'sms' | 'other';
const APPS: { id: App; glyph: string }[] = [
  { id: 'whatsapp', glyph: 'W' },
  { id: 'viber', glyph: 'V' },
  { id: 'sms', glyph: 'M' },
  { id: 'other', glyph: '›' },
];
const IN_MS = 550;
const OUT_MS = 400;

/**
 * «Στείλ’ το απέναντι» (prototype V2 share sheet): the link preview (logo, host, «Ο Βαγγέλης Κ. δήλωσε ότι
 * παίξατε», «Έτσι έγινε; Πάτα να το κλείσουμε.»), four ways to send it, then «Δες τι βλέπει ο αντίπαλος ›».
 */
export function ShareSheet({
  open,
  title,
  host,
  message,
  links,
  onPeek,
  onClose,
  onSaid,
}: {
  open: boolean;
  title: string;
  host: string;
  /** the whole text that goes out, link(s) included */
  message: string;
  links: number;
  onPeek: () => void;
  onClose: () => void;
  /** a toast from the sheet («Το link αντιγράφηκε») */
  onSaid: (text: string) => void;
}) {
  const t = useCopy();
  const s = t.addMatch.share;
  const [via, setVia] = useState<App | null>(null);
  const p = useSharedValue(0);
  useEffect(() => {
    if (open) {
      setVia(null);
      p.value = withTiming(1, { duration: IN_MS, easing: ease });
    }
  }, [open, p]);
  const close = () => {
    p.value = withTiming(0, { duration: OUT_MS, easing: ease });
    setTimeout(onClose, OUT_MS);
  };
  const back = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 420 }] }));
  const preview = useStgIn(700, 200);

  const send = async (app: App) => {
    setVia(app);
    track('link_shared', { app, links });
    const text = encodeURIComponent(message);
    try {
      if (app === 'whatsapp') await Linking.openURL(Platform.OS === 'web' ? `https://wa.me/?text=${text}` : `whatsapp://send?text=${text}`);
      else if (app === 'viber') await Linking.openURL(`viber://forward?text=${text}`);
      else if (app === 'sms') await Linking.openURL(Platform.OS === 'ios' ? `sms:&body=${text}` : `sms:?body=${text}`);
      else if (Platform.OS !== 'web') await Share.share({ message });
      else if (typeof navigator !== 'undefined' && navigator.share) await navigator.share({ text: message });
      else {
        await navigator.clipboard.writeText(message);
        onSaid(s.copied);
      }
    } catch {
      // no such app here: the text goes to the clipboard on the web, the system sheet elsewhere
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message).catch(() => undefined);
        onSaid(s.copied);
      } else await Share.share({ message }).catch(() => undefined);
    }
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.back, back]}>
        <Pressable accessibilityLabel={s.close} style={styles.fill} onPress={close} />
        <Animated.View style={[styles.sheet, sheet]}>
          <Animated.View style={[styles.frame, preview]}>
            <View style={styles.bubble}>
              <View style={styles.brand}>
                <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel="NetProphet" />
              </View>
              <View style={styles.previewText}>
                <Text style={styles.host}>{host}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.body}>{s.body}</Text>
              </View>
            </View>
          </Animated.View>
          <View style={styles.apps}>
            {APPS.map((a, i) => (
              <AppButton key={a.id} glyph={a.glyph} label={s.apps[a.id]} on={via === a.id} delay={300 + i * 70} onPress={() => send(a.id)} />
            ))}
          </View>
          {via ? (
            <Pressable accessibilityRole="button" onPress={onPeek} style={styles.peekHit}>
              <Text style={styles.peek}>{s.peekAfter}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
            <Text style={styles.closeText}>{s.close}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function AppButton({ glyph, label, on, delay, onPress }: { glyph: string; label: string; on: boolean; delay: number; onPress: () => void }) {
  const enter = useStgIn(700, delay);
  return (
    <Animated.View style={[styles.app, enter]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.appHit}>
        <View style={[styles.circle, on && styles.circleOn]}>
          <Text style={styles.glyph}>{glyph}</Text>
        </View>
        <Text style={styles.appLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { flex: 1, backgroundColor: alpha(colors.ink, 0.55), justifyContent: 'flex-end' },
  sheet: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.paper, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  frame: { padding: 12, borderRadius: 20, backgroundColor: colors.navLine },
  bubble: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 5, backgroundColor: colors.white, overflow: 'hidden' },
  brand: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.ink },
  logo: { height: 20, width: 20 * LOGO_RATIO },
  previewText: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, gap: 3 },
  host: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  apps: { flexDirection: 'row', gap: 6 },
  app: { flex: 1 },
  appHit: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  circleOn: { borderWidth: 3, borderColor: colors.lime },
  glyph: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.white },
  appLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.ink },
  peekHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  peek: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  close: { minHeight: 44, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
