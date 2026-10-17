import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import type { ProOfferMoment } from '@netprophet/db';
import { useCopy } from '../i18n';
import { usePopIn, usePress } from '../lib/motion';
import { useOfferShown, useProOffer } from '../lib/purchase';
import { colors, fonts } from '../theme';

/**
 * The free week, offered where Pro helps right then (founder, 17 Oct): one quiet line, never a pop-up. The server
 * decides when it may show (not to Pro, not in the first three days, one a day); showing it counts toward that.
 */
export function ProNudge({ moment, onInk = false }: { moment: ProOfferMoment; onInk?: boolean }) {
  const t = useCopy();
  const { offer } = useProOffer();
  const shown = useOfferShown();
  const counted = useRef(false);
  const press = usePress();
  const pop = usePopIn(450, 300);
  const show = offer !== null && offer.can_offer && offer.trial_available && !offer.pro;
  useEffect(() => {
    if (show && !counted.current) {
      counted.current = true;
      shown(moment);
    }
  }, [show, moment, shown]);
  if (!show) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/pro?from=${moment}`)} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.box, onInk ? styles.boxInk : styles.boxPaper, press.style, pop]}>
        <Text style={[styles.text, onInk ? styles.textInk : styles.textPaper]}>{t.pro.nudge[moment]}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14 },
  boxPaper: { borderColor: colors.navLine, backgroundColor: colors.white },
  boxInk: { borderColor: colors.inkLine, backgroundColor: colors.inkDeep },
  text: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19 },
  textPaper: { color: colors.ink },
  textInk: { color: colors.paper },
});
