import { useEffect, type RefObject } from 'react';
import type { ScrollView } from 'react-native';
import { useScrollToTop } from 'expo-router';

/**
 * Tap the tab you are on (once, or twice: founder, 21 Oct) and its screen scrolls to the top, animated (the iOS way).
 * The tab bar sends `tabPress` on every tap, the open tab's too; react-navigation's useScrollToTop listens for it on
 * the focused screen. Εγώ is not in the bar: its way in is the header avatar, which asks here instead.
 */
const listeners = new Map<string, Set<() => void>>();

/** the header avatar tapped while Εγώ is open */
export function requestScrollTop(screen: string): void {
  listeners.get(screen)?.forEach((l) => l());
}

export function useTabScrollTop(ref: RefObject<ScrollView | null>, screen?: string): void {
  useScrollToTop(ref);
  useEffect(() => {
    if (!screen) return undefined;
    const l = () => ref.current?.scrollTo({ y: 0, animated: true });
    const set = listeners.get(screen) ?? new Set<() => void>();
    set.add(l);
    listeners.set(screen, set);
    return () => {
      set.delete(l);
    };
  }, [ref, screen]);
}
