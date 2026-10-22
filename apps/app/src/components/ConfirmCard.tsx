import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ConfirmationAnswer, PendingConfirmation } from '@netprophet/db';
import { useCopy } from '../i18n';
import { usePopIn, usePress } from '../lib/motion';
import { who } from '../lib/link';
import { fmt } from '../lib/votes';
import { colors, fonts } from '../theme';

/**
 * «Έγινε έτσι;» as a compact row (mockup D, founder 22 Oct): a white row
 * on sand, «Γιάννης 2-1 Βαγγέλης · Έγινε έτσι;» on one line, who logged it under it, and two small actions. «Όχι
 * ακριβώς» opens the four scores and «Δεν έπαιξα εγώ» in place. Nothing here is blue.
 */
export function ConfirmRow({ item, onAnswer }: { item: PendingConfirmation; onAnswer: (a: ConfirmationAnswer) => void }) {
  const t = useCopy();
  const c = t.confirm;
  const [fixing, setFixing] = useState(false);
  const firsts = (side: number) =>
    (item.sides.find((s) => s.side === side)?.players ?? []).map((p) => p.first_name).join(' & ');
  const winner = firsts(item.winner_side);
  const loser = firsts(item.winner_side === 1 ? 2 : 1);
  const logger = item.logged_by?.first_name ? who({ first_name: item.logged_by.first_name, surname: item.logged_by.surname }, true) : '';
  const us = firsts(item.my_side);
  const them = firsts(item.my_side === 1 ? 2 : 1);
  const fixes: { label: string; fix: { winner: 'me' | 'them'; sets: '2-0' | '2-1' } }[] = [
    { label: `2-0 ${us}`, fix: { winner: 'me', sets: '2-0' } },
    { label: `2-1 ${us}`, fix: { winner: 'me', sets: '2-1' } },
    { label: `2-1 ${them}`, fix: { winner: 'them', sets: '2-1' } },
    { label: `2-0 ${them}`, fix: { winner: 'them', sets: '2-0' } },
  ];
  const line = [winner, item.score, loser].filter(Boolean).join(' ');
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.line} numberOfLines={2}>
        {line}
        <Text style={rowStyles.ask}>{` · ${fixing ? c.how : c.ask}`}</Text>
      </Text>
      {logger ? (
        <Text style={rowStyles.small} numberOfLines={1}>
          {fmt(item.format === 'singles' ? c.title : c.titleDoubles, { name: logger })}
        </Text>
      ) : null}
      {!fixing ? (
        <View style={rowStyles.actions}>
          <Chip label={c.yes} solid onPress={() => onAnswer({ answer: 'yes' })} />
          <Chip label={c.no} onPress={() => setFixing(true)} />
        </View>
      ) : (
        <>
          <View style={rowStyles.actionsWrap}>
            {fixes.map((f) => (
              <Chip key={f.label} label={f.label} onPress={() => onAnswer({ answer: 'fix', fix: f.fix })} />
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => onAnswer({ answer: 'not_me' })} style={rowStyles.linkHit}>
            <Text style={rowStyles.link}>{c.notMe}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function Chip({ label, onPress, solid = false }: { label: string; onPress: () => void; solid?: boolean }) {
  const press = usePress(0.95);
  const pop = usePopIn(300);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={4}>
      <Animated.View style={[rowStyles.chip, solid ? rowStyles.chipSolid : rowStyles.chipOutline, press.style, pop]}>
        <Text style={[rowStyles.chipText, { color: solid ? colors.paper : colors.ink }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: { padding: 12, borderRadius: 16, backgroundColor: colors.white, gap: 6 },
  line: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  ask: { fontFamily: fonts.bodySemi, color: colors.inkSoft },
  small: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chipSolid: { backgroundColor: colors.ink },
  chipOutline: { borderWidth: 1.5, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  linkHit: { minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
});
