import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** when «Αποτελέσματα» was last opened, so its dot shows only for results newer than that. This device only. */
const KEY = 'np.results.seen';

/** the dot: a result newer than the last visit (any recent result when the tab was never opened); dark while loading */
export function hasNewResults(resultsAt: string | null | undefined, seenAt: string | null | undefined): boolean {
  if (!resultsAt || seenAt === undefined) return false;
  if (seenAt === null) return true;
  return Date.parse(resultsAt) > Date.parse(seenAt);
}

/** `seenAt` is undefined while loading, null when the tab was never opened on this device */
export function useResultsSeen(): { seenAt: string | null | undefined; markSeen: () => void } {
  const [seenAt, setSeenAt] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setSeenAt(v))
      .catch(() => setSeenAt(null));
  }, []);
  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    setSeenAt(now);
    AsyncStorage.setItem(KEY, now).catch(() => undefined);
  }, []);
  return { seenAt, markSeen };
}
