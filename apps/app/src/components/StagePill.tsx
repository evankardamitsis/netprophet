import { StyleSheet, Text, View } from 'react-native';
import { greekCaps } from '@netprophet/copy';
import { useCopy } from '../i18n';
import type { MatchStage } from '../lib/feed';
import { colors, text } from '../theme';

/** «ΗΜΙΤΕΛΙΚΟΣ», «ΤΕΛΙΚΟΣ» on a row (founder, 4 Nov 2026): ink, since it says what a match is, not what happened or what to do */
export function StagePill({ stage, onInk = false }: { stage: MatchStage; onInk?: boolean }) {
  const t = useCopy();
  return (
    <View style={[styles.pill, { backgroundColor: onInk ? colors.paper : colors.ink }]}>
      <Text style={[styles.text, { color: onInk ? colors.ink : colors.paper }]}>{greekCaps(t.match.rounds[stage])}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  text: { ...text.label, fontSize: 11, lineHeight: 14 },
});
