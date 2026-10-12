import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { FormDot, PlayerRow } from '../lib/players';
import { usePopIn, usePress, useStgIn } from '../lib/motion';
import { FitText } from './FitText';
import { colors, fonts } from '../theme';

/**
 * One player in Παίκτες (prototype V2, plist row): initials, full name, «level 5 · Γλυφάδα · φίλος»
 * and the last five results as dots. Tapping opens the profile.
 */
const ROW_MS = 400;
const DOT_MS = 350;

export function PlayerListRow({ row, index, onPress }: { row: PlayerRow; index: number; onPress: () => void }) {
  // prototype ms(i, 80): 40, 90, 140 ... ms
  const enter = useStgIn(ROW_MS, 40 + index * 50);
  const press = usePress();
  return (
    <Animated.View style={enter}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.name}, ${row.sub}`}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[styles.row, press.style]}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{row.initials}</Text>
          </View>
          <View style={styles.text}>
            <FitText text={row.name} style={styles.name} />
            {row.sub ? (
              <Text style={styles.sub} numberOfLines={1}>
                {row.sub}
              </Text>
            ) : null}
          </View>
          <FormDots form={row.form} on={colors.ink} off={colors.stone} size={10} gap={4} baseDelay={200} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Last five results, oldest first: a full dot for a win, a pale one for a loss (colour only, as in the prototype). */
export function FormDots(props: { form: FormDot[]; on: string; off: string; size: number; gap: number; baseDelay: number }) {
  return (
    <View style={[styles.dots, { gap: props.gap }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {props.form.map((f, i) => (
        <Dot key={i} color={f === 'W' ? props.on : props.off} size={props.size} delay={props.baseDelay + i * 50} />
      ))}
    </View>
  );
}

function Dot({ color, size, delay }: { color: string; size: number; delay: number }) {
  const pop = usePopIn(DOT_MS, delay);
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, pop]} />;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.lime },
  text: { flex: 1, minWidth: 0, gap: 2 },
  // line height at least the font size: iOS clips the tonos above the line box
  name: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  dots: { flexDirection: 'row' },
});
