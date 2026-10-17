import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BallArt } from '../src/components/Avatar';
import { BG_KEYS, CardBackground } from '../src/components/CardBackground';
import { DEFAULT_AVATARS } from '../src/lib/avatar';
import { colors, fonts } from '../src/theme';

const FRAMES = ['frame_gold', 'frame_seven', 'frame_ten', 'frame_week', 'frame_month_top', 'frame_level', 'frame_friends', 'frame_retro', 'frame_grass', 'frame_founding'];

/** Development builds only: every background with Baller on it and every frame, for the founder's review in one look. */
export default function LooksScreen() {
  const insets = useSafeAreaInsets();
  const look = DEFAULT_AVATARS[0]!.look;
  if (!__DEV__) return null;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <View style={styles.grid}>
        {BG_KEYS.map((bg) => (
          <View key={bg} style={styles.stage}>
            <CardBackground bg={bg} stage />
            <BallArt look={look} size={92} kit="kit_green" />
            <Text style={styles.key}>{bg}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {FRAMES.map((f) => (
          <View key={f} style={styles.cell}>
            <BallArt look={look} size={84} kit="kit_green" frame={f} />
            <Text style={styles.key}>{f.replace('frame_', '')}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {BG_KEYS.map((bg) => (
          <View key={bg} style={styles.thumb}>
            <CardBackground bg={bg} k={0.45} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { paddingHorizontal: 12, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  stage: { width: 182, height: 182, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  cell: { width: 70, alignItems: 'center' },
  thumb: { width: 76, height: 106, borderRadius: 12, overflow: 'hidden' },
  key: { position: 'absolute', top: 4, left: 6, fontFamily: fonts.bodyBold, fontSize: 9, color: colors.paper },
});
