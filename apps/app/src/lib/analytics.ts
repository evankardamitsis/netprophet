import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';
import type { AnalyticsEvent, AnalyticsEvents } from '@netprophet/core';

/**
 * Product analytics (PostHog Cloud EU), only in release builds with EXPO_PUBLIC_POSTHOG_KEY set; otherwise every
 * call is a no-op, so CI, mock mode and our own testing never reach the beta numbers. EXPO_PUBLIC_POSTHOG_DEV=1
 * turns it on in a development build, to check an event. Events are the ones in @netprophet/core `AnalyticsEvents`.
 * People are identified by their user id, never their email. On web nothing is written to the browser (memory
 * only, no cookies), so the M1 beta needs no consent banner; the launch site gets one (implementation-plan §4.5).
 */
const key = __DEV__ && process.env.EXPO_PUBLIC_POSTHOG_DEV !== '1' ? undefined : process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export const posthog: PostHog | null = key
  ? new PostHog(key, {
      host,
      persistence: Platform.OS === 'web' ? 'memory' : 'file',
      // web keeps the queue in memory, so it sends each event at once instead of losing a batch on a reload
      flushAt: Platform.OS === 'web' ? 1 : 20,
      captureAppLifecycleEvents: Platform.OS !== 'web',
    })
  : null;

export function track<E extends AnalyticsEvent>(event: E, props: AnalyticsEvents[E]): void {
  posthog?.capture(event, props as unknown as Record<string, string | number | boolean>);
}

/** signed in: tie this device's events to the account */
export function identify(userId: string, locale: string): void {
  posthog?.identify(userId, { locale, platform: Platform.OS });
}

/** signed out: a fresh anonymous id, so the next person on this phone is someone else */
export function resetAnalytics(): void {
  posthog?.reset();
}

/** a screen, by its route («/results», «/player/[id]»), never with ids in it */
export function screen(route: string): void {
  posthog?.screen(route);
}
