import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { PathContext } from './tournamentToday';

/**
 * Press and hold a player's name (Πρόγραμμα, Ταμπλό, Σήμερα's cards) for their run in that tournament, full screen
 * (founder, 21 Oct). A tap keeps doing what it did. The hold is 350ms, shorter than a card's 450ms «Αναφορά».
 */
export const HOLD_MS = 350;

/** `ctx`: the match the name was held on, so «Αν κερδίσει» speaks of that match */
export function openPlayerPath(tournamentId: string, playerId: string, ctx: PathContext = null) {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  const at = !ctx ? {} : 'match' in ctx ? { match: ctx.match } : { slot: `${ctx.round}|${ctx.slot}|${ctx.tab}` };
  router.push({ pathname: '/tournament-player', params: { tournament: tournamentId, player: playerId, ...at } });
}

/** the route params back to a context */
export function contextOf(match?: string, slot?: string): PathContext {
  if (match) return { match };
  if (!slot) return null;
  const [round, at, ...tab] = slot.split('|');
  const r = Number(round);
  const s = Number(at);
  return Number.isFinite(r) && Number.isFinite(s) && tab.length > 0 ? { tab: tab.join('|'), round: r, slot: s } : null;
}

/**
 * Press handlers for a hold: a timer from the touch (Text has no delayLongPress of its own), `onLongPress` as the
 * fallback where the timer cannot start, and a tap that does not also fire after a hold. A scroll cancels the touch,
 * and with it the timer.
 */
export function useHold(onHold: (() => void) | undefined, onTap?: () => void, ms = HOLD_MS) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  if (!onHold) return { onPress: onTap };
  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    onHold();
  };
  const start = () => {
    fired.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fire, ms);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const onPress = () => {
    if (fired.current) {
      fired.current = false;
      return;
    }
    onTap?.();
  };
  // on the web a Text only knows a click: the hold runs on pointer events (a scroll cancels the pointer), and the
  // browser's own long-press menu stays shut
  if (Platform.OS === 'web') {
    const web = {
      onPress,
      onPointerDown: start,
      onPointerUp: stop,
      onPointerCancel: stop,
      onPointerLeave: stop,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    };
    return web as unknown as { onPress: () => void };
  }
  return { onPressIn: start, onPressOut: stop, onPress, onLongPress: fire };
}

/** a name (inside a line of Text) that opens the player's profile on a tap and their run here on a hold */
export function HoldName({
  tournamentId,
  playerId,
  ctx = null,
  onTap,
  style,
  children,
}: {
  tournamentId: string | null;
  playerId: string | null;
  ctx?: PathContext;
  onTap?: () => void;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const hold = useHold(tournamentId && playerId ? () => openPlayerPath(tournamentId, playerId, ctx) : undefined, onTap);
  return (
    <Text {...hold} style={style} suppressHighlighting>
      {children}
    </Text>
  );
}

/* ================= the hint, once per device ================= */

const HINT_KEY = 'np.hint.nameHold';
let hintShown = false;

/** true once, the first time a screen with holdable names opens on this device */
export function useHoldHint(ready: boolean): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!ready || hintShown) return undefined;
    let live = true;
    AsyncStorage.getItem(HINT_KEY)
      .catch(() => '1')
      .then((v) => {
        if (!live || v === '1' || hintShown) return;
        hintShown = true;
        setShow(true);
        AsyncStorage.setItem(HINT_KEY, '1').catch(() => undefined);
      });
    return () => {
      live = false;
    };
  }, [ready]);
  return show;
}
