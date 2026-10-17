import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { AvatarLook } from '../lib/avatar';
import type { SeasonStat, WinCardView } from '../lib/season';
import { alpha, colors, fonts } from '../theme';
import { BallArt } from './Avatar';
import { CARD_RATIO } from './BallerCard';
import { CardBackground } from './CardBackground';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOCKUP = require('../../assets/logo-on-ink.svg');
/** the lockup's viewBox is 426.43 × 80 */
const LOCKUP_RATIO = 426.43 / 80;

interface BallerLook {
  look: AvatarLook;
  kit: string;
  gear: string | null;
  frame: string | null;
  bg: string | null;
}

/** your Baller in the air: cheering, racket up, lifted off its shadow. Drawn still so every picture is the same. */
function JumpingBaller({ who, size, k }: { who: BallerLook; size: number; k: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ transform: [{ translateY: -18 * k }, { rotate: '-6deg' }] }}>
        <BallArt look={who.look} size={size} kit={who.kit} gear={who.gear} frame={who.frame} cheer raised />
      </View>
      <View style={[styles.shadow, { width: size * 0.36, height: 6 * k, marginTop: -10 * k }]} />
    </View>
  );
}

function Top({ k, right }: { k: number; right: string }) {
  const logoH = Math.round(20 * k);
  return (
    <View style={[styles.top, { padding: 18 * k }]}>
      <Image source={LOCKUP} style={{ width: logoH * LOCKUP_RATIO, height: logoH }} contentFit="contain" />
      <Text style={[styles.topRight, { fontSize: 12 * k, lineHeight: 16 * k }]}>{right}</Text>
    </View>
  );
}

/**
 * The win card (Pro «Η σεζόν σου»): 4:5, your Baller jumping on its court, «ΝΙΚΗ», the sets big in lime (won), whom
 * you beat, where, and the site. The screen captures this view as a 1080 × 1350 PNG.
 */
export const WinShareCard = forwardRef<View, BallerLook & { width: number; view: WinCardView }>(function WinShareCard({ width, view, ...who }, ref) {
  const height = Math.round(width * CARD_RATIO);
  const k = width / 320;
  const big = view.sets.length > 2 ? 44 : 54;
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, borderRadius: 28 * k }]}>
      <CardBackground bg={who.bg} stage />
      <Top k={k} right={view.date} />
      <View style={[styles.ball, { paddingTop: 40 * k }]}>
        <JumpingBaller who={who} size={Math.round(height * 0.34)} k={k} />
      </View>
      <View style={{ paddingHorizontal: 18 * k, paddingBottom: 16 * k, gap: 6 * k, alignItems: 'center' }}>
        <Text style={[styles.label, { fontSize: 13 * k, lineHeight: 17 * k, letterSpacing: 1.2 * k }]}>{view.label}</Text>
        <View style={[styles.sets, { gap: 14 * k }]}>
          {view.sets.map((s, i) => (
            <Text key={i} style={[styles.set, { fontSize: big * k, lineHeight: (big + 6) * k }]}>
              {s}
            </Text>
          ))}
        </View>
        <Text style={[styles.against, { fontSize: 18 * k, lineHeight: 23 * k }]} numberOfLines={2}>
          {view.against}
        </Text>
        <Text style={[styles.event, { fontSize: 12 * k, lineHeight: 16 * k }]} numberOfLines={1}>
          {view.event}
        </Text>
        <Text style={[styles.site, { fontSize: 12 * k, lineHeight: 16 * k, marginTop: 6 * k }]}>{view.owner ? `${view.owner} · netprophetapp.com` : 'netprophetapp.com'}</Text>
      </View>
    </View>
  );
});

/**
 * The season card: «Η σεζόν μου · Οκτώβριος», your Baller, the month's numbers (earned ones lime) and, with Pro, the best
 * win. Captured like the win card.
 */
export const SeasonShareCard = forwardRef<View, BallerLook & { width: number; title: string; stats: SeasonStat[]; bestWin: string | null }>(
  function SeasonShareCard({ width, title, stats, bestWin, ...who }, ref) {
    const height = Math.round(width * CARD_RATIO);
    const k = width / 320;
    return (
      <View ref={ref} collapsable={false} style={[styles.card, { width, height, borderRadius: 28 * k }]}>
        <CardBackground bg={who.bg} stage />
        <Top k={k} right="" />
        <View style={[styles.ball, { paddingTop: 44 * k }]}>
          <JumpingBaller who={who} size={Math.round(height * 0.3)} k={k} />
        </View>
        <View style={{ paddingHorizontal: 18 * k, paddingBottom: 16 * k, gap: 10 * k }}>
          <Text style={[styles.cardTitle, { fontSize: 26 * k, lineHeight: 32 * k }]} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
          <View style={[styles.stats, { borderRadius: 18 * k, paddingVertical: 10 * k }]}>
            {stats.map((s, i) => (
              <View key={s.key} style={[styles.stat, i > 0 && styles.statLine]}>
                <Text style={[styles.statValue, { fontSize: 24 * k, lineHeight: 28 * k, color: s.earned ? colors.lime : colors.paper }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { fontSize: 11 * k, lineHeight: 14 * k }]} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
          {bestWin ? (
            <Text style={[styles.event, { fontSize: 13 * k, lineHeight: 17 * k, color: colors.paper }]} numberOfLines={1}>
              {bestWin}
            </Text>
          ) : null}
          <Text style={[styles.site, { fontSize: 12 * k, lineHeight: 16 * k }]}>netprophetapp.com</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: colors.ink },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { fontFamily: fonts.bodyBold, color: colors.mist },
  ball: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  shadow: { borderRadius: 999, backgroundColor: alpha(colors.ink, 0.45) },
  // «ΝΙΚΗ» is what happened: lime
  label: { fontFamily: fonts.bodyBold, color: colors.lime },
  sets: { flexDirection: 'row', justifyContent: 'center' },
  // the sets you won, big; a soft ink shadow keeps them readable on any background
  set: { fontFamily: fonts.displayHeavy, color: colors.lime, textShadowColor: alpha(colors.ink, 0.6), textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  against: { fontFamily: fonts.displayHeavy, color: colors.paper, textAlign: 'center', textShadowColor: alpha(colors.ink, 0.6), textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  event: { fontFamily: fonts.bodySemi, color: colors.mist, textAlign: 'center' },
  cardTitle: { fontFamily: fonts.displayHeavy, color: colors.paper, textAlign: 'center', textShadowColor: alpha(colors.ink, 0.6), textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  stats: { flexDirection: 'row', backgroundColor: alpha(colors.ink, 0.72), borderWidth: 1, borderColor: colors.inkLine },
  stat: { flex: 1, alignItems: 'center' },
  statLine: { borderLeftWidth: 1, borderLeftColor: colors.inkLine },
  statValue: { fontFamily: fonts.displayHeavy },
  statLabel: { fontFamily: fonts.bodyBold, color: colors.mist },
  site: { fontFamily: fonts.bodyBold, color: colors.mist, textAlign: 'center' },
});
