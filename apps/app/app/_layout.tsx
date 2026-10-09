import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { colors } from '../src/theme';

export default function RootLayout() {
  // Only the four faces in use are required, so the bundle stays small.
  const [loaded, error] = useFonts({
    /* eslint-disable @typescript-eslint/no-var-requires */
    Commissioner_400Regular: require('@expo-google-fonts/commissioner/400Regular/Commissioner_400Regular.ttf'),
    Commissioner_600SemiBold: require('@expo-google-fonts/commissioner/600SemiBold/Commissioner_600SemiBold.ttf'),
    SofiaSansExtraCondensed_700Bold: require('@expo-google-fonts/sofia-sans-extra-condensed/700Bold/SofiaSansExtraCondensed_700Bold.ttf'),
    SofiaSansExtraCondensed_800ExtraBold: require('@expo-google-fonts/sofia-sans-extra-condensed/800ExtraBold/SofiaSansExtraCondensed_800ExtraBold.ttf'),
    /* eslint-enable @typescript-eslint/no-var-requires */
  });
  // A font failure falls back to the system font instead of blocking the app.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-match" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.paper } });
