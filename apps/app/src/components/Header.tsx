import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import type { MeSummary } from '../lib/data';
import { usePopOnChange, usePress } from '../lib/motion';
import { Shine } from './Shine';
import { colors, fonts } from '../theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../assets/logo-on-ink.svg');
const LOGO_RATIO = 159 / 30;

/**
 * Prototype V2 app header: logo left; σερί, πόντοι and the avatar (opens Εγώ) right.
 * `me` comes from the tabs layout, so all tabs share one get_me call. Null while loading.
 */
export function Header({ me }: { me: MeSummary | null }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel="NetProphet" />
      <View style={styles.right}>
        <Stat value={me?.streak} label={t.streak.label} color={colors.lime} onPress={goMe} />
        <Stat value={me?.points} label={t.header.points} color={colors.lime} shine />
        <Avatar initials={me?.initials ?? ''} />
      </View>
    </View>
  );
}

const goMe = () => router.push('/me');

function Stat({
  value,
  label,
  color,
  onPress,
  shine = false,
}: {
  value: number | undefined;
  label: string;
  color: string;
  onPress?: () => void;
  /** πόντοι carry the prototype's moving shine */
  shine?: boolean;
}) {
  const press = usePress();
  const pop = usePopOnChange(value, 500);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value ?? ''} ${label}`}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[styles.stat, press.style]}>
        {shine && value !== undefined ? (
          <Animated.View style={pop}>
            <Shine text={String(value)} style={styles.num} />
          </Animated.View>
        ) : (
          <Animated.Text style={[styles.num, { color }, pop]}>{value ?? ' '}</Animated.Text>
        )}
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
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
