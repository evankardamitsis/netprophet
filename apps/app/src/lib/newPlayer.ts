import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { newPlayerStart, newPlayerVote, type NewPlayerState } from './unlockLadder';

/**
 * Dev builds only, guest/mock mode: «Νέος παίκτης» plays the unlock ladder locally. Each mock vote advances the
 * counters; the opened steps show (`shown`) only once their celebration is dismissed (`reveal`).
 */
const KEY = 'np.dev.newPlayer';

interface Snap {
  on: boolean;
  /** the steps the UI shows as open */
  shown: string[];
}

let on = false;
let hydrated: Promise<void> | null = null;
let state: NewPlayerState = newPlayerStart();
let shown: string[] = state.unlocked;
let snap: Snap = { on, shown };
const listeners = new Set<() => void>();

function emit() {
  snap = { on, shown };
  listeners.forEach((l) => l());
}

/** reads the saved toggle once */
export function hydrateNewPlayer(): Promise<void> {
  if (!hydrated) {
    hydrated = (__DEV__ ? AsyncStorage.getItem(KEY).catch(() => null) : Promise.resolve(null)).then((v) => {
      if (v === '1') on = true;
      emit();
    });
  }
  return hydrated;
}

export function isNewPlayerOn(): boolean {
  return __DEV__ && on;
}

export function setNewPlayer(next: boolean) {
  on = next;
  state = newPlayerStart();
  shown = state.unlocked;
  AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => undefined);
  emit();
}

/** a mock vote was cast: the steps it opened (none when the toggle is off) */
export function recordMockVote(): string[] {
  if (!isNewPlayerOn()) return [];
  const r = newPlayerVote(state);
  state = r.state;
  return r.newlyUnlocked;
}

/** the celebrations were dismissed: show what the votes opened */
export function revealMockUnlocks() {
  shown = state.unlocked;
  emit();
}

export function useNewPlayer(): Snap {
  void hydrateNewPlayer();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snap,
    () => snap,
  );
}
