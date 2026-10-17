import { StyleSheet, Text, View } from 'react-native';
import { useMyBaller } from '../lib/data';
import { colors, text } from '../theme';
import { Baller } from './Baller';

/** an empty screen with your Baller in it, a little sad, over the line that says why (founder, 17 Oct) */
export function BallerNote({ line }: { line: string }) {
  const me = useMyBaller();
  return (
    <View style={styles.note}>
      {me.look ? <Baller look={me.look} size={96} kit={me.kit} gear={me.gear} mood="sad" pokeable /> : null}
      <Text style={styles.line}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  line: { ...text.body, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: 12 },
});
