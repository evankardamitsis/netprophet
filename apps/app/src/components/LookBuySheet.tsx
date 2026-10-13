import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import type { BuySheet } from '../lib/look';
import { alpha, colors, ease, fonts, motion } from '../theme';

const OUT_MS = 400;

/**
 * «Αγόρασε · 1,99 €» opens this: what the item is and its price. Buying waits for the payment provider, so the
 * button says «Σύντομα», is off, and the sheet says so. Nothing pretends to sell.
 */
export function LookBuySheet({ sheet, onClose }: { sheet: BuySheet | null; onClose: () => void }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const open = sheet !== null;
  const p = useSharedValue(0);
  useEffect(() => {
    if (open) {
      p.value = 0;
      p.value = withSpring(1, motion.spring);
    }
  }, [open, p]);
  const close = () => {
    p.value = withTiming(0, { duration: OUT_MS, easing: ease });
    setTimeout(onClose, OUT_MS);
  };
  const back = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 420 }] }));
  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.back, back]}>
        <Pressable accessibilityLabel={t.look.close} style={styles.fill} onPress={close} />
        <Animated.View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }, body]}>
          <View style={styles.handle} />
          {sheet ? (
            <>
              <Text style={styles.title}>{sheet.title}</Text>
              <Text style={styles.price}>{sheet.price}</Text>
              <Text style={styles.line}>{sheet.line}</Text>
              <Text style={styles.note}>{sheet.note}</Text>
              <View accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.soon}>
                <Text style={styles.soonText}>{t.look.soon}</Text>
              </View>
              <Text style={styles.soonLine}>{t.look.soonLine}</Text>
              <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
                <Text style={styles.closeText}>{t.look.close}</Text>
              </Pressable>
            </>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { flex: 1, backgroundColor: alpha(colors.ink, 0.55), justifyContent: 'flex-end' },
  sheet: { paddingTop: 24, paddingHorizontal: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.ink, gap: 12, width: '100%', maxWidth: 520, alignSelf: 'center' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: colors.slate, marginTop: -12 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 38, color: colors.paper },
  price: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, color: colors.paper },
  line: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.paper },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.mist },
  soon: { minHeight: 52, borderRadius: 16, borderWidth: 2, borderColor: colors.slate, alignItems: 'center', justifyContent: 'center', opacity: 0.8 },
  soonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.mist },
  soonLine: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mist, textAlign: 'center' },
  close: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, textDecorationLine: 'underline' },
});
