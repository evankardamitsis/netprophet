import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { AddMatchButton } from './AddMatchButton';

export function Placeholder({ text, withAdd = false }: { text: string; withAdd?: boolean }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{text}</Text>
      {withAdd ? <AddMatchButton /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
  text: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, textAlign: 'center' },
});
