import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCopy } from '../../src/i18n';
import { useAuth } from '../../src/lib/auth';
import { isLive } from '../../src/lib/supabase';
import { colors, fonts, spacing } from '../../src/theme';

export default function Screen() {
  const t = useCopy();
  const { session, signOut } = useAuth();
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{t.placeholder.me}</Text>
      {isLive && session ? (
        <>
          <Text style={styles.email}>{session.user.email}</Text>
          <Pressable accessibilityRole="button" onPress={signOut} hitSlop={12}>
            {({ pressed }) => <Text style={[styles.link, pressed && styles.pressed]}>{t.auth.signOut}</Text>}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing[5], gap: spacing[3] },
  text: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, textAlign: 'center' },
  email: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 14 },
  link: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 14, textDecorationLine: 'underline' },
  pressed: { opacity: 0.5 },
});
