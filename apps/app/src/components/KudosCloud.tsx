import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { greekCaps, type NameGender } from '@netprophet/copy';
import type { ReceivedKudo } from '@netprophet/db';
import { useCopy } from '../i18n';
import { CLOUD_FIRST, kudosCloud, type CloudKudo } from '../lib/kudos';
import { useStgIn } from '../lib/motion';
import { colors, ease, fonts, springEase } from '../theme';

/** prototype meKudos: each bubble drops in 130ms after the last, then floats (3.2s to 4.7s, alternate) */
const DROP_MS = 1000;
const DROP_STEP = 130;
const FIRST_DROP = 200;

/**
 * «Τι λένε για σένα» on Εγώ (prototype V2): what opponents said, as bubbles sized by how often, the top one lime
 * when said more than once, «×4» beside each. Six until «Όλα». Empty: three ghost pills and the promise.
 */
export function KudosCloud({ list, gender }: { list: ReceivedKudo[]; gender: NameGender }) {
  const t = useCopy();
  const k = t.kudos.me;
  const [all, setAll] = useState(false);
  const shown = kudosCloud(list, gender, all);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{greekCaps(k.title)}</Text>
        {list.length > CLOUD_FIRST ? (
          <Pressable accessibilityRole="button" onPress={() => setAll((a) => !a)} style={styles.moreHit}>
            <Text style={styles.more}>{all ? k.less : k.all}</Text>
          </Pressable>
        ) : null}
      </View>
      {shown.length > 0 ? (
        <View style={styles.cloud}>
          {shown.map((c, i) => (
            <Bubble key={c.key} c={c} index={i} />
          ))}
        </View>
      ) : (
        <Empty />
      )}
    </View>
  );
}

function Bubble({ c, index }: { c: CloudKudo; index: number }) {
  const drop = useSharedValue(0);
  const float = useSharedValue(0);
  const squash = useSharedValue(1);
  useEffect(() => {
    const d0 = FIRST_DROP + index * DROP_STEP;
    drop.value = withDelay(d0, withTiming(1, { duration: DROP_MS * 0.6, easing: springEase }));
    const period = (3.2 + (index % 4) * 0.5) * 1000;
    float.value = withDelay(d0 + DROP_MS + 100, withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drop, float, index]);
  const style = useAnimatedStyle(() => ({
    opacity: drop.value,
    transform: [{ translateY: (1 - drop.value) * -24 + float.value * -3 }, { scale: squash.value }],
  }));
  // a tap squashes the bubble (prototype jsq)
  const tap = () => {
    squash.value = withSequence(withTiming(0.88, { duration: 120, easing: ease }), withTiming(1.06, { duration: 200, easing: springEase }), withTiming(1, { duration: 200, easing: springEase }));
  };
  const r = c.weight;
  return (
    <Pressable onPress={tap} accessibilityLabel={`${c.text} ×${c.n}`}>
      <Animated.View
        style={[
          styles.bubble,
          { minHeight: Math.round(36 + r * 12), paddingHorizontal: Math.round(13 + r * 7), backgroundColor: c.lead ? colors.lime : colors.paper },
          style,
        ]}
      >
        <Text style={[styles.text, { fontSize: Math.round(13 + r * 7) }]}>{c.text}</Text>
        <Text style={[styles.n, { fontSize: Math.round(18 + r * 8), lineHeight: Math.round(18 + r * 8) }]}>{`×${c.n}`}</Text>
      </Animated.View>
    </Pressable>
  );
}

function Empty() {
  const k = useCopy().kudos.me;
  const a = useStgIn(450, 150);
  const b = useStgIn(450, 260);
  const c = useStgIn(450, 370);
  const title = useStgIn(450, 450);
  const sub = useStgIn(450, 520);
  return (
    <View style={styles.empty}>
      <View style={styles.ghosts}>
        <Animated.View style={[styles.ghost, { width: 74 }, a]} />
        <Animated.View style={[styles.ghost, { width: 52 }, b]} />
        <Animated.View style={[styles.ghost, { width: 90 }, c]} />
      </View>
      <Animated.Text style={[styles.emptyTitle, title]}>{k.emptyTitle}</Animated.Text>
      <Animated.Text style={[styles.emptySub, sub]}>{k.emptySub}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 16, paddingHorizontal: 18, paddingBottom: 18, borderRadius: 24, backgroundColor: colors.white, gap: 12, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.blue },
  moreHit: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  more: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  cloud: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 6, paddingBottom: 4 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999 },
  text: { fontFamily: fonts.bodyBold, color: colors.ink },
  n: { fontFamily: fonts.displayHeavy, color: colors.ink },
  empty: { alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 6 },
  ghosts: { flexDirection: 'row', gap: 8 },
  ghost: { height: 34, borderRadius: 999, backgroundColor: colors.navLine },
  emptyTitle: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, paddingBottom: 6, marginBottom: -6, color: colors.ink, textAlign: 'center' },
  emptySub: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft, textAlign: 'center' },
});
