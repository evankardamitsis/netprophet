import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { requestScrollTop } from '../lib/scrollTop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import { useMyBaller, type MeSummary } from '../lib/data';
import { useHudActions, useHudNumbers, type StreakFx } from '../lib/hud';
import { useCountUp, usePopOnChange, usePress } from '../lib/motion';
import { useTourTarget } from '../lib/tour';
import { alpha, colors, ease, fonts, motion } from '../theme';
import { BALLS, Ball, BouncingLogo, Shade, type BallKind } from './BouncingLogo';
import { Baller, type BallerHandle } from './Baller';

/** the account disc and the sport ball at its corner */
const AVATAR = 34;
const BADGE = 14;
/** the «PRO» tag's height over the disc */
const PRO_TAG_H = 12;
/** the lockup's height; its ball hops over the net every few seconds (as on sign-in) */
const LOGO_H = 22;

/**
 * Prototype V2 app header: logo left; σερί and πόντοι (open «Οι προβλέψεις σου») and the avatar (opens Εγώ) right. σερί is a lime pill (as on
 * Εγώ), πόντοι a plain lime number (founder, 12 Oct: no moving shine, and σερί must not look like πόντοι).
 * `me` comes from the tabs layout, so all tabs share one get_me call. Null while loading.
 * While result cards are waiting to play, the numbers are the ones from before them (see lib/hud).
 */
export function Header({ me }: { me: MeSummary | null }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const hud = useHudNumbers();
  const { targets } = useHudActions();
  const points = me ? me.points - hud.pointsOffset : undefined;
  const streak = me ? hud.streakShown ?? me.streak : undefined;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <BouncingLogo height={LOGO_H} />
      <View style={styles.right}>
        <Stat value={streak} label={t.streak.label} onPress={goNumbers} target={targets.streak} fx={hud.streakFx} pill />
        <Stat value={points} label={t.header.points} onPress={goNumbers} target={targets.points} countUp />
        <Avatar initials={me?.initials ?? ''} sport={me?.sport ?? 'tennis'} points={points} pro={me?.pro === true} />
      </View>
    </View>
  );
}

/** the avatar opens Εγώ; σερί and πόντοι open «Οι προβλέψεις σου», where both are told in full */
const goNumbers = () => router.push('/me?page=stats');

function Stat({
  value,
  label,
  onPress,
  target,
  pill = false,
  countUp = false,
  fx = null,
}: {
  value: number | undefined;
  label: string;
  onPress?: () => void;
  /** measured by result cards as the place their «+10» flies to */
  target: RefObject<View | null>;
  /** σερί: ink number and label side by side in a lime pill */
  pill?: boolean;
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
        {pill ? (
          <Animated.View style={[styles.pill, pop]}>
            <Text style={styles.pillNum}>{shown ?? ' '}</Text>
            <Text style={styles.pillLabel}>{label}</Text>
          </Animated.View>
        ) : (
          <>
            <Animated.Text style={[styles.num, styles.lime, pop]}>{shown ?? ' '}</Animated.Text>
            <Text style={styles.label}>{label}</Text>
          </>
        )}
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
    borderRadius: 999,
    borderWidth: 3 + 9 * frost.value,
    borderColor: alpha(colors.paper, 0.35 * ring.value + 0.2 * frost.value),
    opacity: ring.value > 0 ? 1 : 0,
  }));
  return { box, ring: ringStyle };
}

/**
 * The account button (founder, 14 Oct: "if no initials there noone knows its the account"): your Baller on a paper
 * disc (founder, 17 Oct: Baller lives in the top bar), your initials until it loads, with your sport's ball as a small
 * crisp badge at its corner, so it reads as you and as your game. Baller hops when points land. With Pro a tiny «PRO»
 * sits on the disc's top edge (founder, 20 Oct), cut out in ink like the ball, inside the 44pt hit box so nothing moves.
 */
function Avatar({ initials, sport, points, pro }: { initials: string; sport: string; points: number | undefined; pro: boolean }) {
  const t = useCopy();
  const kind: BallKind = (BALLS as string[]).includes(sport) ? (sport as BallKind) : 'tennis';
  const press = usePress();
  const me = useMyBaller();
  const baller = useRef<BallerHandle>(null);
  const last = useRef(points);
  useEffect(() => {
    if (points !== undefined && last.current !== undefined && points > last.current) baller.current?.play('hop');
    last.current = points;
  }, [points]);
  // the first-visit tour's last step lights the avatar («Εσύ»)
  const [front, setFront] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFront(true);
      return () => setFront(false);
    }, []),
  );
  const tourRef = useTourTarget('avatar', front);
  // on Εγώ already, the avatar is its tab: a tap scrolls back to the top (founder, 21 Oct)
  const path = usePathname();
  const goMe = () => (path === '/me' ? requestScrollTop('me') : router.push('/me'));
  return (
    <Pressable
      ref={tourRef}
      accessibilityRole="button"
      accessibilityLabel={pro ? `${t.tabs.me}. ${t.pro.title}` : t.tabs.me}
      onPress={goMe}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={styles.avatarHit}
    >
      <Animated.View style={[styles.avatar, press.style]}>
        {me.look ? (
          <View style={styles.ballerDisc}>
            <Baller ref={baller} look={me.look} size={AVATAR + 6} kit={me.kit} gear={me.gear} />
          </View>
        ) : (
          <Text style={styles.initials} numberOfLines={1}>
            {initials}
          </Text>
        )}
        <View style={styles.badge}>
          <View style={styles.badgeBall}>
            <Ball kind={kind} size={BADGE} />
            <Shade size={BADGE} strength={0.55} />
          </View>
        </View>
        {pro ? (
          <View style={styles.proTag} pointerEvents="none">
            <Text style={styles.proTagText}>{t.pro.badge}</Text>
          </View>
        ) : null}
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
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stat: { minHeight: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 0 },
  // line heights at least the font size: iOS clips glyphs that rise above the line box (web lets them spill)
  num: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6 },
  lime: { color: colors.lime },
  // prototype σερί pill (Εγώ): lime, ink number in the display face, «σερί» bold beside it on the baseline
  pill: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingTop: 3, paddingBottom: 5, paddingLeft: 10, paddingRight: 12, borderRadius: 999, backgroundColor: colors.lime },
  pillNum: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  pillLabel: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.33, color: colors.mist },
  avatarHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ballerDisc: { width: AVATAR, height: AVATAR, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 999,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.displayHeavy, fontSize: 16, lineHeight: 19, letterSpacing: 0.2, color: colors.ink, marginRight: 2, marginBottom: 1 },
  // an ink ring cuts the ball out of the disc, so both edges stay sharp
  badge: {
    position: 'absolute',
    right: -7,
    bottom: -6,
    width: BADGE + 4,
    height: BADGE + 4,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBall: { width: BADGE, height: BADGE },
  // «PRO» on the disc's top edge: ink cut-out, lime letters (Pro's colours across the app), centred over the avatar
  proTag: {
    position: 'absolute',
    top: -PRO_TAG_H / 2 - 1,
    alignSelf: 'center',
    height: PRO_TAG_H,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTagText: { fontFamily: fonts.bodyBold, fontSize: 8, lineHeight: 10, letterSpacing: 0.6, color: colors.lime },
});
