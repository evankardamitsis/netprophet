import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../src/i18n';
import { usePro } from '../src/lib/data';
import { usePopIn, usePress, useRiseIn, useStgIn } from '../src/lib/motion';
import { track } from '../src/lib/analytics';
import { activeLine, priceLine, proPrice } from '../src/lib/pro';
import { colors, fonts } from '../src/theme';

/**
 * Pro (prototype V2, the pass sheet), opened from Εγώ and the Pro lock lines: what Pro gives, its price,
 * «Γίνε μέλος». Checkout is not live yet, so «Γίνε μέλος» puts you on the list («✓ Είσαι στη λίστα»); the web
 * checkout replaces it in its own PR. With Pro it says until when. One blue button.
 */
const STG_MS = 450;
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export default function ProScreen() {
  const t = useCopy();
  const p = t.pro;
  const insets = useSafeAreaInsets();
  const { state, join } = usePro();
  const [failed, setFailed] = useState(false);
  const moment = String(useLocalSearchParams<{ from?: string }>().from ?? 'direct');
  useEffect(() => track('pro_sheet_viewed', { moment }), [moment]);
  const titleIn = useRiseIn(550, 50);
  const priceIn = usePopIn(450, 250);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const active = state ? activeLine(state, t) : null;
  const listed = state?.waitlisted ?? false;

  const onJoin = async () => {
    setFailed(false);
    track('pro_cta_pressed', { price: proPrice(), moment });
    if (!(await join())) setFailed(true);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14 }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.Text style={[styles.title, titleIn]}>{p.title}</Animated.Text>
        <Animated.Text style={[styles.price, priceIn]}>{active ?? priceLine(t)}</Animated.Text>
        <View style={styles.rows}>
          {p.features.map((f, i) => (
            <Feature key={f} text={f} index={i} />
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        {listed && !active ? (
          <View style={styles.listed}>
            <Text style={styles.listedText}>{p.listed}</Text>
            <Text style={styles.note}>{p.listedNote}</Text>
          </View>
        ) : null}
        {failed ? <Text style={styles.note}>{p.failed}</Text> : null}
        {!active && !listed ? <Button label={p.join} onPress={onJoin} primary /> : null}
        <Button label={active || listed ? p.close : p.notNow} onPress={close} />
      </View>
    </View>
  );
}

function Feature({ text, index }: { text: string; index: number }) {
  const enter = useStgIn(STG_MS, 300 + index * 70);
  return (
    <Animated.View style={[styles.row, enter]}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.rowText}>{text}</Text>
    </Animated.View>
  );
}

function Button({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.button, primary ? styles.primary : styles.secondary, press.style]}>
        <Text style={[styles.buttonText, primary ? styles.primaryText : styles.secondaryText]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 20 },
  scroll: { gap: 12, paddingBottom: 12 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 56, paddingBottom: 11, marginBottom: -15, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  price: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 36, paddingBottom: 7, marginBottom: -7, color: colors.lime, alignSelf: 'flex-start', paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  rows: { gap: 8, marginTop: 6 },
  row: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.inkRaised,
    backgroundColor: colors.inkLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.lime },
  rowText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.paper },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.mist },
  actions: { gap: 8 },
  listed: { gap: 2, paddingBottom: 4 },
  listedText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.lime },
  button: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.blue },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 17, textAlign: 'center' },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.paper },
});
