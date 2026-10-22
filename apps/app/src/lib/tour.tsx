import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth';
import { currentMe, markMeStale } from './meStore';
import { api } from './supabase';
import { motion } from '../theme';
import {
  currentStep,
  isTourMark,
  shouldStartTour,
  TOUR_IDLE,
  TOUR_TARGETS,
  tourKey,
  tourMarkOf,
  tourNext,
  tourSkip,
  tourStart,
  tourSteps,
  withTourMark,
  type Rect,
  type TourMark,
  type TourState,
  type TourStepId,
  type TourTarget,
} from './tourSteps';

/**
 * The first-visit tour's state (rules in tourSteps.ts). The places it points at register a measurer here (a tab, the
 * header avatar, Σήμερα's first card), and the overlay measures them in the window when a step shows, so scrolling
 * and rotation never leave a stale rect. Σήμερα says when it is calm; the tour starts then, once per account.
 */
type Measure = () => Promise<Rect | null>;

interface Registry {
  /** null unregisters; `mine` only if that measurer is still the one held */
  register: (id: TourTarget, measure: Measure | null, mine?: Measure) => void;
  measure: (id: TourTarget) => Promise<Rect | null>;
  /** Σήμερα scrolls the place into view (a no-op for the header and the tabs) */
  reveal: (id: TourTarget) => Promise<void>;
}

export interface Tour {
  /** the tour covers the screen: the moments pacer and everything else waits */
  active: boolean;
  step: TourStepId | null;
  /** the steps of this run: those whose place exists (no vote row today, no step for it) */
  steps: TourStepId[];
  /** 0-based */
  index: number;
  total: number;
  last: boolean;
  next: () => void;
  skip: () => void;
  /** «Δες ξανά την ξενάγηση»: runs again next time Σήμερα is calm */
  replay: () => void;
  /** Σήμερα: whether it is calm now, how to get it ready (scroll to the top) and how to scroll a place into view */
  setHome: (ready: boolean, prepare?: () => void, reveal?: (id: TourTarget) => Promise<void>) => void;
}

const noop = () => undefined;
const NO_STEPS: TourStepId[] = [];
const RegistryContext = createContext<Registry>({ register: noop, measure: async () => null, reveal: async () => undefined });
const TourContext = createContext<Tour>({
  active: false,
  step: null,
  steps: [],
  index: 0,
  total: 0,
  last: false,
  next: noop,
  skip: noop,
  replay: noop,
  setHome: noop,
});

/** Σήμερα's entrances settle for this long before the tour dims the screen */
const SETTLE_MS = motion.revealDur;

/**
 * Sample mode (no backend) and the development guest («Άλλη φορά», no session) have no get_me of their own: they play
 * as an account that finished onboarding (the device mirror still counts, and nothing is written to a server).
 */
const SAMPLE_PROFILE: Record<string, unknown> = { done: true };

export function TourProvider({ profile: read, children }: { profile: Record<string, unknown> | null; children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const profile = read ?? (api && userId ? null : SAMPLE_PROFILE);
  const measurers = useRef(new Map<TourTarget, Measure>());
  const [state, setState] = useState<TourState>(TOUR_IDLE);
  const [replay, setReplay] = useState(false);
  /** the device mirror, per account: undefined while reading */
  const [mirror, setMirror] = useState<{ user: string | null; mark: TourMark | null } | undefined>(undefined);
  const [homeReady, setHomeReady] = useState(false);
  const prepare = useRef<() => void>(noop);
  const revealer = useRef<(id: TourTarget) => Promise<void>>(async () => undefined);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(tourKey(userId))
      .catch(() => null)
      .then((v) => {
        if (live) setMirror({ user: userId, mark: isTourMark(v) ? v : null });
      });
    return () => {
      live = false;
    };
  }, [userId]);
  const mirrorMark = mirror && mirror.user === userId ? mirror.mark : undefined;

  // the account already has the mark (another phone, or before this device kept one): keep it here too
  const serverMark = tourMarkOf(profile);
  useEffect(() => {
    if (serverMark && mirrorMark === null) {
      setMirror({ user: userId, mark: serverMark });
      AsyncStorage.setItem(tourKey(userId), serverMark).catch(() => undefined);
    }
  }, [serverMark, mirrorMark, userId]);

  const want = state.phase === 'idle' && shouldStartTour({ homeReady, replay, mirror: mirrorMark, profile });
  useEffect(() => {
    if (!want) return undefined;
    let live = true;
    const id = setTimeout(() => {
      prepare.current();
      // the run is the steps whose place is on the screen now: measure them all, then start
      void Promise.all(TOUR_TARGETS.map((t) => (measurers.current.get(t)?.() ?? Promise.resolve(null)).catch(() => null))).then((rects) => {
        if (!live) return;
        const present = new Set(TOUR_TARGETS.filter((_, i) => rects[i] !== null));
        setReplay(false);
        setState(tourStart(tourSteps((t) => present.has(t))));
      });
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [want]);

  const finish = useCallback(
    (mark: TourMark) => {
      setMirror({ user: userId, mark });
      AsyncStorage.setItem(tourKey(userId), mark).catch(() => undefined);
      // update_profile replaces onboarding_state whole: merge onto the copy we hold, and only one that says
      // onboarding is done (a copy from before it would lose `done`)
      const state = (currentMe()?.profile.onboarding_state ?? profile) as Record<string, unknown> | null;
      if (!api || !userId || !state || state.done !== true) return;
      api
        .updateProfile({ onboarding_state: withTourMark(state, mark, new Date().toISOString()) })
        .then(() => markMeStale())
        .catch(() => undefined);
    },
    [userId, profile],
  );

  const stateNow = useRef(state);
  stateNow.current = state;
  const next = useCallback(() => {
    const s = stateNow.current;
    const n = tourNext(s);
    stateNow.current = n;
    if (n.phase === 'done' && s.phase === 'running') finish('done');
    setState(n);
  }, [finish]);
  const skip = useCallback(() => {
    const s = stateNow.current;
    if (s.phase !== 'running') return;
    stateNow.current = tourSkip(s);
    finish('skipped');
    setState(stateNow.current);
  }, [finish]);
  const replayTour = useCallback(() => {
    setState(TOUR_IDLE);
    setReplay(true);
  }, []);
  const setHome = useCallback((ready: boolean, prep?: () => void, reveal?: (id: TourTarget) => Promise<void>) => {
    if (prep) prepare.current = prep;
    if (reveal) revealer.current = reveal;
    setHomeReady(ready);
  }, []);

  const registry = useMemo<Registry>(
    () => ({
      register: (id, m, mine) => {
        if (m) measurers.current.set(id, m);
        // only the one leaving takes its id away (a newer header may have taken it already)
        else if (!mine || measurers.current.get(id) === mine) measurers.current.delete(id);
      },
      measure: (id) => measurers.current.get(id)?.() ?? Promise.resolve(null),
      reveal: (id) => revealer.current(id),
    }),
    [],
  );

  const running = state.phase === 'running' ? state : null;
  const tour = useMemo<Tour>(
    () => ({
      active: running !== null,
      step: currentStep(state),
      steps: running?.steps ?? NO_STEPS,
      index: running?.index ?? 0,
      total: running?.steps.length ?? 0,
      last: running !== null && running.index === running.steps.length - 1,
      next,
      skip,
      replay: replayTour,
      setHome,
    }),
    [state, running, next, skip, replayTour, setHome],
  );

  return (
    <RegistryContext.Provider value={registry}>
      <TourContext.Provider value={tour}>{children}</TourContext.Provider>
    </RegistryContext.Provider>
  );
}

export function useTour(): Tour {
  return useContext(TourContext);
}

export function useTourRegistry(): Registry {
  return useContext(RegistryContext);
}

/** a view's rect in the window; null while it is not laid out */
export function measureView(ref: RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

/**
 * A place the tour points at: put the returned ref on its view. `enabled` false leaves it out (every tab screen has
 * its own header, and only the one in front may answer for the avatar).
 */
export function useTourTarget<T extends View = View>(id: TourTarget, enabled = true): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { register } = useTourRegistry();
  useEffect(() => {
    if (!enabled) return undefined;
    const m = () => measureView(ref);
    register(id, m);
    return () => register(id, null, m);
  }, [id, enabled, register]);
  return ref;
}
