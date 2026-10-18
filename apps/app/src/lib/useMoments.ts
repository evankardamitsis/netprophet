import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { claim as claimIn, coldStart, debounce, mayShow, REFETCH_AFTER_ACTION_MS, onAction, onAppPhase, pick as pickIn, type AppPhase, type MomentKind, type PacerState } from './moments';

/**
 * The one copy of the pacer for every screen (see moments.ts). It lives in memory: a cold start is a new visit
 * anyway, and what must last longer (the Baller offer, «Για σένα» once a day, celebrations) keeps its own mark.
 */
let state: PacerState = coldStart();
const listeners = new Set<() => void>();
const set = (next: PacerState) => {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
};

let watching = false;
function watchAppState() {
  if (watching) return;
  watching = true;
  try {
    AppState.addEventListener('change', (phase) => set(onAppPhase(state, phase as AppPhase, Date.now())));
  } catch {
    // no AppState (tests): every start stays one visit
  }
}

const subscribe = (l: () => void) => {
  watchAppState();
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

/** screens that read the celebration queue again once an action settles (Σήμερα's feed) */
const actionListeners = new Set<() => void>();
const afterAction = debounce(() => actionListeners.forEach((l) => l()), REFETCH_AFTER_ACTION_MS);

/**
 * The player did something that matters and it went through (a vote, an answer, a confirmation): from here a
 * moment may come, and the celebration queue is read again a second after the last one, so what that action earned
 * plays right after its reveal, this visit.
 */
export function momentsAct() {
  set(onAction(state));
  afterAction.call();
}

/** run `l` (debounced) after every action; returns the unsubscribe */
export function onMomentsAction(l: () => void): () => void {
  actionListeners.add(l);
  return () => {
    actionListeners.delete(l);
  };
}

export interface Moments {
  /** a moment may cover the screen now (`asked`: the player opened the place it belongs to) */
  may: (opts?: { asked?: boolean }) => boolean;
  /** which of the ready moments plays now, if any */
  pick: (ready: readonly MomentKind[], opts?: { asked?: boolean }) => MomentKind | null;
  /** the moment starts showing: false when the visit has no room (leave it queued) */
  claim: (kind: MomentKind, opts?: { asked?: boolean }) => boolean;
  /** what already played this visit */
  shown: MomentKind | null;
  acted: boolean;
}

export function useMoments(): Moments {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  const claim = useCallback((kind: MomentKind, opts?: { asked?: boolean }) => {
    const next = claimIn(state, kind, opts);
    if (!next) return false;
    set(next);
    return true;
  }, []);
  const may = useCallback((opts?: { asked?: boolean }) => mayShow(state, opts), []);
  const pick = useCallback((ready: readonly MomentKind[], opts?: { asked?: boolean }) => pickIn(state, ready, opts), []);
  return { may, pick, claim, shown: s.shown, acted: s.acted };
}
