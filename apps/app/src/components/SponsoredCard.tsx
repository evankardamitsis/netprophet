import { StyleSheet, Text, View } from 'react-native';
import { greekCaps } from '@netprophet/copy';
import type { CardSponsored } from '../lib/feed';
import { colors, fonts } from '../theme';

/** Labelled ad card, prototype V2 (every 4th card in the feed). */
export function SponsoredCard({ card }: { card: CardSponsored }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{greekCaps(card.label)}</Text>
      <Text style={styles.title}>{card.title}</Text>
      {card.subtitle ? <Text style={styles.sub}>{card.subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.sand, gap: 2 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.52, color: colors.inkSoft },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19.5, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
});
