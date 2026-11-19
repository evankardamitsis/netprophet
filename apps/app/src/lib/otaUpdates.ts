import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';
import { checkEnded, checkStarted, mayCheck, otaAtLaunch, type OtaThrottle } from './otaThrottle';

/**
 * Over-the-air updates (docs/v2/ota-updates.md). The native side checks at every cold start and downloads in the
 * background (app.json: checkAutomatically ON_LOAD, fallbackToCacheTimeout 0, so launch never waits). This adds a check
 * when the app comes back to the foreground, at most every 30 minutes (otaThrottle.ts). A downloaded update is applied
 * at the next cold start only: nothing here reloads the app, so a player is never thrown out mid-session.
 *
 * Off in development, in Expo Go, on the web and in any build without expo-updates enabled.
 */
function otaAvailable(): boolean {
  if (__DEV__) return false;
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return Updates.isEnabled;
}

/** starts watching; returns the stop for the effect's cleanup */
export function watchOtaUpdates(): () => void {
  if (!otaAvailable()) return () => undefined;
  let state: OtaThrottle = otaAtLaunch(Date.now());

  async function check() {
    const now = Date.now();
    if (!mayCheck(state, now)) return;
    state = checkStarted(state, now);
    let downloaded = false;
    try {
      const found = await Updates.checkForUpdateAsync();
      if (found.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync();
        downloaded = fetched.isNew;
      }
    } catch {
      // no network or the update server is down: the next resume after the interval tries again
    }
    state = checkEnded(state, downloaded);
  }

  const sub = AppState.addEventListener('change', (phase) => {
    if (phase === 'active') void check();
  });
  return () => sub.remove();
}
