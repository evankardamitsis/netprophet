import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Chip, Segmented } from './OnboardingControls';
import { useCopy } from '../i18n';
import { usePlayStyle } from '../lib/data';
import { useStgIn } from '../lib/motion';
import { playLine, type Hand } from '../lib/onboarding';
import { colors, fonts } from '../theme';

/**
 * «Πώς παίζεις» in Εγώ › Ρυθμίσεις (founder, 19 Oct): the hand and tournament questions that left the first run.
 * The row shows what is set («Δεξιόχειρας · Ένα δυο, για την εμπειρία»); a tap opens the same choices onboarding
 * had, and every tap saves on its own, so there is no button (Εγώ keeps its one blue).
 */
export function PlayStyleRow({ onSaved }: { onSaved?: () => void }) {
  const t = useCopy();
  const p = t.onboarding.play;
  const style = usePlayStyle();
  const [open, setOpen] = useState(false);
  const save = async (patch: { hand?: Hand; tour?: string }) => {
    if (await style.save(patch)) onSaved?.();
  };
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.head}>
        <View style={styles.text}>
          <Text style={styles.title}>{p.row}</Text>
          <Text style={styles.sub}>{playLine(style.hand, style.tour, t)}</Text>
        </View>
        {style.saving ? <ActivityIndicator color={colors.ink} /> : <Text style={[styles.mark, open && styles.markOpen]}>+</Text>}
      </Pressable>
      {open ? <Editor hand={style.hand} tour={style.tour} onSave={save} failed={style.failed} /> : null}
    </View>
  );
}

function Editor({ hand, tour, onSave, failed }: { hand: Hand | null; tour: string | null; onSave: (patch: { hand?: Hand; tour?: string }) => void; failed: boolean }) {
  const t = useCopy();
  const p = t.onboarding.play;
  const enter = useStgIn(350, 0);
  return (
    <Animated.View style={[styles.editor, enter]}>
      <Text style={styles.label}>{p.hand}</Text>
      <Segmented
        options={[
          { id: 'R' as const, label: p.hands.R },
          { id: 'L' as const, label: p.hands.L },
        ]}
        value={hand}
        onChange={(h) => onSave({ hand: h })}
        bg={colors.paper}
      />
      <Text style={styles.label}>{p.tour}</Text>
      <View style={styles.stack}>
        {p.tours.map((x) => (
          <View key={x.id} style={styles.row}>
            <Chip on={tour === x.id} onPress={() => onSave({ tour: x.id })} minHeight={54} center={false} bg={colors.paper}>
              <Text style={[styles.chipName, { color: tour === x.id ? colors.paper : colors.ink }]}>{x.name}</Text>
              <Text style={[styles.chipSub, { color: tour === x.id ? colors.paper : colors.ink }]}>{x.sub}</Text>
            </Chip>
          </View>
        ))}
      </View>
      {failed ? <Text style={styles.failed}>{t.onboarding.failed}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, paddingVertical: 6 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  mark: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  markOpen: { transform: [{ rotate: '45deg' }] },
  editor: { gap: 10, paddingBottom: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  stack: { gap: 8 },
  row: { flexDirection: 'row' },
  chipName: { fontFamily: fonts.bodyBold, fontSize: 16 },
  chipSub: { fontFamily: fonts.bodySemi, fontSize: 12, opacity: 0.75 },
  failed: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
});
