import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useApi, type MeRefresh } from './data';
import { revealMockUnlocks, useNewPlayer } from './newPlayer';
import { ALL_STEP_IDS, featureSet, hasFeature } from './unlockLadder';

/**
 * Which parts of the app are open for this player (the unlock ladder). Hidden means hidden: no teasers.
 * Live: the step ids from get_me. Mock mode and the dev guest: everything, unless the dev «Νέος παίκτης» is on.
 * While get_me is still loading everything shows, so nothing flickers in and out.
 *
 * The tabs layout mounts <UnlocksProvider> (it already fetches get_me) and hands the ids over; the screens that sit
 * outside the tabs (the add-match modal) read the same state through useUnlocks().
 */
export interface Unlocks {
  has(feature: string): boolean;
  /** the step ids that are open */
  unlocked: string[];
  /**
   * Read the ladder again (after a celebration, on Εγώ, after votes). The dev «Νέος παίκτης» only shows new steps once
   * their moment is over, so it reveals them only for `{ afterMoment: true }`. `ifStale`: only when the get_me held is
   * older than ME_STALE_MS (a screen coming into view); `since`: an action's time (an older read in flight is not reused).
   */
  refresh(opts?: { afterMoment?: boolean } & MeRefresh): Promise<void>;
}

let server: string[] | null = null;
let refreshMe: (opts?: MeRefresh) => Promise<void> = async () => undefined;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const publish = (ids: string[] | null) => {
  server = ids;
  listeners.forEach((l) => l());
};

export function UnlocksProvider({ serverUnlocked, refresh, children }: { serverUnlocked: string[] | null; refresh: (opts?: MeRefresh) => Promise<void>; children: ReactNode }) {
  useEffect(() => {
    refreshMe = refresh;
  }, [refresh]);
  useEffect(() => {
    publish(serverUnlocked);
  }, [serverUnlocked]);
  useEffect(
    () => () => {
      publish(null);
      refreshMe = async () => undefined;
    },
    [],
  );
  return <>{children}</>;
}

export function useUnlocks(): Unlocks {
  const api = useApi();
  const np = useNewPlayer();
  const fromServer = useSyncExternalStore(subscribe, () => server, () => server);
  const unlocked = api ? fromServer : __DEV__ && np.on ? np.shown : null;
  const features = useMemo(() => featureSet(unlocked), [unlocked]);
  const has = useCallback((feature: string) => hasFeature(features, feature), [features]);
  const refresh = useCallback(
    async (opts?: { afterMoment?: boolean } & MeRefresh) => {
      if (api) await refreshMe({ ifStale: opts?.ifStale, since: opts?.since });
      else if (opts?.afterMoment) revealMockUnlocks();
    },
    [api],
  );
  return useMemo(() => ({ has, unlocked: unlocked ?? ALL_STEP_IDS, refresh }), [has, unlocked, refresh]);
}
