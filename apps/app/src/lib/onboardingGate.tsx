import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth';
import { api } from './supabase';

/**
 * Whether the signed-in account still has to go through onboarding. The answer is the profile's
 * onboarding_state.done (accounts from before onboarding are marked done on the server). It is
 * cached on the device, so later launches open straight to the app instead of waiting for get_me.
 * The welcome screen's «Άλλη φορά» (release builds) marks it done as «skipped» on first sign-in.
 */
export type OnboardingStatus = 'unknown' | 'needed' | 'done';

/** set by «Άλλη φορά» on the welcome screen */
export const SKIP_ONBOARDING_KEY = 'np.skipOnboarding';
const doneKey = (userId: string) => `np.onboarded.${userId}`;

interface Gate {
  status: OnboardingStatus;
  /** the setup is done: saves it (server and device) but stays on onboarding for the intro slides */
  save: (state: Record<string, unknown>) => Promise<void>;
  /** leaves onboarding for the app */
  open: () => void;
}

const GateContext = createContext<Gate>({ status: 'done', save: async () => undefined, open: () => undefined });

export function OnboardingGateProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [status, setStatus] = useState<OnboardingStatus>('unknown');

  useEffect(() => {
    if (!userId || !api) {
      setStatus('done');
      return undefined;
    }
    let live = true;
    setStatus('unknown');
    (async () => {
      const cached = await AsyncStorage.getItem(doneKey(userId)).catch(() => null);
      if (cached === '1') {
        if (live) setStatus('done');
        return;
      }
      try {
        const me = await api!.getMe();
        const state = (me.profile.onboarding_state ?? {}) as Record<string, unknown>;
        if (state.done === true) {
          await AsyncStorage.setItem(doneKey(userId), '1').catch(() => undefined);
          if (live) setStatus('done');
          return;
        }
        const skip = await AsyncStorage.getItem(SKIP_ONBOARDING_KEY).catch(() => null);
        if (skip === '1') {
          await api!.updateProfile({ onboarding_state: { ...state, done: true, via: 'skipped', at: new Date().toISOString() } });
          await AsyncStorage.multiSet([[doneKey(userId), '1']]).catch(() => undefined);
          await AsyncStorage.removeItem(SKIP_ONBOARDING_KEY).catch(() => undefined);
          if (live) setStatus('done');
          return;
        }
        if (live) setStatus('needed');
      } catch {
        // offline or the server failed: let them in rather than block the app on a flow they may have done
        if (live) setStatus('done');
      }
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  const save = useCallback(
    async (state: Record<string, unknown>) => {
      if (api) await api.updateProfile({ onboarding_state: { ...state, done: true, at: new Date().toISOString() } });
      if (userId) await AsyncStorage.setItem(doneKey(userId), '1').catch(() => undefined);
    },
    [userId],
  );
  const open = useCallback(() => setStatus('done'), []);

  const value = useMemo(() => ({ status, save, open }), [status, save, open]);
  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useOnboardingGate(): Gate {
  return useContext(GateContext);
}
