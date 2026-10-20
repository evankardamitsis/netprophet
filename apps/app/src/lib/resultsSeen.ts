import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * The newest result you have seen (the server's results_at when you opened «Αποτελέσματα», or when your result cards
 * on Σήμερα had all played), so the tab's dot shows only for results newer than that. The server's time, never the
 * phone's clock: a phone running behind would keep the dot lit. This device only. One store for the app, so a mark
 * from Σήμερα darkens the dot in the tab bar at once.
 */
const KEY = 'np.results.seen';

/** the dot: a result newer than the last visit (any recent result when the tab was never opened); dark while loading */
export function hasNewResults(resultsAt: string | null | undefined, seenAt: string | null | undefined): boolean {
  if (!resultsAt || seenAt === undefined) return false;
  if (seenAt === null) return true;
  return Date.parse(resultsAt) > Date.parse(seenAt);
}

/** the later of two marks: a mark never moves back (an older results_at read late must not relight the dot) */
export function laterMark(current: string | null | undefined, next: string): string {
  if (!current) return next;
  return Date.parse(next) > Date.parse(current) ? next : current;
}

/** undefined while loading, null when nothing was seen on this device yet */
let seenAt: string | null | undefined;
let loading = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function load(): void {
  if (seenAt !== undefined || loading) return;
  loading = true;
  AsyncStorage.getItem(KEY)
    .then((v) => {
      // a mark made while the read was in flight wins
      if (seenAt === undefined) seenAt = v;
    })
    .catch(() => {
      if (seenAt === undefined) seenAt = null;
    })
    .finally(() => {
      loading = false;
      emit();
    });
}

/** the newest result seen so far (undefined while loading) */
export function currentResultsSeen(): string | null | undefined {
  return seenAt;
}

/** you have seen the results up to `resultsAt` (the server's time) */
export function markResultsSeen(resultsAt: string): void {
  const next = laterMark(seenAt, resultsAt);
  if (next === seenAt) return;
  seenAt = next;
  AsyncStorage.setItem(KEY, next).catch(() => undefined);
  emit();
}

/** `seenAt` is undefined while loading, null when the tab was never opened on this device */
export function useResultsSeen(): { seenAt: string | null | undefined; markSeen: (resultsAt: string) => void } {
  const value = useSyncExternalStore(subscribe, currentResultsSeen, currentResultsSeen);
  useEffect(load, []);
  return { seenAt: value, markSeen: markResultsSeen };
}
