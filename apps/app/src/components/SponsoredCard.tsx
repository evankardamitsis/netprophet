import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { greekCaps } from '@netprophet/copy';
import type { CardSponsored } from '../lib/feed';
import { useCopy } from '../i18n';
import { usePress } from '../lib/motion';
import { cardSurface, colors, fonts, radii } from '../theme';
import { AdArt, isAdArt } from './AdArt';

const ART_H = 150;

/** The ad as a banner: a picture (or drawn art) on top, «ΧΟΡΗΓΟΥΜΕΝΟ · name», title, subtitle, a quiet link. */
export function SponsoredCard({ card }: { card: CardSponsored }) {
  const t = useCopy();
  const press = usePress(0.97);
  const url = card.ctaUrl;
  const open = () => {
    if (url) void Linking.openURL(url).catch(() => undefined);
  };
  const body = (
    <View style={styles.card}>
      <View style={styles.art}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.image} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : isAdArt(card.art) ? (
          <AdArt art={card.art} height={ART_H} />
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{`${greekCaps(card.label)} · ${card.sponsor}`}</Text>
        <Text style={styles.title}>{card.title}</Text>
        {card.subtitle ? <Text style={styles.sub}>{card.subtitle}</Text> : null}
        {url ? <Text style={styles.link}>{t.feed.sponsoredMore}</Text> : null}
      </View>
    </View>
  );
  if (!url) return body;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${card.title}. ${t.feed.sponsoredMore}`} onPress={open} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={press.style}>{body}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, backgroundColor: cardSurface, borderWidth: 1, borderColor: colors.mist, overflow: 'hidden' },
  art: { height: ART_H, backgroundColor: colors.ink },
  image: { width: '100%', height: ART_H },
  body: { padding: 16, gap: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.52, color: colors.inkSoft },
  title: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19.5, color: colors.ink, marginTop: 6 },
});
