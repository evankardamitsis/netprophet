/**
 * When the app may look for an over-the-air update (docs/v2/ota-updates.md). Pure, so vitest checks it; the wiring
 * with expo-updates and AppState is in otaUpdates.ts.
 *
 * The native side already checks once at every cold start (app.json updates.checkAutomatically ON_LOAD), so the clock
 * starts at launch and the app only looks again when it comes back to the foreground, at most every 30 minutes.
 */

/** the least time between two checks */
export const OTA_MIN_INTERVAL_MS = 30 * 60 * 1000;

export type OtaThrottle = {
  /** when the last check started (ms); a failed check counts too, so a bad network is not retried at every resume */
  lastCheckAt: number;
  /** a check is running now: a second resume does not start another */
  inFlight: boolean;
  /** an update is already downloaded and waits for the next cold start: nothing more to look for this session */
  pending: boolean;
};

/** the state at launch: the native launch check counts as the first one */
export function otaAtLaunch(now: number): OtaThrottle {
  return { lastCheckAt: now, inFlight: false, pending: false };
}

/**
 * May a check start now? Not while one runs, not once an update waits, not within the interval. A clock that went
 * backwards (the phone's time was changed) counts as "long enough", so the app is never stuck without checks.
 */
export function mayCheck(state: OtaThrottle, now: number, minIntervalMs: number = OTA_MIN_INTERVAL_MS): boolean {
  if (state.inFlight || state.pending) return false;
  const elapsed = now - state.lastCheckAt;
  return elapsed < 0 || elapsed >= minIntervalMs;
}

/** a check starts: the clock restarts now, whatever its result */
export function checkStarted(state: OtaThrottle, now: number): OtaThrottle {
  return { ...state, lastCheckAt: now, inFlight: true };
}

/** a check ended; `downloaded` when a new update is now on the phone for the next cold start */
export function checkEnded(state: OtaThrottle, downloaded: boolean): OtaThrottle {
  return { ...state, inFlight: false, pending: state.pending || downloaded };
}
