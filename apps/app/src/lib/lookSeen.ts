import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** the cosmetics you have already looked at, so «Νέο» on the Εμφάνιση row goes away once you open it. This device only. */
const KEY = 'np.look.seen';

export function useLookSeen(): { seen: ReadonlySet<string> | null; markSeen: (keys: string[]) => void } {
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setSeen(new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => setSeen(new Set()));
  }, []);
  const markSeen = useCallback((keys: string[]) => {
    setSeen((prev) => {
      const next = new Set([...(prev ?? []), ...keys]);
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => undefined);
      return next;
    });
  }, []);
  return { seen, markSeen };
}
