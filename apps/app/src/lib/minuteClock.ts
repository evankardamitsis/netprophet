import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { msToNextMinute } from './homeGuidance';

/**
 * One clock for every «Κλείνει σε 20′» tag: it ticks on the wall clock's whole minute, and again when the app comes
 * back to the front (a phone asleep for an hour must not show an old count). It runs only while a tag listens.
 */

const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setTimeout> | null = null;
let appSub: { remove: () => void } | null = null;

function tick() {
  now = Date.now();
  for (const l of listeners) l();
}

function schedule() {
  timer = setTimeout(() => {
    tick();
    schedule();
  }, msToNextMinute(new Date()));
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  if (listeners.size === 1) {
    now = Date.now();
    schedule();
    appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) {
      if (timer) clearTimeout(timer);
      timer = null;
      appSub?.remove();
      appSub = null;
    }
  };
}

/** the time now, to the minute; re-renders the caller on each tick */
export function useMinuteClock(): number {
  return useSyncExternalStore(subscribe, () => now);
}
