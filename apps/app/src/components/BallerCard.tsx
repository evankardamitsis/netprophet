import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { AvatarLook } from '../lib/avatar';
import { alpha, colors, fonts } from '../theme';
import { BallArt } from './Avatar';
import { CardBackground } from './CardBackground';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOCKUP = require('../../assets/logo-on-ink.svg');
/** the lockup's viewBox is 426.43 × 80 */
const LOCKUP_RATIO = 426.43 / 80;

/** 4:5, the shape a feed post and most chats show whole */
export const CARD_RATIO = 5 / 4;

/**
 * The Baller share card (Baller plan, PR 5): your Baller standing on its court in your background, its name, whose it
 * is, three numbers and the logo with the site. Drawn still (no bob, no blink) so the picture is the same every time;
 * the screen captures this view as a PNG.
 */
export const BallerCard = forwardRef<
  View,
  {
    width: number;
    look: AvatarLook;
    kit: string;
    gear: string | null;
    frame: string | null;
    bg: string | null;
    name: string | null;
    owner: string;
    stats: { value: string; label: string }[];
  }
>(function BallerCard({ width, look, kit, gear, frame, bg, name, owner, stats }, ref) {
  const height = Math.round(width * CARD_RATIO);
  const k = width / 320;
  const ball = Math.round(height * 0.42);
  const logoH = Math.round(20 * k);
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, borderRadius: 28 * k }]}>
      <CardBackground bg={bg} stage />
      <View style={[styles.top, { padding: 18 * k }]}>
        <Image source={LOCKUP} style={{ width: logoH * LOCKUP_RATIO, height: logoH }} contentFit="contain" />
      </View>
      <View style={[styles.ball, { paddingTop: 44 * k }]}>
        <BallArt look={look} size={ball} kit={kit} gear={gear} frame={frame} />
      </View>
      <View style={[{ paddingHorizontal: 18 * k, paddingBottom: 16 * k, gap: 10 * k }]}>
        <View style={styles.names}>
          <Text style={[styles.name, { fontSize: 40 * k, lineHeight: 46 * k }]} numberOfLines={1} adjustsFontSizeToFit>
            {name ?? 'Baller'}
          </Text>
          {owner ? <Text style={[styles.owner, { fontSize: 14 * k, lineHeight: 18 * k }]}>{owner}</Text> : null}
        </View>
        <View style={[styles.stats, { borderRadius: 18 * k, paddingVertical: 10 * k }]}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && styles.statLine]}>
              <Text style={[styles.statValue, { fontSize: 26 * k, lineHeight: 30 * k }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { fontSize: 11 * k, lineHeight: 14 * k }]} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.site, { fontSize: 12 * k, lineHeight: 16 * k }]}>netprophetapp.com</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: colors.ink },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row' },
  // Baller stands just above its name; the name and numbers sit at the foot
  ball: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  names: { alignItems: 'center' },
  // a soft ink shadow keeps the name readable on any background
  name: { fontFamily: fonts.displayHeavy, color: colors.paper, textAlign: 'center', textShadowColor: alpha(colors.ink, 0.6), textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  owner: { fontFamily: fonts.bodySemi, color: colors.mist },
  stats: { flexDirection: 'row', backgroundColor: alpha(colors.ink, 0.72), borderWidth: 1, borderColor: colors.inkLine },
  stat: { flex: 1, alignItems: 'center' },
  statLine: { borderLeftWidth: 1, borderLeftColor: colors.inkLine },
  // the numbers are what you earned: lime
  statValue: { fontFamily: fonts.displayHeavy, color: colors.lime },
  statLabel: { fontFamily: fonts.bodyBold, color: colors.mist },
  site: { fontFamily: fonts.bodyBold, color: colors.mist, textAlign: 'center' },
});
