import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guestAllowed, useAuth } from './auth';
import { gateStatus, type OnboardingStatus } from './gateStatus';
import { loadMe, markMeStale } from './meStore';
import { api } from './supabase';

/**
 * Whether the signed-in account still has to go through onboarding. The answer is the profile's
 * onboarding_state.done (accounts from before onboarding are marked done on the server). It is
 * cached on the device, so later launches open straight to the app instead of waiting for get_me.
 * Nobody skips it (founder, 20 Oct): «Άλλη φορά» is a development button only, so its key counts only in development
 * and any value left on a device from before is cleared.
 */
export type { OnboardingStatus } from './gateStatus';

/** set by «Άλλη φορά» on the welcome screen (development builds with EXPO_PUBLIC_DEV_GUEST=1 only) */
export const SKIP_ONBOARDING_KEY = 'np.skipOnboarding';
const doneKey = (userId: string) => `np.onboarded.${userId}`;

interface Gate {
  status: OnboardingStatus;
  /** the setup is done: saves it (server and device) but stays on onboarding for the intro slides */
  save: (state: Record<string, unknown>) => Promise<void>;
  /** leaves onboarding for the app */
  open: () => void;
  /** development builds: run onboarding again on this device (the server keeps «done»; finishing saves it again) */
  replay: () => void;
}

const GateContext = createContext<Gate>({ status: 'done', save: async () => undefined, open: () => undefined, replay: () => undefined });

export function OnboardingGateProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // the answer belongs to one account: on the render a session lands it is already «unknown», so the tabs never
  // mount for a moment and mount again (that ran every first read of Σήμερα twice on a cold start)
  const [answer, setAnswer] = useState<{ user: string | null; status: OnboardingStatus }>({ user: null, status: 'done' });
  const status = gateStatus(answer, userId, api !== null);
  const setStatus = useCallback((s: OnboardingStatus) => setAnswer({ user: userId, status: s }), [userId]);

  useEffect(() => {
    if (!userId || !api) {
      setStatus('done');
      return undefined;
    }
    let live = true;
    (async () => {
      const cached = await AsyncStorage.getItem(doneKey(userId)).catch(() => null);
      if (cached === '1') {
        if (live) setStatus('done');
        return;
      }
      try {
        // the shared get_me: the header and Σήμερα take this same reply instead of asking again
        const me = await loadMe(() => api!.getMe(), { owner: userId, maxAgeMs: 0 });
        if (!me) throw new Error('get_me failed');
        const state = (me.profile.onboarding_state ?? {}) as Record<string, unknown>;
        if (state.done === true) {
          await AsyncStorage.setItem(doneKey(userId), '1').catch(() => undefined);
          if (live) setStatus('done');
          return;
        }
        const skip = guestAllowed ? await AsyncStorage.getItem(SKIP_ONBOARDING_KEY).catch(() => null) : null;
        if (!guestAllowed) await AsyncStorage.removeItem(SKIP_ONBOARDING_KEY).catch(() => undefined);
        if (skip === '1') {
          await api!.updateProfile({ onboarding_state: { ...state, done: true, via: 'skipped', at: new Date().toISOString() } });
          markMeStale();
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
  }, [userId, setStatus]);

  const save = useCallback(
    async (state: Record<string, unknown>) => {
      if (api) await api.updateProfile({ onboarding_state: { ...state, done: true, at: new Date().toISOString() } });
      markMeStale();
      if (userId) await AsyncStorage.setItem(doneKey(userId), '1').catch(() => undefined);
    },
    [userId],
  );
  const open = useCallback(() => setStatus('done'), [setStatus]);
  const replay = useCallback(() => setStatus('needed'), [setStatus]);

  const value = useMemo(() => ({ status, save, open, replay }), [status, save, open, replay]);
  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useOnboardingGate(): Gate {
  return useContext(GateContext);
}
