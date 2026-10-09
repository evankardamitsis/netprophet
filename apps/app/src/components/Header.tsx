import { useEffect, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import type { MeSummary } from '../lib/data';
import { useHud, type StreakFx } from '../lib/hud';
import { useCountUp, usePopOnChange, usePress } from '../lib/motion';
import { alpha, colors, ease, fonts, motion } from '../theme';
import { Shine } from './Shine';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../assets/logo-on-ink.svg');
const LOGO_RATIO = 159 / 30;

/**
 * Prototype V2 app header: logo left; σερί, πόντοι and the avatar (opens Εγώ) right.
 * `me` comes from the tabs layout, so all tabs share one get_me call. Null while loading.
 * While result cards are waiting to play, the numbers are the ones from before them (see lib/hud).
 */
export function Header({ me }: { me: MeSummary | null }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const hud = useHud();
  const points = me ? me.points - hud.pointsOffset : undefined;
  const streak = me ? hud.streakShown ?? me.streak : undefined;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel="NetProphet" />
      <View style={styles.right}>
        <Stat value={streak} label={t.streak.label} onPress={goMe} target={hud.targets.streak} fx={hud.streakFx} />
        <Stat value={points} label={t.header.points} target={hud.targets.points} shine countUp />
        <Avatar initials={me?.initials ?? ''} />
      </View>
    </View>
  );
}

const goMe = () => router.push('/me');

function Stat({
  value,
  label,
  onPress,
  target,
  shine = false,
  countUp = false,
  fx = null,
}: {
  value: number | undefined;
  label: string;
  onPress?: () => void;
  /** measured by result cards as the place their «+10» flies to */
  target: RefObject<View | null>;
  /** πόντοι carry the prototype's moving shine */
  shine?: boolean;
  countUp?: boolean;
  fx?: StreakFx;
}) {
  const press = usePress();
  const counted = useCountUp(value);
  const shown = countUp ? counted : value;
  const pop = usePopOnChange(value, 500);
  const fxStyle = useStreakFx(fx);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value ?? ''} ${label}`}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View ref={target} collapsable={false} style={[styles.stat, press.style, fxStyle.box]}>
        <Animated.View style={fxStyle.ring} pointerEvents="none" />
        {shine && shown !== undefined ? (
          <Animated.View style={pop}>
            <Shine text={String(shown)} style={styles.num} />
          </Animated.View>
        ) : (
          <Animated.Text style={[styles.num, styles.lime, pop]}>{shown ?? ' '}</Animated.Text>
        )}
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * σερί effects (prototype rvfall / rvfrost): fall drops 10px and dims to .8 over 560ms and holds;
 * frost swells to 1.1 with a pale ring at 35% and settles over 700ms. Both clear when `fx` goes back to null.
 */
function useStreakFx(fx: StreakFx) {
  const fall = useSharedValue(0);
  const frost = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (fx === 'fall') {
      fall.value = withTiming(1, { duration: motion.revealDurShort, easing: ease });
    } else if (fx === 'frost') {
      frost.value = withSequence(
        withTiming(1, { duration: motion.revealDur * 0.35, easing: ease }),
        withTiming(0, { duration: motion.revealDur * 0.65, easing: ease }),
      );
      ring.value = withSequence(
        withTiming(1, { duration: motion.revealDur * 0.35, easing: ease }),
        withTiming(0.5, { duration: motion.revealDur * 0.65, easing: ease }),
      );
    } else {
      fall.value = 0;
      frost.value = 0;
      ring.value = 0;
    }
  }, [fx, fall, frost, ring]);
  const box = useAnimatedStyle(() => ({
    opacity: 1 - 0.2 * fall.value,
    transform: [{ translateY: 10 * fall.value }, { scale: 1 + 0.1 * frost.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: -4,
    bottom: -4,
    left: -4,
    right: -4,
    borderRadius: 14,
    borderWidth: 3 + 9 * frost.value,
    borderColor: alpha(colors.paper, 0.35 * ring.value + 0.2 * frost.value),
    opacity: ring.value > 0 ? 1 : 0,
  }));
  return { box, ring: ringStyle };
}

function Avatar({ initials }: { initials: string }) {
  const press = usePress();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={initials || 'Εγώ'}
      onPress={goMe}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={styles.avatarHit}
    >
      <Animated.View style={[styles.avatar, press.style]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logo: { height: 20, width: 20 * LOGO_RATIO },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stat: { minHeight: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 1 },
  num: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 27 },
  lime: { color: colors.lime },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 11, letterSpacing: 0.33, color: colors.mist },
  avatarHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.paper, fontFamily: fonts.bodyBold, fontSize: 13 },
});
