import { useEffect, useState } from "react";
import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
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
import { initSounds } from "../src/lib/sound";
import { Loading } from "../src/components/Loading";

/**
 * the animated logo stays at least this long on a cold start, so its hop is seen and the screen never flickers. It
 * only covers the app: the session, the onboarding gate and Σήμερα's first reads start under it.
 */
const LOADING_MIN_MS = 900;

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
  const [minDone, setMinDone] = useState(false);
  // Baller's sounds: read the switch and set the audio session once
  useEffect(() => {
    void initSounds();
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setMinDone(true), LOADING_MIN_MS);
    return () => clearTimeout(id);
  }, []);
  // A font failure falls back to the system font instead of blocking the app.
  const fontsReady = loaded || error !== null;

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* on a wide browser the app keeps a phone's width, centred on the ink backdrop */}
      <View style={styles.page}>
        <View style={styles.column}>
          <SafeAreaProvider>
            {/* mounted at once: the session restores and the gate reads during the logo; the screens wait for the
                fonts (only text needs them) */}
            <AuthProvider>
              <OnboardingGateProvider>{fontsReady ? <Routes /> : null}</OnboardingGateProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </View>
      </View>
      {!fontsReady || !minDone ? (
        <View style={StyleSheet.absoluteFill}>
          <Loading />
        </View>
      ) : null}
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
  // a tapped push opens its screen (pushRoute). On a cold start the tap comes in while the logo and the sign-in check
  // still show and no screen is mounted to navigate in, so the route waits here until the app's screens are up
  // (founder, 21 Oct: a push opened the app on Σήμερα instead of its place).
  const [pushTo, setPushTo] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return undefined;
    return listenForPushTaps(setPushTo);
  }, [userId]);
  const navKey = useRootNavigationState()?.key;
  const screensUp = ready && !!navKey && session !== null && gate.status !== "unknown" && gate.status !== "needed";
  useEffect(() => {
    if (!pushTo || !screensUp) return undefined;
    // one frame, so the tabs under the Stack have mounted too
    const id = requestAnimationFrame(() => {
      setPushTo(null);
      router.push(pushTo as never);
    });
    return () => cancelAnimationFrame(id);
  }, [pushTo, screensUp]);
  // screens by route («/player/[id]»), never with ids in them
  const segments = useSegments();
  const route = "/" + segments.filter((s) => !s.startsWith("(")).join("/");
  useEffect(() => screen(route), [route]);
  if (!ready) return <Loading />;
  // without a backend (mock mode) the app is open; live, everything but sign-in needs a session
  // (or, in development builds, the «Άλλη φορά» guest)
  const signedIn = !isLive || session !== null || guest;
  // a new account goes through onboarding first; the dev guest can open it by hand at /onboarding
  const onboarding = session !== null && gate.status === "needed";
  if (session !== null && gate.status === "unknown") return <Loading />;
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
            name="look"
            options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: colors.ink } }}
          />
          <Stack.Screen
            name="share-baller"
            options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: colors.ink } }}
          />
          <Stack.Screen
            name="season"
            options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: colors.ink } }}
          />
          <Stack.Screen
            name="win-card"
            options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: colors.ink } }}
          />
          <Stack.Screen
            name="baller"
            options={{ presentation: "fullScreenModal", animation: "fade", contentStyle: { backgroundColor: colors.ink } }}
          />
          <Stack.Screen
            name="pro"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="kudos"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen name="match-stats" />
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
