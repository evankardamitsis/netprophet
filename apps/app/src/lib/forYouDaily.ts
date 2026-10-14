import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey } from '@netprophet/core';
import { useCallback, useEffect, useState } from 'react';

/** the Athens day «Για σένα» last rose full screen on this device, so it rises once a day */
const KEY = 'np.forYou.shownDay';

/** whether it may rise today: undefined while loading */
export function mayRiseToday(shownDay: string | null | undefined, now: Date): boolean | undefined {
  if (shownDay === undefined) return undefined;
  return shownDay !== dayKey(now.toISOString());
}

export function useForYouDaily(): { may: boolean | undefined; markShown: () => void } {
  const [shown, setShown] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setShown(v))
      .catch(() => setShown(null));
  }, []);
  const markShown = useCallback(() => {
    const today = dayKey(new Date().toISOString());
    setShown(today);
    AsyncStorage.setItem(KEY, today).catch(() => undefined);
  }, []);
  return { may: mayRiseToday(shown, new Date()), markShown };
}
