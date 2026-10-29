import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import { track } from '../lib/analytics';
import { useApi } from '../lib/data';
import { useFadeUpIn, usePress, useSlamIn, useStgIn } from '../lib/motion';
import { askForPush, pushAllowed } from '../lib/push';
import { fmt } from '../lib/votes';
import { colors, fonts } from '../theme';

/**
 * After «Καλώς ήρθες στο Pro» (founder, 29 Oct): a short guide to what opened, one thing per screen, and where to find
 * it. A lime ✓ (it is yours now), the title, one line on what it does, one on where it lives, one blue button. The
 * first step's button turns the notifications on, since the draw and the time arrive that way. «Παράλειψη» ends it.
 */
const STEPS = ['notify', 'rival', 'stats', 'more'] as const;
type Step = (typeof STEPS)[number];
const STAGGER_MS = 70;

export function ProTour({ onDone }: { onDone: () => void }) {
  const t = useCopy();
  const p = t.pro.tour;
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [at, setAt] = useState(0);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const step: Step = STEPS[at] ?? STEPS[0];
  const last = at === STEPS.length - 1;

  useEffect(() => {
    void pushAllowed().then(setAllowed);
  }, []);
  useEffect(() => {
    track('pro_tour', { step: at + 1, action: 'view' });
  }, [at]);

  const next = () => {
    if (last) {
      track('pro_tour', { step: at + 1, action: 'done' });
      onDone();
    } else setAt(at + 1);
  };
  const skip = () => {
    track('pro_tour', { step: at + 1, action: 'skip' });
    onDone();
  };
  const allow = async () => {
    if (!api || asking) return next();
    setAsking(true);
    const ok = await askForPush(api);
    setAsking(false);
    setAllowed(ok);
    next();
  };

  // the first step asks for notifications unless they are on already
  const asks = step === 'notify' && allowed === false && api !== null;
  const label = asks ? p.notify.allow : last ? p.done : p.next;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }]} accessibilityViewIsModal>
      <View style={styles.top}>
        <View style={styles.backSlot}>
          {at > 0 ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setAt(at - 1)}>
              <Text style={styles.skip}>{`‹ ${t.common.back}`}</Text>
            </Pressable>
          ) : null}
        </View>
        <Dots at={at} />
        <Pressable accessibilityRole="button" hitSlop={10} onPress={skip} style={styles.skipSlot}>
          <Text style={styles.skip}>{p.skip}</Text>
        </Pressable>
      </View>

      {/* the key replays the entrance on every step */}
      <Page key={step} step={step} allowed={allowed === true} />

      <View style={styles.bottom}>
        <Primary label={label} busy={asking} onPress={() => void (asks ? allow() : next())} />
        {asks ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={next} style={styles.laterHit}>
            <Text style={styles.later}>{p.notify.later}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.count}>{fmt(p.step, { n: String(at + 1), of: String(STEPS.length) })}</Text>
      </View>
    </View>
  );
}

function Page({ step, allowed }: { step: Step; allowed: boolean }) {
  const t = useCopy();
  const p = t.pro.tour;
  const mark = useSlamIn(600, 80);
  const title = useFadeUpIn(700, 160, 14);
  const body = useFadeUpIn(700, 160 + STAGGER_MS * 2, 12);
  const where = useFadeUpIn(700, 160 + STAGGER_MS * 4, 12);
  const s = step === 'more' ? null : p[step];
  return (
    <View style={styles.middle}>
      <Animated.Text style={[styles.mark, mark]}>✓</Animated.Text>
      <Animated.Text style={[styles.title, title]} accessibilityRole="header">
        {step === 'more' ? p.more.title : s!.title}
      </Animated.Text>
      {step === 'more' ? (
        <View style={styles.items}>
          {p.more.items.map((item, i) => (
            <Item key={item} text={item} delay={160 + STAGGER_MS * (2 + i * 2)} />
          ))}
        </View>
      ) : (
        <>
          <Animated.Text style={[styles.body, body]}>{s!.body}</Animated.Text>
          <Animated.Text style={[styles.where, where]}>
            {step === 'notify' && allowed ? p.notify.on : s!.where}
          </Animated.Text>
        </>
      )}
    </View>
  );
}

function Item({ text, delay }: { text: string; delay: number }) {
  const enter = useStgIn(600, delay);
  return (
    <Animated.View style={[styles.item, enter]}>
      <Text style={styles.itemMark}>✓</Text>
      <Text style={styles.itemText}>{text}</Text>
    </Animated.View>
  );
}

function Dots({ at }: { at: number }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {STEPS.map((s, i) => (
        <View key={s} style={[styles.dot, i === at && styles.dotOn, i < at && styles.dotDone]} />
      ))}
    </View>
  );
}

function Primary({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy }} onPress={busy ? undefined : onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.cta, press.style, busy && styles.ctaBusy]}>
        <Text style={styles.ctaText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // covers the Pro screen underneath, like the welcome before it
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, paddingHorizontal: 20, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  backSlot: { width: 80 },
  skipSlot: { width: 80, alignItems: 'flex-end' },
  skip: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.inkLine },
  dotOn: { width: 22, backgroundColor: colors.paper },
  dotDone: { backgroundColor: colors.mist },
  middle: { flex: 1, justifyContent: 'center', gap: 14 },
  mark: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 64, color: colors.lime },
  title: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, color: colors.paper },
  body: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24, color: colors.paper },
  where: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.mist },
  items: { gap: 12, marginTop: 4 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  itemMark: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, color: colors.lime },
  itemText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24, color: colors.paper },
  bottom: { gap: 10 },
  cta: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.blue },
  ctaBusy: { opacity: 0.6 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  laterHit: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  later: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist, textDecorationLine: 'underline' },
  count: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist, textAlign: 'center' },
});
