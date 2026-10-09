import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { isLive } from '../src/lib/supabase';
import { colors } from '../src/theme';

export default function RootLayout() {
  // Only the faces the prototype uses are loaded, so the bundle stays small.
  const [loaded, error] = useFonts({
    /* eslint-disable @typescript-eslint/no-var-requires */
    Commissioner_400Regular: require('@expo-google-fonts/commissioner/400Regular/Commissioner_400Regular.ttf'),
    Commissioner_500Medium: require('@expo-google-fonts/commissioner/500Medium/Commissioner_500Medium.ttf'),
    Commissioner_600SemiBold: require('@expo-google-fonts/commissioner/600SemiBold/Commissioner_600SemiBold.ttf'),
    Commissioner_700Bold: require('@expo-google-fonts/commissioner/700Bold/Commissioner_700Bold.ttf'),
    SofiaSansExtraCondensed_700Bold: require('@expo-google-fonts/sofia-sans-extra-condensed/700Bold/SofiaSansExtraCondensed_700Bold.ttf'),
    SofiaSansExtraCondensed_800ExtraBold: require('@expo-google-fonts/sofia-sans-extra-condensed/800ExtraBold/SofiaSansExtraCondensed_800ExtraBold.ttf'),
    /* eslint-enable @typescript-eslint/no-var-requires */
  });
  // A font failure falls back to the system font instead of blocking the app.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Routes() {
  const { ready, session } = useAuth();
  if (!ready) return null;
  // without a backend (mock mode) the app is open; live, everything but sign-in needs a session
  const signedIn = !isLive || session !== null;
  return (
    <>
      <StatusBar style={signedIn ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-match" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.paper } });
