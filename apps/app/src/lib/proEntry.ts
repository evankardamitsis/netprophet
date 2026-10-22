import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { track } from './analytics';
import { useApi } from './data';
import { currentMe, subscribeMe } from './meStore';
import { markSeen, parseSeen, showsProEntry, type ProMoment, type ProSeen } from './proEntries';

/**
 * The glue for the Pro entries (rules in proEntries.ts): which day each capped moment was tapped is kept on this
 * device only (per viewer, never in the database), read once, and every read and write is wrapped so storage that
 * fails or is blocked just means the entry shows as if nothing was tapped.
 */
const KEY = 'np.pro.entries.v1';

let seen: ProSeen = {};
let ready = false;
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function hydrate() {
  if (loading) return;
  loading = (async () => {
    try {
      seen = { ...parseSeen(await AsyncStorage.getItem(KEY)), ...seen };
    } catch {
      // unreadable storage: nothing was tapped before
    }
    ready = true;
    emit();
  })();
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const snapshot = () => version;

/** a Pro entry was tapped: count it, let a capped moment rest for the day, open the Pro screen at that moment */
export function openProEntry(moment: ProMoment): void {
  track('pro_entry_pressed', { moment });
  const next = markSeen(seen, moment, new Date());
  if (next !== seen) {
    seen = next;
    emit();
    void (async () => {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(seen));
      } catch {
        // the day's rest then lasts until the app closes
      }
    })();
  }
  router.push(`/pro?from=${moment}`);
}

/** true or false once get_me is in; null while it loads. Without an account (mock mode) nobody has Pro. */
export function useIsPro(): boolean | null {
  const api = useApi();
  const raw = useSyncExternalStore(subscribeMe, currentMe, currentMe);
  if (!api) return false;
  return raw ? raw.pro === true : null;
}

/**
 * Should this moment show its Pro entry, and the tap that opens Pro. `pro` can be passed when the screen already knows
 * (the home reads get_pro); otherwise it is the shared get_me.
 */
export function useProEntry(moment: ProMoment, pro?: boolean | null): { show: boolean; open: () => void } {
  const fromMe = useIsPro();
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const show = showsProEntry({ moment, pro: pro === undefined ? fromMe : pro, seen, now: new Date(), ready });
  return { show, open: () => openProEntry(moment) };
}
