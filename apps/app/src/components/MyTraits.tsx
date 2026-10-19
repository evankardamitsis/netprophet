import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { MyTraits as MyTraitsData } from '@netprophet/db';
import { useCopy } from '../i18n';
import { useStgIn } from '../lib/motion';
import { shareWidth, traitGender, traitLabel } from '../lib/traits';
import { alpha, colors, ease, fonts } from '../theme';

/** prototype `race`: the bars run in 700ms, 100ms apart */
const RACE_MS = 700;
const RACE_STEP = 100;

/**
 * «Πώς σε βλέπουν» on Εγώ (prototype V2): your top three phrases from people who played you, lime bars by share.
 * Free: the order and bars show, the counts are greyed out and «Πόσοι σε ψήφισαν για το καθένα; Pro» opens Pro.
 * Empty: dashed rows with a shimmer and the promise.
 */
export function MyTraits({ data, first, proOpen }: { data: MyTraitsData; first: string; proOpen: boolean }) {
  const t = useCopy();
  const k = t.traits.me;
  const gender = traitGender(data.gender, first);
  const empty = data.traits.length === 0;
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{greekCaps(k.title)}</Text>
        {data.pro ? (
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>{t.pro.title}</Text>
          </View>
        ) : null}
      </View>
      {empty ? (
        <Empty />
      ) : (
        <>
          {data.traits.map((row, i) => (
            <Row key={row.id} label={traitLabel(row, gender)} share={shareWidth(row.share)} count={data.pro ? row.count : null} index={i} />
          ))}
          {!data.pro && proOpen ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=traits')} style={styles.linkHit}>
              <Text style={styles.link}>
                {k.unlock} <Text style={styles.underline}>{k.unlockPro}</Text>
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.footer}>{k.footer}</Text>
        </>
      )}
    </View>
  );
}

function Row({ label, share, count, index }: { label: string; share: number; count: number | null; index: number }) {
  const enter = useStgIn(450, index * 70);
  const bar = useSharedValue(0);
  useEffect(() => {
    bar.value = withDelay(index * RACE_STEP, withTiming(share, { duration: RACE_MS, easing: ease }));
  }, [share, index, bar]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value}%` }));
  return (
    <Animated.View style={[styles.row, enter]}>
      <Animated.View style={[styles.bar, barStyle]} />
      <Text style={styles.label}>{label}</Text>
      {count === null ? (
        <View style={styles.locked} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Shimmer />
        </View>
      ) : (
        <Text style={styles.count}>{count}</Text>
      )}
    </Animated.View>
  );
}

/** a light sweep across a surface (prototype `.shim`) */
function Shimmer() {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * w * 2.4 }] }));
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      <Animated.View style={[styles.sweep, { width: Math.max(w * 0.6, 12) }, style]} />
    </View>
  );
}

function Empty() {
  const k = useCopy().traits.me;
  const title = useStgIn(450, 420);
  const sub = useStgIn(450, 480);
  return (
    <>
      {[100, 70, 45].map((pct, i) => (
        <Ghost key={pct} pct={pct} delay={120 + i * 100} />
      ))}
      <Animated.Text style={[styles.emptyTitle, title]}>{k.emptyTitle}</Animated.Text>
      <Animated.Text style={[styles.emptySub, sub]}>{k.emptySub}</Animated.Text>
    </>
  );
}

function Ghost({ pct, delay }: { pct: number; delay: number }) {
  const enter = useStgIn(450, delay);
  return (
    <Animated.View style={[styles.ghost, { width: `${pct}%` }, enter]}>
      <Shimmer />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.ink },
  proPill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  row: { minHeight: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.lime },
  label: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  count: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 30, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  // free players see the order, not the numbers: a grey pill where the number would be
  locked: { width: 34, height: 24, borderRadius: 8, overflow: 'hidden', backgroundColor: alpha(colors.ink, 0.18) },
  sweep: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: alpha(colors.white, 0.55) },
  linkHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  underline: { textDecorationLine: 'underline' },
  footer: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  ghost: { minHeight: 52, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.fog, overflow: 'hidden' },
  emptyTitle: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  emptySub: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
});
