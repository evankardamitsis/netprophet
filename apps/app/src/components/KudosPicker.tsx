import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useCopy } from '../i18n';
import { useStgIn } from '../lib/motion';
import { colors, fonts, text } from '../theme';
import { Chip } from './OnboardingControls';

/** the chosen line lifts (prototype jfly, 560ms) before the screen moves on */
const FLY_MS = 560;

/**
 * «Πες μια καλή κουβέντα» (prototype V2, isKudos): the question, five lines as chips that fill ink when picked,
 * «Άλλη φορά». Used after logging a played match and from «Πες κάτι στον …» on Αποτελέσματα.
 */
export function KudosPicker({
  question,
  options,
  onPick,
  onSkip,
}: {
  question: string;
  options: { key: string; text: string }[];
  onPick: (key: string, text: string) => void;
  onSkip: () => void;
}) {
  const t = useCopy();
  const [sel, setSel] = useState<string | null>(null);
  const title = useStgIn(700);
  const sub = useStgIn(450, 70);
  const pick = (key: string, text: string) => {
    if (sel) return;
    setSel(key);
    setTimeout(() => onPick(key, text), FLY_MS);
  };
  return (
    <View style={styles.wrap}>
      <Animated.Text style={[styles.title, title]}>{t.kudos.title}</Animated.Text>
      <Animated.Text style={[styles.sub, sub]}>{question}</Animated.Text>
      <View style={styles.list}>
        {options.map((o, i) => (
          <Line key={o.key} delay={140 + i * 70} dim={sel !== null && sel !== o.key}>
            <Chip on={sel === o.key} onPress={() => pick(o.key, o.text)} minHeight={60}>
              <Text style={[styles.line, { color: sel === o.key ? colors.paper : colors.ink }]}>{o.text}</Text>
            </Chip>
          </Line>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onSkip} style={styles.laterHit}>
        <Text style={styles.later}>{t.kudos.later}</Text>
      </Pressable>
    </View>
  );
}

function Line({ delay, dim, children }: { delay: number; dim: boolean; children: React.ReactNode }) {
  const enter = useStgIn(450, delay);
  return <Animated.View style={[styles.row, enter, dim && styles.dim]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  title: { ...text.title },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  list: { gap: 8 },
  row: { flexDirection: 'row' },
  dim: { opacity: 0.45 },
  line: { fontFamily: fonts.bodyBold, fontSize: 19, textAlign: 'center' },
  laterHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  later: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft, textDecorationLine: 'underline' },
});
