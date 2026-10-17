import { StyleSheet, View } from 'react-native';
import { CardBackground } from './CardBackground';
import type { Tile } from '../lib/look';
import { colors, cosmetics } from '../theme';
import { Lit } from './Lit';
import { Avatar } from './Avatar';
import { WinEffect } from './WinEffects';
import type { AvatarLook } from '../lib/avatar';

/** the shirt and racket colours of a kit */
export function kitColors(key: string): { shirt: string; racket: string } {
  return cosmetics.kit[key as keyof typeof cosmetics.kit] ?? cosmetics.kit.kit_green;
}

/** a shirt swatch (a circle) with the racket (a bar) leaning on it: no 3D player yet, so the kit is shown as colours */
export function KitSwatch({ kit, size }: { kit: string; size: number }) {
  const c = kitColors(kit);
  return (
    <View style={{ width: size * 1.3, height: size * 1.3, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: c.shirt, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden' }}>
        <Lit />
      </View>
      <View
        style={{
          position: 'absolute',
          right: size * 0.02,
          width: size * 0.14,
          height: size * 1.1,
          borderRadius: 999,
          backgroundColor: c.racket,
          borderWidth: 1.5,
          borderColor: colors.ink,
          transform: [{ rotate: '28deg' }],
          overflow: 'hidden',
        }}
      >
        <Lit strength={0.8} />
      </View>
    </View>
  );
}

/**
 * prototype `.lkth`: 76×106 thumbnail of an item. Frames sit on ink, backgrounds fill it; kits, gear and the win
 * effect show your own ball person wearing them (founder, 15 Oct: the ball people).
 */
export function LookThumb({ tile, who }: { tile: Tile; who: AvatarLook }) {
  const none = tile.key === null;
  if (tile.category !== 'background') {
    return (
      <View style={[styles.thumb, styles.ballThumb, none && styles.none]}>
        <Avatar
          look={who}
          size={tile.category === 'frame' ? 70 : 64}
          kit={tile.category === 'kit' ? (tile.key ?? 'kit_green') : 'kit_green'}
          gear={tile.category === 'gear' ? tile.key : null}
          frame={tile.category === 'frame' ? tile.key : null}
        />
        {tile.key === 'fx_confetti' ? <ConfettiDots /> : null}
        {tile.category === 'win_effect' && tile.key && tile.key !== 'fx_confetti' ? (
          <View pointerEvents="none" style={styles.fxBox}>
            <WinEffect effect={tile.key} size={64} still />
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View style={[styles.thumb, none && styles.none]}>
      <CardBackground bg={tile.key} k={0.45} />
    </View>
  );
}

/** a still hint of the confetti around the ball */
function ConfettiDots() {
  const at = [
    [10, 14, 0],
    [58, 10, 1],
    [8, 52, 2],
    [62, 46, 3],
    [34, 4, 1],
  ] as const;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {at.map(([x, y, c], i) => (
        <View key={i} style={[styles.dot, { left: x, top: 20 + y, backgroundColor: cosmetics.confetti[c] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 76, height: 106, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.ink },
  kitThumb: { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  // the effect's still frame, laid over the ball it plays round
  fxBox: { position: 'absolute', width: 64, height: 64, top: 21, left: 6 },
  ballThumb: { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 1.5, transform: [{ rotate: '20deg' }] },
  none: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.slate },
});
