import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { FlightLayer } from '../../src/components/FlightLayer';
import { QuestBarLayer } from '../../src/components/QuestBar';
import { Header } from '../../src/components/Header';
import { TabBar } from '../../src/components/TabBar';
import { useCopy } from '../../src/i18n';
import { useAuth } from '../../src/lib/auth';
import { useMe } from '../../src/lib/data';
import { HudProvider } from '../../src/lib/hud';

export default function TabsLayout() {
  const t = useCopy();
  const { session } = useAuth();
  const { me } = useMe(session?.user.email);
  return (
    <HudProvider>
      <View style={styles.root}>
        {/* back (the profile's «‹ Πίσω», Android's back) returns to the screen you came from, not the first tab */}
        <Tabs
          backBehavior="history"
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{ header: () => <Header me={me} /> }}
        >
          <Tabs.Screen name="index" options={{ title: t.tabs.vote }} />
          <Tabs.Screen name="results" options={{ title: t.tabs.results }} />
          <Tabs.Screen name="players" options={{ title: t.tabs.players }} />
          <Tabs.Screen name="ladder" options={{ title: t.tabs.ladder }} />
          {/* Εγώ opens from the header avatar, not from the tab bar */}
          <Tabs.Screen name="me" options={{ title: t.tabs.me, href: null }} />
          <Tabs.Screen name="badges" options={{ title: t.badges.title, href: null }} />
          {/* a player's profile keeps the header and tab bar, with no tab highlighted (prototype) */}
          <Tabs.Screen name="player/[id]" options={{ title: t.players.title, href: null }} />
          <Tabs.Screen name="scout/[id]" options={{ title: t.scout.title, href: null }} />
        </Tabs>
        {/* above everything, so «+10» can fly out of the feed into the header */}
        <FlightLayer />
        <QuestBarLayer />
      </View>
    </HudProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
