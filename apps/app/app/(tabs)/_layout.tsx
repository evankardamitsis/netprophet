import { Tabs } from 'expo-router';
import { Header } from '../../src/components/Header';
import { TabBar } from '../../src/components/TabBar';
import { useCopy } from '../../src/i18n';
import { useMe } from '../../src/lib/data';

export default function TabsLayout() {
  const t = useCopy();
  const { me } = useMe();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ header: () => <Header me={me} /> }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.vote }} />
      <Tabs.Screen name="results" options={{ title: t.tabs.results }} />
      <Tabs.Screen name="players" options={{ title: t.tabs.players }} />
      <Tabs.Screen name="ladder" options={{ title: t.tabs.ladder }} />
      <Tabs.Screen name="me" options={{ title: t.tabs.me }} />
    </Tabs>
  );
}
