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
import { useClearSeenPushes } from '../../src/lib/useClearSeenPushes';
import { useOpenPushes } from '../../src/lib/useOpenPushes';

export default function TabsLayout() {
  const t = useCopy();
  const { session } = useAuth();
  const { me, raw, refresh } = useMe(session?.user.email);
  // seen results: their pushes leave the notification centre (launch, back to the front, the inbox emptied)
  useClearSeenPushes(raw?.inbox_unseen, refresh);
  // a tapped push's place opens here: this layout is only up when signed in and past onboarding, with its tabs mounted
  useOpenPushes();
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
              {/* Τουρνουά is the home (founder, 22 Oct, mockup D): four tabs, Τουρνουά · Αποτελέσματα · Κατάταξη · Εγώ */}
              <Tabs.Screen name="index" options={{ title: t.tabs.tournaments }} />
              <Tabs.Screen name="results" options={{ title: t.tabs.results }} />
              <Tabs.Screen name="ladder" options={{ title: t.tabs.ladder }} />
              <Tabs.Screen name="me" options={{ title: t.tabs.me }} />
              {/* every tournament, «Όλα τα τουρνουά ›» from the home; no longer a tab */}
              <Tabs.Screen name="tournaments" options={{ title: t.tabs.tournaments, href: null }} />
              {/* player search opens from Τουρνουά */}
              {/* «Περισσότερα ›» under the home's three votes: every match of the day, Τουρνουά lit */}
              <Tabs.Screen name="all-matches" options={{ title: t.home.all.title, href: null }} />
              <Tabs.Screen name="players" options={{ title: t.tabs.players, href: null }} />
              <Tabs.Screen name="badges" options={{ title: t.badges.title, href: null }} />
              <Tabs.Screen name="tournament/[id]" options={{ title: t.tournaments.title, href: null }} />
              {/* a player's profile keeps the header and tab bar, with no tab highlighted (prototype) */}
              <Tabs.Screen name="player/[id]" options={{ title: t.players.title, href: null }} />
              {/* a held name's run, its path and its draw stay inside the main layout, Τουρνουά (the home) lit (founder, 22 Oct) */}
              <Tabs.Screen name="tournament-player" options={{ title: t.tournaments.title, href: null }} />
              <Tabs.Screen name="tournament-path" options={{ title: t.tournaments.title, href: null }} />
              <Tabs.Screen name="tournament-draw" options={{ title: t.tournaments.title, href: null }} />
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
