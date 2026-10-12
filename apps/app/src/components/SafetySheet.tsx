import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { nameGender, withArticleAccusative } from '@netprophet/copy';
import type { ReportReason } from '@netprophet/db';
import { useCopy } from '../i18n';
import { useSafety, type SafetyTarget } from '../lib/data';
import { fmt } from '../lib/votes';
import { alpha, colors, ease, fonts } from '../theme';
import { Chip, Primary } from './OnboardingControls';

const IN_MS = 550;
const OUT_MS = 400;

const REASONS: Record<SafetyTarget['kind'], ReportReason[]> = {
  match: ['wrong_result', 'never_played', 'offensive', 'other'],
  player: ['offensive', 'fake', 'other'],
};

/**
 * «Αναφορά» and «Μπλοκ» (App Store 1.2; the prototype has none, so this follows its share sheet): «Τι συμβαίνει;»
 * with the reasons as chips, an optional note, «Στείλ’ το». Below, «Μπλοκ τον Γιάννη» when there is a person
 * behind the match or player, with a confirm step. `onDone` gets the toast to show.
 */
export function SafetySheet({ target, onClose }: { target: SafetyTarget | null; onClose: (toast?: string) => void }) {
  const t = useCopy();
  const s = t.safety;
  const { who, report, block } = useSafety(target);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = useSharedValue(0);
  useEffect(() => {
    if (target) {
      setReason(null);
      setNote('');
      setConfirmBlock(false);
      p.value = withTiming(1, { duration: IN_MS, easing: ease });
    }
  }, [target, p]);
  const close = (toast?: string) => {
    p.value = withTiming(0, { duration: OUT_MS, easing: ease });
    setTimeout(() => onClose(toast), OUT_MS);
  };
  const back = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 480 }] }));

  const send = async () => {
    if (!reason) return;
    setBusy(true);
    const ok = await report(reason, note);
    setBusy(false);
    close(ok ? s.sent : s.failed);
  };
  const doBlock = async () => {
    setBusy(true);
    const ok = await block();
    setBusy(false);
    const female = nameGender(who?.first_name ?? '', who?.gender) === 'f';
    close(ok ? (female ? s.blockedF : s.blocked) : s.failed);
  };
  const to = who?.first_name ? withArticleAccusative(who.first_name, '', who.gender).trim() : '';

  return (
    <Modal visible={target !== null} transparent animationType="none" onRequestClose={() => close()}>
      <Animated.View style={[styles.back, back]}>
        <Pressable accessibilityLabel={s.cancel} style={styles.fill} onPress={() => close()} />
        <Animated.View style={[styles.sheet, sheet]}>
          {!confirmBlock ? (
            <>
              <Text style={styles.title}>{s.title}</Text>
              <View style={styles.reasons}>
                {(target ? REASONS[target.kind] : []).map((r) => (
                  <View key={r} style={styles.row}>
                    <Chip on={reason === r} onPress={() => setReason(r)} minHeight={50}>
                      {s.reasons[r]}
                    </Chip>
                  </View>
                ))}
              </View>
              {reason ? (
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={s.note}
                  placeholderTextColor={colors.inkSoft}
                  maxLength={500}
                  multiline
                  style={styles.note}
                />
              ) : null}
              <Primary label={s.send} ready={reason !== null} busy={busy} onPress={send} />
              {who && !who.blocked ? (
                <Pressable accessibilityRole="button" onPress={() => setConfirmBlock(true)} style={styles.linkHit}>
                  <Text style={styles.link}>{`${s.block} ${to}`}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => close()} style={styles.linkHit}>
                <Text style={styles.link}>{s.cancel}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{fmt(s.blockTitle, { to })}</Text>
              <Text style={styles.sub}>{s.blockSub}</Text>
              <Primary label={s.block} busy={busy} onPress={doBlock} />
              <Pressable accessibilityRole="button" onPress={() => setConfirmBlock(false)} style={styles.linkHit}>
                <Text style={styles.link}>{s.cancel}</Text>
              </Pressable>
            </>
          )}
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
  title: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 42, color: colors.ink, paddingTop: 6, marginTop: -6 },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  reasons: { gap: 8 },
  row: { flexDirection: 'row' },
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
