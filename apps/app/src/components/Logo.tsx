import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radii } from '../theme';
import { logoUrl, monogram } from '../lib/logo';

/**
 * A tournament's or club's logo, small and round, next to its name. Without a logo (or when it fails to load) the
 * name's first letter stands in its place, so rows line up either way. Decorative: the name next to it is the label.
 */
export function Logo({ path, name, size = 22, onInk = false }: { path?: string | null; name: string; size?: number; onInk?: boolean }) {
  const [failed, setFailed] = useState(false);
  const uri = failed ? null : logoUrl(path);
  const box = { width: size, height: size, borderRadius: radii.pill };
  return (
    <View
      style={[styles.box, box, onInk ? styles.boxInk : styles.boxPaper]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" recyclingKey={uri} onError={() => setFailed(true)} />
      ) : (
        <Text
          style={[styles.letter, { fontSize: Math.round(size * 0.55), lineHeight: Math.round(size * 0.8) }, onInk ? styles.letterInk : styles.letterPaper]}
          allowFontScaling={false}
        >
          {monogram(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  boxPaper: { backgroundColor: colors.sand, borderColor: colors.mist },
  boxInk: { backgroundColor: colors.inkRaised, borderColor: colors.inkLine },
  letter: { fontFamily: fonts.displayHeavy, textAlign: 'center' },
  letterPaper: { color: colors.inkSoft },
  letterInk: { color: colors.mist },
});
