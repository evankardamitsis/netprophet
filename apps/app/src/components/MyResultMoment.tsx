import { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { MyResultCelebration } from '@netprophet/db';
import { useCopy } from '../i18n';
import { useMyBaller } from '../lib/data';
import { useFadeUpIn, useSlamIn } from '../lib/motion';
import { myResultView } from '../lib/myResult';
import { colors, fonts, motion } from '../theme';
import { Baller, type BallerHandle } from './Baller';
import { Burst } from './Celebration';

const BALLER = 150;
/** a win takes the full celebration; a loss is said and lets you go */
const LOSS_CTA_AT = 1500;

/**
 * A Pro player's own result, on the first open after it came in (founder, 4 Nov 2026). A win: lime glow, confetti, Baller
 * jumps. A loss: plain ink, Baller sighs, no lime, nothing to celebrate. «Δες τα νούμερά σου» is the one blue.
 */
export function MyResultMoment({ items, onDone, onStats }: { items: MyResultCelebration[]; onDone: () => void; onStats: () => void }) {
  const t = useCopy();
  const v = myResultView(items, t);
  const { width, height } = useWindowDimensions();
  const me = useMyBaller();
  const baller = useRef<BallerHandle>(null);
  const ctaAt = v.win ? motion.celebration : LOSS_CTA_AT;
  const label = useFadeUpIn(500, 400, 16);
  const title = useSlamIn(600, 700);
  const facts = useFadeUpIn(600, v.win ? 1800 : 1000, 16);
  const cta = useFadeUpIn(500, ctaAt, 16);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      (v.win
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      ).catch(() => undefined);
    }
    const ids = (v.win ? [900, 2100] : [800]).map((at) => setTimeout(() => baller.current?.play(v.win ? 'jump' : 'sighQuiet'), at));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <View style={styles.screen} accessibilityViewIsModal accessibilityLabel={t.myResult.aria}>
        <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
          <Defs>
            <RadialGradient id="myGlow" cx="50%" cy="27%" rx="85%" ry="34%">
              <Stop offset="0" stopColor={colors.lime} stopOpacity={0.26} />
              <Stop offset="0.7" stopColor={colors.lime} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={colors.ink} />
          {v.win ? <Rect x="0" y="0" width={width} height={height} fill="url(#myGlow)" /> : null}
        </Svg>
        {v.win ? <Burst x={width / 2} y={height * 0.42} /> : null}
        <View style={styles.middle}>
          {me.look ? <Baller ref={baller} look={me.look} size={BALLER} kit={me.kit} gear={me.gear} frame={me.frame} effect={me.effect} enter="drop" /> : null}
          <Animated.Text style={[styles.label, { color: v.win ? colors.lime : colors.mist }, label]}>{v.label}</Animated.Text>
          <Animated.Text style={[styles.title, title]}>{v.title}</Animated.Text>
          <Animated.View style={[styles.facts, facts]}>
            {v.line ? <Text style={styles.line}>{v.line}</Text> : null}
            {v.facts.map((f) => (
              <Text key={f} style={[styles.fact, { color: v.win ? colors.lime : colors.paper }]}>
                {f}
              </Text>
            ))}
          </Animated.View>
        </View>
        <Animated.View style={[styles.bottom, cta]}>
          <Pressable accessibilityRole="button" onPress={onStats} style={styles.stats}>
            <Text style={styles.statsText}>{t.myResult.stats}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onDone}>
            <Text style={styles.done}>{t.common.continue}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, overflow: 'hidden', backgroundColor: colors.ink },
  middle: { alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, paddingBottom: 8, marginBottom: -8, color: colors.paper, textAlign: 'center' },
  facts: { alignItems: 'center', gap: 6, marginTop: 10 },
  line: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: colors.mist, textAlign: 'center' },
  fact: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 23, textAlign: 'center' },
  bottom: { alignItems: 'center', gap: 12, marginTop: 40 },
  stats: { minHeight: 52, paddingHorizontal: 36, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  statsText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.paper },
  done: { minHeight: 32, paddingTop: 6, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
});
