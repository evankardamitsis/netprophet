import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, StyleSheet, View } from "react-native";
import { useFonts } from "expo-font";
import { AuthProvider, useAuth } from "../src/lib/auth";
import {
  OnboardingGateProvider,
  useOnboardingGate,
} from "../src/lib/onboardingGate";
import { identify, screen } from "../src/lib/analytics";
import { listenForPushTaps, refreshPushToken } from "../src/lib/push";
import { api, isLive } from "../src/lib/supabase";
import { colors } from "../src/theme";

export default function RootLayout() {
  // Only the faces the prototype uses are loaded, so the bundle stays small.
  const [loaded, error] = useFonts({
    /* eslint-disable @typescript-eslint/no-var-requires */
    Commissioner_400Regular: require("@expo-google-fonts/commissioner/400Regular/Commissioner_400Regular.ttf"),
    Commissioner_500Medium: require("@expo-google-fonts/commissioner/500Medium/Commissioner_500Medium.ttf"),
    Commissioner_600SemiBold: require("@expo-google-fonts/commissioner/600SemiBold/Commissioner_600SemiBold.ttf"),
    Commissioner_700Bold: require("@expo-google-fonts/commissioner/700Bold/Commissioner_700Bold.ttf"),
    SofiaSansExtraCondensed_700Bold: require("@expo-google-fonts/sofia-sans-extra-condensed/700Bold/SofiaSansExtraCondensed_700Bold.ttf"),
    SofiaSansExtraCondensed_800ExtraBold: require("@expo-google-fonts/sofia-sans-extra-condensed/800ExtraBold/SofiaSansExtraCondensed_800ExtraBold.ttf"),
    /* eslint-enable @typescript-eslint/no-var-requires */
  });
  // A font failure falls back to the system font instead of blocking the app.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* on a wide browser the app keeps a phone's width, centred on the ink backdrop */}
      <View style={styles.page}>
        <View style={styles.column}>
          <SafeAreaProvider>
            <AuthProvider>
              <OnboardingGateProvider>
                <Routes />
              </OnboardingGateProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

function Routes() {
  const { ready, session, guest } = useAuth();
  const gate = useOnboardingGate();
  const userId = session?.user.id ?? null;
  // a signed-in phone keeps its push token current (asking happens after the first vote)
  useEffect(() => {
    if (userId && api) void refreshPushToken(api);
    if (userId) identify(userId, "el");
  }, [userId]);
  // a tapped push opens its screen (a schedule alert its tournament, results the Αποτελέσματα tab)
  useEffect(() => {
    if (!userId) return undefined;
    return listenForPushTaps((r) => router.push(r as never));
  }, [userId]);
  // screens by route («/player/[id]»), never with ids in them
  const segments = useSegments();
  const route = "/" + segments.filter((s) => !s.startsWith("(")).join("/");
  useEffect(() => screen(route), [route]);
  if (!ready) return null;
  // without a backend (mock mode) the app is open; live, everything but sign-in needs a session
  // (or, in development builds, the «Άλλη φορά» guest)
  const signedIn = !isLive || session !== null || guest;
  // a new account goes through onboarding first; the dev guest can open it by hand at /onboarding
  const onboarding = session !== null && gate.status === "needed";
  if (session !== null && gate.status === "unknown") return null;
  return (
    <>
      <StatusBar style={signedIn ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Protected guard={signedIn && !onboarding}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add-match"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen name="quiz" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen
            name="pro"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="kudos"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </Stack.Protected>
        <Stack.Protected
          guard={signedIn && (onboarding || (__DEV__ && (guest || !isLive)))}
        >
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        {/* the opponent link works for anyone, signed in or not */}
        <Stack.Screen name="m/[token]" />
      </Stack>
    </>
  );
}

/** the widest the app gets in a browser; phones are narrower and fill the screen */
const MAX_WIDTH = 520;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  page:
    Platform.OS === "web"
      ? { flex: 1, alignItems: "center", backgroundColor: colors.ink }
      : { flex: 1 },
  column:
    Platform.OS === "web"
      ? {
          flex: 1,
          width: "100%",
          maxWidth: MAX_WIDTH,
          backgroundColor: colors.paper,
          overflow: "hidden",
        }
      : { flex: 1 },
});
