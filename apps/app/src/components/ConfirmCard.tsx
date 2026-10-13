import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ConfirmationAnswer, PendingConfirmation } from '@netprophet/db';
import { useCopy } from '../i18n';
import { usePopIn, usePress, useStgIn } from '../lib/motion';
import { who } from '../lib/link';
import { fmt } from '../lib/votes';
import { colors, fonts } from '../theme';

/**
 * «Έγινε έτσι;» in the feed (prototype V2, the opponent link's first step, isOpv s1): who logged it, the winner
 * big, the sets in lime, the other side, then «Έτσι έγινε» or «Όχι ακριβώς» → «Πώς έληξε;» with the four
 * scores, and «Δεν έπαιξα εγώ». The feed's blue is «+ Ματς», so these buttons are paper and outline.
 */
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export function ConfirmCard({ item, onAnswer }: { item: PendingConfirmation; onAnswer: (a: ConfirmationAnswer) => void }) {
  const t = useCopy();
  const c = t.confirm;
  const [fixing, setFixing] = useState(false);
  const enter = useStgIn(450, 50);
  const pop = usePopIn(450, 350);
  const firsts = (side: number) =>
    (item.sides.find((s) => s.side === side)?.players ?? []).map((p) => p.first_name).join(' & ');
  const winner = firsts(item.winner_side);
  const loser = firsts(item.winner_side === 1 ? 2 : 1);
  // «Ο Γιάννης Πράτσας», «Η Μαρία Καρρά» (founder, 12 Oct: with the article)
  const logger = item.logged_by?.first_name ? who({ first_name: item.logged_by.first_name, surname: item.logged_by.surname }, true) : '';
  const us = firsts(item.my_side);
  const them = firsts(item.my_side === 1 ? 2 : 1);
  const fixes: { label: string; fix: { winner: 'me' | 'them'; sets: '2-0' | '2-1' } }[] = [
    { label: `2-0 ${us}`, fix: { winner: 'me', sets: '2-0' } },
    { label: `2-1 ${us}`, fix: { winner: 'me', sets: '2-1' } },
    { label: `2-1 ${them}`, fix: { winner: 'them', sets: '2-1' } },
    { label: `2-0 ${them}`, fix: { winner: 'them', sets: '2-0' } },
  ];

  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.title}>{fmt(item.format === 'singles' ? c.title : c.titleDoubles, { name: logger })}</Text>
      <Text style={styles.big}>{winner}</Text>
      <Animated.Text style={[styles.score, pop]}>{item.score ?? ''}</Animated.Text>
      <Text style={styles.big}>{loser}</Text>
      <View style={styles.rule} />
      <Text style={styles.ask}>{fixing ? c.how : c.ask}</Text>
      {!fixing ? (
        <View style={styles.row}>
          <Button label={c.yes} solid onPress={() => onAnswer({ answer: 'yes' })} />
          <Button label={c.no} onPress={() => setFixing(true)} />
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {fixes.map((f) => (
              <View key={f.label} style={styles.half}>
                <Button label={f.label} onPress={() => onAnswer({ answer: 'fix', fix: f.fix })} />
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => onAnswer({ answer: 'not_me' })} style={styles.linkHit}>
            <Text style={styles.link}>{c.notMe}</Text>
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

function Button({ label, onPress, solid = false }: { label: string; onPress: () => void; solid?: boolean }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.fill}>
      <Animated.View style={[styles.button, solid ? styles.solid : styles.outline, press.style]}>
        <Text style={[styles.buttonText, { color: solid ? colors.ink : colors.paper }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 22, borderRadius: 28, backgroundColor: colors.ink, gap: 8 },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.mist },
  big: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, paddingBottom: 9, marginBottom: -9, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  score: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 52, paddingBottom: 10, marginBottom: -10, color: colors.lime, alignSelf: 'flex-start', paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  rule: { height: 1, backgroundColor: colors.inkLine, marginVertical: 4 },
  ask: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.paper },
  row: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { width: '48.5%', flexDirection: 'row' },
  fill: { flex: 1 },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  solid: { backgroundColor: colors.paper },
  outline: { borderWidth: 2, borderColor: colors.inkLine },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  linkHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mist, textDecorationLine: 'underline' },
});
