import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import { useMyBaller } from '../lib/data';
import { useFadeUpIn, usePress, useSlamIn, useStgIn } from '../lib/motion';
import { track } from '../lib/analytics';
import { fmt } from '../lib/votes';
import { colors, fonts, motion } from '../theme';
import { Baller, type BallerHandle } from './Baller';

/**
 * The full-screen welcome after buying Pro (founder): ink, your Baller dropping in, «Καλώς ήρθες στο Pro» slammed in
 * with Pro in lime (it is earned), the three outcomes ticked in lime one by one (70ms apart), the small «και» line,
 * the free week's end when the store trial is on, and at 3.5s the one blue «Συνέχεια».
 */
const BALLER = 120;
const OUTCOME_AT = 1100;
const STG_MS = 600;
const STAGGER_MS = 70;
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export function ProWelcome({ trialEnd, onDone }: { trialEnd: Date | null; onDone: () => void }) {
  const t = useCopy();
  const p = t.pro;
  const insets = useSafeAreaInsets();
  const me = useMyBaller();
  const baller = useRef<BallerHandle>(null);
  useEffect(() => {
    track('pro_welcome_viewed', { trial: trialEnd !== null });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const id = setTimeout(() => baller.current?.play('jump'), 700);
    return () => clearTimeout(id);
  }, [trialEnd]);
  const title = useSlamIn(600, 300);
  const also = useFadeUpIn(600, OUTCOME_AT + 3 * STAGGER_MS + 200, 12);
  const trial = useFadeUpIn(600, OUTCOME_AT + 3 * STAGGER_MS + 400, 12);
  const cta = useFadeUpIn(500, motion.celebration, 16);
  const press = usePress();
  // «Καλώς ήρθες στο Pro»: the last word, Pro, is the earned one
  const words = p.welcome.split(' ');
  const last = words.pop() ?? '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]} accessibilityViewIsModal>
      <View style={styles.middle}>
        {me.look ? <Baller ref={baller} look={me.look} size={BALLER} kit={me.kit} gear={me.gear} frame={me.frame} effect={me.effect} enter="drop" /> : null}
        <Animated.Text style={[styles.title, title]} accessibilityRole="header">
          {words.join(' ')} <Text style={styles.pro}>{last}</Text>
        </Animated.Text>
        <View style={styles.outcomes}>
          {p.outcomes.map((o, i) => (
            <Outcome key={o.title} title={o.title} sub={o.sub} delay={OUTCOME_AT + i * STAGGER_MS * 4} />
          ))}
        </View>
        <Animated.Text style={[styles.also, also]}>{p.also}</Animated.Text>
        {trialEnd ? (
          <Animated.Text style={[styles.trial, trial]}>{fmt(p.trialOn, { date: `${trialEnd.getDate()}/${trialEnd.getMonth() + 1}` })}</Animated.Text>
        ) : null}
      </View>
      <Animated.View style={cta}>
        <Pressable accessibilityRole="button" onPress={onDone} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
          <Animated.View style={[styles.cta, press.style]}>
            <Text style={styles.ctaText}>{t.common.continue}</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Outcome({ title, sub, delay }: { title: string; sub: string; delay: number }) {
  const enter = useStgIn(STG_MS, delay);
  return (
    <Animated.View style={[styles.outcome, enter]}>
      <Text style={styles.check}>✓</Text>
      <View style={styles.outcomeText}>
        <Text style={styles.outcomeTitle}>{title}</Text>
        <Text style={styles.outcomeSub}>{sub}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // covers the Pro screen underneath
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, paddingHorizontal: 20, justifyContent: 'space-between' },
  middle: { flex: 1, justifyContent: 'center', gap: 14 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, paddingBottom: 8, marginBottom: -8, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  pro: { color: colors.lime },
  outcomes: { gap: 10, marginTop: 4 },
  outcome: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  check: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, color: colors.lime },
  outcomeText: { flex: 1, gap: 2 },
  outcomeTitle: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 23, color: colors.paper },
  outcomeSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  also: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.mist },
  trial: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  cta: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.blue },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
});
