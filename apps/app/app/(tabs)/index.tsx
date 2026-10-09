import { ScrollView, StyleSheet, View } from 'react-native';
import { AddMatchButton } from '../../src/components/AddMatchButton';
import { VoteCard } from '../../src/components/VoteCard';
import { MOCK_MATCHES } from '../../src/mock/matches';
import { colors, spacing } from '../../src/theme';

export default function VoteScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
        {MOCK_MATCHES.map((m, i) => (
          <VoteCard key={m.id} match={m} index={i} />
        ))}
      </ScrollView>
      <AddMatchButton />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  feed: { padding: spacing[4], gap: spacing[3], paddingBottom: 96 },
});
