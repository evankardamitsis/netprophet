import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** «δικοί σου» (founder, 21 Oct): a small dot by the name of your player or someone you follow; never lime */
export function YoursDot({ onInk = false }: { onInk?: boolean }) {
  return <View style={[styles.dot, onInk && styles.onInk]} accessibilityElementsHidden importantForAccessibility="no" />;
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  onInk: { backgroundColor: colors.paper },
});
