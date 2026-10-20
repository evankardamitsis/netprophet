import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { FlightLayer } from '../../src/components/FlightLayer';
import { QuestBarLayer } from '../../src/components/QuestBar';
import { Header } from '../../src/components/Header';
import { TabBar } from '../../src/components/TabBar';
import { useCopy } from '../../src/i18n';
import { useAuth } from '../../src/lib/auth';
import { useMe } from '../../src/lib/data';
import { TourOverlay } from '../../src/components/TourOverlay';
import { HudProvider } from '../../src/lib/hud';
import { TourProvider } from '../../src/lib/tour';
import { UnlocksProvider } from '../../src/lib/unlocks';

export default function TabsLayout() {
  const t = useCopy();
  const { session } = useAuth();
  const { me, raw, refresh } = useMe(session?.user.email);
  return (
    <HudProvider>
      <UnlocksProvider serverUnlocked={raw?.unlocks ?? null} refresh={refresh}>
        <TourProvider profile={raw?.profile.onboarding_state ?? null}>
          <View style={styles.root}>
            {/* back (the profile's «‹ Πίσω», Android's back) returns to the screen you came from, not the first tab */}
            <Tabs
              backBehavior="history"
              tabBar={(props) => <TabBar {...props} resultsAt={raw?.results_at ?? null} />}
              screenOptions={{ header: () => <Header me={me} /> }}
            >
              <Tabs.Screen name="index" options={{ title: t.tabs.vote }} />
              <Tabs.Screen name="results" options={{ title: t.tabs.results }} />
              <Tabs.Screen name="tournaments" options={{ title: t.tabs.tournaments }} />
              <Tabs.Screen name="ladder" options={{ title: t.tabs.ladder }} />
              {/* player search opens from Τουρνουά (founder, 14 Oct: four tabs, one job each) */}
              <Tabs.Screen name="players" options={{ title: t.tabs.players, href: null }} />
              {/* Εγώ opens from the header avatar, not from the tab bar */}
              <Tabs.Screen name="me" options={{ title: t.tabs.me, href: null }} />
              <Tabs.Screen name="badges" options={{ title: t.badges.title, href: null }} />
              <Tabs.Screen name="tournament/[id]" options={{ title: t.tournaments.title, href: null }} />
              {/* a player's profile keeps the header and tab bar, with no tab highlighted (prototype) */}
              <Tabs.Screen name="player/[id]" options={{ title: t.players.title, href: null }} />
              <Tabs.Screen name="scout/[id]" options={{ title: t.scout.title, href: null }} />
            </Tabs>
            {/* above everything, so «+10» can fly out of the feed into the header */}
            <FlightLayer />
            <QuestBarLayer />
            {/* the first-visit tour dims everything, the header and the tab bar too */}
            <TourOverlay />
          </View>
        </TourProvider>
      </UnlocksProvider>
    </HudProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
