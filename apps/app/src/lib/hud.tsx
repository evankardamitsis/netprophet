import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';
import type { CardResult } from './feed';
import { hudNumbers } from './hudNumbers';
import { NOTHING_HELD_POINTS, claim, land, landClaimed, pointsOffset as heldPointsOffset, syncQueue, type HeldPoints } from './hudPoints';
import { motion } from '../theme';

/**
 * The header's numbers while result cards play (prototype rqApply / fly):
 * the server has already counted every result, so the header shows each card's points only once its flight lands
 * (hudPoints.ts) and the σερί from before the card that plays (hudNumbers.ts). A card then flies «+10» (and «+1» to
 * σερί) up to the header and applies itself: σερί counts up, falls (broken) or frosts (a freeze saved it), card by card.
 */
export type StreakFx = 'fall' | 'frost' | null;

export interface Flight {
  id: string;
  text: string;
  /** start, window coordinates */
  x: number;
  y: number;
  /** travel to the target */
  dx: number;
  dy: number;
  delay: number;
}

/**
 * Three contexts, so a screen only re-renders for what it reads: the actions never change (Σήμερα and the result
 * cards only call them), the header's numbers change when a card applies, the layers (flights, the quest bar) on
 * every flight.
 */
export interface HudNumbers {
  /** subtract from get_me's points: right calls whose flight has not landed yet */
  pointsOffset: number;
  /** σερί to show instead of get_me's, while a result is pending */
  streakShown: number | null;
  streakFx: StreakFx;
}

export interface HudLayers {
  flights: Flight[];
  /** the slim quest bar after a vote; drawn by the tabs layout over the tab bar (prototype) */
  questBar: QuestBarNote | null;
}

export interface HudActions {
  setPending(results: CardResult[]): void;
  /** the feed (where result cards play) is on screen; elsewhere the header shows get_me as it is */
  setOnFeed(on: boolean): void;
  /** the card's moment: its points and σερί reach the header */
  apply(card: CardResult): void;
  /** «Πάρε τους πόντους»: one flight for everything taken; the header counts the sum up when it lands */
  takeAll(from: RefObject<View | null>, ids: string[], points: number, withStreak: boolean): void;
  /** «+10» to πόντοι, and «+1» to σερί when `withStreak` */
  fly(from: RefObject<View | null>, points: number, withStreak: boolean): void;
  targets: { points: RefObject<View | null>; streak: RefObject<View | null> };
  showQuestBar(note: Omit<QuestBarNote, 'n'> | null): void;
}

export interface QuestBarNote {
  title: string;
  from: number;
  to: number;
  progress: number;
  target: number;
  n: number;
}

const ActionsContext = createContext<HudActions | null>(null);
const NumbersContext = createContext<HudNumbers | null>(null);
const LayersContext = createContext<HudLayers | null>(null);

const STAGGER = 70;
const FLIGHT_LIFE_MS = 1500;
const FX_MS = 1600;
/** after a flight's last frame */
const LAND_SLACK_MS = 30;

function measure(ref: RefObject<View | null>): Promise<{ x: number; y: number; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
  });
}

export function HudProvider({ children }: { children: ReactNode }) {
  const [pending, setPendingState] = useState<CardResult[]>([]);
  const [applied, setApplied] = useState<Set<string>>(() => new Set());
  const [heldPoints, setHeldPoints] = useState<HeldPoints>(NOTHING_HELD_POINTS);
  const [streakFx, setStreakFx] = useState<StreakFx>(null);
  const [onFeed, setOnFeed] = useState(true);
  const [flights, setFlights] = useState<Flight[]>([]);
  const points = useRef<View | null>(null);
  const streak = useRef<View | null>(null);
  const [questBar, setQuestBar] = useState<QuestBarNote | null>(null);
  const showQuestBar = useCallback((note: Omit<QuestBarNote, 'n'> | null) => setQuestBar(note && { ...note, n: Date.now() }), []);

  const setPending = useCallback((results: CardResult[]) => {
    setPendingState(results);
    setHeldPoints((prev) => syncQueue(prev, results));
    setApplied((prev) => new Set([...prev].filter((id) => results.some((r) => r.id === id))));
  }, []);

  const apply = useCallback((card: CardResult) => {
    setApplied((prev) => new Set(prev).add(card.id));
    // the card's points join the header; it counts up by exactly these
    setHeldPoints((prev) => land(prev, card.id));
    // σερί goes card by card (hudNumbers.ts): every wrong call plays its own fall, or a frost when a freeze saved it
    if (!card.ok) {
      setStreakFx(card.frozen ? 'frost' : card.streakBefore > 0 ? 'fall' : null);
      setTimeout(() => setStreakFx(null), FX_MS);
    }
  }, []);

  const fly = useCallback(async (from: RefObject<View | null>, pts: number, withStreak: boolean) => {
    const [src, tp, ts] = await Promise.all([measure(from), measure(points), measure(streak)]);
    if (!src || !tp) return;
    // prototype: start 24px in and 30px down from the card's corner, badge centred on the target
    const sx = Math.max(16, src.x + 24);
    const sy = Math.max(90, src.y + 30);
    const k = String(Date.now());
    const mk = (t: { x: number; y: number; w: number; h: number }, text: string, delay: number, id: string): Flight => ({
      id,
      text,
      x: sx,
      y: sy,
      dx: Math.round(t.x + t.w / 2 - sx - 20),
      dy: Math.round(t.y + t.h / 2 - sy - 14),
      delay,
    });
    const list = [mk(tp, `+${pts}`, 0, `${k}p`)];
    if (withStreak && ts) list.push(mk(ts, '+1', STAGGER * 3, `${k}s`));
    setFlights((f) => f.concat(list));
    setTimeout(() => setFlights((f) => f.filter((x) => !list.some((l) => l.id === x.id))), FLIGHT_LIFE_MS);
  }, []);

  const takeAll = useCallback(
    (from: RefObject<View | null>, ids: string[], pts: number, withStreak: boolean) => {
      setHeldPoints((prev) => claim(prev, ids));
      if (pts > 0) void fly(from, pts, withStreak);
      // the flight lasts one reveal; the header counts the whole sum up when it lands, never before
      setTimeout(() => setHeldPoints((prev) => landClaimed(prev)), (pts > 0 ? motion.revealDur : 0) + LAND_SLACK_MS);
    },
    [fly],
  );

  // every action is a stable callback (setOnFeed is a state setter), so this value never changes
  const actions = useMemo<HudActions>(
    () => ({ setPending, setOnFeed, apply, fly, takeAll, targets: { points, streak }, showQuestBar }),
    [setPending, apply, fly, takeAll, showQuestBar],
  );
  const { streakShown } = hudNumbers(pending, applied, onFeed);
  const pointsOffset = heldPointsOffset(heldPoints, onFeed);
  const numbers = useMemo<HudNumbers>(() => ({ pointsOffset, streakShown, streakFx }), [pointsOffset, streakShown, streakFx]);
  const layers = useMemo<HudLayers>(() => ({ flights, questBar }), [flights, questBar]);

  return (
    <ActionsContext.Provider value={actions}>
      <NumbersContext.Provider value={numbers}>
        <LayersContext.Provider value={layers}>{children}</LayersContext.Provider>
      </NumbersContext.Provider>
    </ActionsContext.Provider>
  );
}

function need<T>(v: T | null, name: string): T {
  if (!v) throw new Error(`${name} outside HudProvider`);
  return v;
}

/** setPending, apply, fly, showQuestBar…: never changes, so a reader does not re-render on a flight */
export function useHudActions(): HudActions {
  return need(useContext(ActionsContext), 'useHudActions');
}

/** the header's numbers */
export function useHudNumbers(): HudNumbers {
  return need(useContext(NumbersContext), 'useHudNumbers');
}

/** the flights and the quest bar */
export function useHudLayers(): HudLayers {
  return need(useContext(LayersContext), 'useHudLayers');
}
