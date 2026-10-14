import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * The newest result you have seen on «Αποτελέσματα» (the server's results_at when you opened it), so its dot shows only
 * for results newer than that. The server's time, never the phone's clock: a phone running behind would keep the dot
 * lit. This device only.
 */
const KEY = 'np.results.seen';

/** the dot: a result newer than the last visit (any recent result when the tab was never opened); dark while loading */
export function hasNewResults(resultsAt: string | null | undefined, seenAt: string | null | undefined): boolean {
  if (!resultsAt || seenAt === undefined) return false;
  if (seenAt === null) return true;
  return Date.parse(resultsAt) > Date.parse(seenAt);
}

/** `seenAt` is undefined while loading, null when the tab was never opened on this device */
export function useResultsSeen(): { seenAt: string | null | undefined; markSeen: (resultsAt: string) => void } {
  const [seenAt, setSeenAt] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setSeenAt(v))
      .catch(() => setSeenAt(null));
  }, []);
  const markSeen = useCallback((resultsAt: string) => {
    setSeenAt(resultsAt);
    AsyncStorage.setItem(KEY, resultsAt).catch(() => undefined);
  }, []);
  return { seenAt, markSeen };
}
