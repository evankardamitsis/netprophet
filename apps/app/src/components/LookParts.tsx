import { StyleSheet, View } from 'react-native';
import { CardBackground } from './CardBackground';
import { CardFrame } from './CardFrame';
import type { Tile } from '../lib/look';
import { colors, cosmetics } from '../theme';

/** the shirt and racket colours of a kit */
export function kitColors(key: string): { shirt: string; racket: string } {
  return cosmetics.kit[key as keyof typeof cosmetics.kit] ?? cosmetics.kit.kit_green;
}

/** a shirt swatch (a circle) with the racket (a bar) leaning on it: no 3D player yet, so the kit is shown as colours */
export function KitSwatch({ kit, size }: { kit: string; size: number }) {
  const c = kitColors(kit);
  return (
    <View style={{ width: size * 1.3, height: size * 1.3, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: c.shirt, borderWidth: 2, borderColor: colors.ink }} />
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
        }}
      />
    </View>
  );
}

/** prototype `.lkth`: 76×106 thumbnail of an item. Frames sit on ink, backgrounds fill it, kits are a swatch. */
export function LookThumb({ tile }: { tile: Tile }) {
  if (tile.category === 'kit') {
    return (
      <View style={[styles.thumb, styles.kitThumb]}>
        <KitSwatch kit={tile.key ?? 'kit_green'} size={44} />
      </View>
    );
  }
  const none = tile.key === null;
  return (
    <View style={[styles.thumb, none && styles.none]}>
      {tile.category === 'background' ? <CardBackground bg={tile.key} k={0.45} /> : null}
      {tile.category === 'frame' ? <CardFrame frame={tile.key} k={0.45} radius={12} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 76, height: 106, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.ink },
  kitThumb: { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  none: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.slate },
});
