import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

/**
 * One line of display text (names) that shrinks to fit its width instead of being cut with «…».
 * The width is measured, the text's width estimated from its length (Sofia Sans Extra Condensed runs
 * about 0.38em per letter), and the font size and line height scaled down together, never below
 * `minScale` of the style's size. The same on iOS, Android and web.
 */
const EM_PER_CHAR = 0.38;

export function FitText({
  text,
  style,
  minScale = 0.6,
  children,
}: {
  /** what is shown, or (with children) what is measured: the text the children render */
  text: string;
  /** rich content (tappable names) to render instead of `text`, sized the same way */
  children?: ReactNode;
  /** must carry fontSize (and lineHeight when set) */
  style: StyleProp<TextStyle>;
  minScale?: number;
}) {
  const [width, setWidth] = useState(0);
  const flat = StyleSheet.flatten(style) ?? {};
  const base = flat.fontSize ?? 16;
  const needed = text.length * EM_PER_CHAR * base;
  const scale = width > 0 && needed > width ? Math.max(minScale, width / needed) : 1;
  const sized: TextStyle =
    scale < 1
      ? { fontSize: base * scale, lineHeight: flat.lineHeight ? flat.lineHeight * scale : undefined }
      : {};
  return (
    <View style={styles.box} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text numberOfLines={1} style={[style, sized]}>
        {children ?? text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignSelf: 'stretch', minWidth: 0 } });
