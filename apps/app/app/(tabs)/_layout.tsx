import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { FlightLayer } from '../../src/components/FlightLayer';
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
        <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ header: () => <Header me={me} /> }}>
          <Tabs.Screen name="index" options={{ title: t.tabs.vote }} />
          <Tabs.Screen name="results" options={{ title: t.tabs.results }} />
          <Tabs.Screen name="players" options={{ title: t.tabs.players }} />
          <Tabs.Screen name="ladder" options={{ title: t.tabs.ladder }} />
          {/* Εγώ opens from the header avatar, not from the tab bar */}
          <Tabs.Screen name="me" options={{ title: t.tabs.me, href: null }} />
        </Tabs>
        {/* above everything, so «+10» can fly out of the feed into the header */}
        <FlightLayer />
      </View>
    </HudProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
