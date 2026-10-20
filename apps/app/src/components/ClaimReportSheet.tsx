import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCopy } from '../i18n';
import { useClaimReport } from '../lib/data';
import { alpha, colors, ease, fonts } from '../theme';
import { Primary } from './OnboardingControls';

const IN_MS = 550;
const OUT_MS = 400;
/** the server keeps a note up to 200 characters (api.report_claim) */
const NOTE_MAX = 200;

/**
 * «Δεν είμαι εγώ;» (founder, 20 Oct 2026): on a profile an account holds, anyone else can say the account may not be
 * that person. One confirm step with an optional short note, then «Το είδαμε. Θα το ελέγξουμε.»; staff check it with
 * both accounts in front of them. Built like SafetySheet. `onClose` gets the toast to show.
 * `own`: «Δεν είμαι εγώ» on your own player (the wrong one was approved); staff unlink it and you find the right one.
 */
export function ClaimReportSheet({ playerId, own = false, onClose }: { playerId: string | null; own?: boolean; onClose: (toast?: string) => void }) {
  const t = useCopy();
  const s = t.safety;
  const words = own ? s.claimOwn : s.claim;
  const report = useClaimReport(own ? 'not_me_own' : 'not_them');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const p = useSharedValue(0);
  useEffect(() => {
    if (playerId) {
      setNote('');
      p.value = withTiming(1, { duration: IN_MS, easing: ease });
    }
  }, [playerId, p]);
  const close = (toast?: string) => {
    p.value = withTiming(0, { duration: OUT_MS, easing: ease });
    setTimeout(() => onClose(toast), OUT_MS);
  };
  const back = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 480 }] }));

  const send = async () => {
    if (!playerId) return;
    setBusy(true);
    const ok = await report(playerId, note);
    setBusy(false);
    close(ok ? words.sent : s.failed);
  };

  return (
    <Modal visible={playerId !== null} transparent animationType="none" onRequestClose={() => close()}>
      <Animated.View style={[styles.back, back]}>
        <Pressable accessibilityLabel={s.cancel} style={styles.fill} onPress={() => close()} />
        <Animated.View style={[styles.sheet, sheet]}>
          <Text style={styles.title}>{words.title}</Text>
          <Text style={styles.sub}>{words.sub}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={s.claim.note}
            placeholderTextColor={colors.inkSoft}
            maxLength={NOTE_MAX}
            multiline
            style={styles.note}
          />
          <Primary label={s.send} busy={busy} onPress={send} />
          <Pressable accessibilityRole="button" onPress={() => close()} style={styles.linkHit}>
            <Text style={styles.link}>{s.cancel}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { flex: 1, backgroundColor: alpha(colors.ink, 0.55), justifyContent: 'flex-end' },
  sheet: {
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.paper,
    gap: 12,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  title: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 42, paddingBottom: 8, marginBottom: -8, color: colors.ink, paddingTop: 6, marginTop: -6 },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  note: {
    minHeight: 72,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.fog,
    backgroundColor: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  linkHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
