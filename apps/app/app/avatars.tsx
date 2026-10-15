import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Avatar, AvatarSilhouette, LiveAvatar } from '../src/components/Avatar';
import type { AvatarLook } from '../src/lib/avatar';
import { Back } from '../src/components/OnboardingControls';
import { useCopy } from '../src/i18n';
import { DEFAULT_AVATARS } from '../src/lib/avatar';
import { colors, cosmetics, fonts } from '../src/theme';

/**
 * Development builds only: the drawn avatars for the founder's review before they go into the app. The 12 defaults
 * large and at list size, the silhouette for roster players, and one player in every kit.
 */
export default function AvatarsScreen() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <Back label={t.common.back} onPress={close} />
      <Text style={styles.title}>Avatar</Text>
      <View style={styles.grid}>
        {DEFAULT_AVATARS.map((a) => (
          <View key={a.key} style={styles.cell}>
            <LiveCell look={a.look} />
            <Text style={styles.key}>{a.key}</Text>
          </View>
        ))}
        <View style={styles.cell}>
          <View style={[styles.disc, { width: 96, height: 96 }]}>
            <AvatarSilhouette initials="ΝΠ" size={96} />
          </View>
          <Text style={styles.key}>roster</Text>
        </View>
      </View>
      <Text style={styles.label}>List size</Text>
      <View style={styles.row}>
        {DEFAULT_AVATARS.map((a) => (
          <View key={a.key} style={[styles.disc, { width: 40, height: 40 }]}>
            <Avatar look={a.look} size={40} />
          </View>
        ))}
      </View>
      <Text style={styles.label}>Gear</Text>
      <View style={styles.row}>
        {['gear_cap', 'gear_headband', 'gear_visor', 'gear_shades', 'gear_bandana', 'gear_bucket'].map((g, i) => (
          <Avatar key={g} look={DEFAULT_AVATARS[i * 2]!.look} size={96} gear={g} />
        ))}
      </View>
      <Text style={styles.label}>Kits</Text>
      <View style={styles.row}>
        {Object.keys(cosmetics.kit).map((k) => (
          <View key={k} style={[styles.disc, { width: 64, height: 64 }]}>
            <Avatar look={DEFAULT_AVATARS[6]!.look} size={64} kit={k} bg={colors.ink} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** one of the 12, alive; a tap makes it jump */
function LiveCell({ look }: { look: AvatarLook }) {
  const [jump, setJump] = useState(0);
  return (
    <Pressable accessibilityRole="button" onPress={() => setJump((n) => n + 1)} style={{ width: 96, height: 96 }}>
      <LiveAvatar look={look} size={96} jump={jump} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, gap: 14 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 52, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cell: { alignItems: 'center', gap: 4 },
  disc: { borderRadius: 999, overflow: 'hidden', borderWidth: 2, borderColor: colors.ink },
  key: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
