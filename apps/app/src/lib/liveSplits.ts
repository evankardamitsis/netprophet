import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { VoteSplit } from '@netprophet/db';
import { toPct, type CardPct } from './feed';
import { useApi } from './data';

/**
 * The crowd's split, moving while you look (founder, 23 Nov 2026): every vote row shows the percentages before you
 * vote too, and a screen with vote rows reads api.vote_splits every few seconds while it is on screen and the app is
 * in front. One store for the app, so a row on Σήμερα and the same match on a tournament page agree.
 */

export const POLL_MS = 8000;
/** the server reads at most 100 a call */
export const MAX_IDS = 100;

const splits = new Map<string, CardPct>();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** a fresher split for one match (your own vote's reply, or a poll); only a real change wakes the rows */
export function setLiveSplit(matchId: string, pct: CardPct): void {
  const old = splits.get(matchId);
  if (old && old.pctA === pct.pctA && old.pctB === pct.pctB && old.total === pct.total) return;
  splits.set(matchId, pct);
  emit();
}

/** a poll's reply, by match id */
export function applySplits(reply: Record<string, VoteSplit> | null | undefined): number {
  let changed = 0;
  for (const [id, s] of Object.entries(reply ?? {})) {
    const pct = toPct(s);
    const old = splits.get(id);
    if (old && old.pctA === pct.pctA && old.pctB === pct.pctB && old.total === pct.total) continue;
    splits.set(id, pct);
    changed += 1;
  }
  if (changed) emit();
  return changed;
}

export function liveSplit(matchId: string): CardPct | undefined {
  return splits.get(matchId);
}

/** for the tests */
export function resetLiveSplits(): void {
  splits.clear();
  emit();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useLiveSplit(matchId: string): CardPct | undefined {
  return useSyncExternalStore(
    subscribe,
    () => splits.get(matchId),
    () => splits.get(matchId),
  );
}

/** the ids worth polling: open rows first, at most 100, no repeats */
export function pollIds(ids: readonly (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => !!x))].slice(0, MAX_IDS);
}

/**
 * Reads the splits of `ids` every POLL_MS while this screen is focused and the app is in front. Nothing in mock mode
 * or with no ids. A failed read waits for the next tick.
 */
export function useSplitPoller(ids: readonly string[]): void {
  const api = useApi();
  const key = ids.join(',');
  const idsNow = useRef(ids);
  idsNow.current = ids;
  const focused = useRef(false);
  const active = useRef(AppState.currentState !== 'background');

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    try {
      sub = AppState.addEventListener('change', (phase) => {
        active.current = phase === 'active';
      });
    } catch {
      // no AppState: poll while focused
    }
    return () => sub?.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!api || !key) return undefined;
      focused.current = true;
      let busy = false;
      const tick = () => {
        if (!focused.current || !active.current || busy) return;
        const list = idsNow.current;
        if (!list.length) return;
        busy = true;
        api
          .voteSplits(list)
          .then(applySplits)
          .catch(() => undefined)
          .finally(() => {
            busy = false;
          });
      };
      const timer = setInterval(tick, POLL_MS);
      return () => {
        focused.current = false;
        clearInterval(timer);
      };
    }, [api, key]),
  );
}
