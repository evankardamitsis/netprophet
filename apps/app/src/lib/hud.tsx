import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';
import type { CardResult } from './feed';
import { NOTHING_HELD, hudNumbers, pinBatch, type HeldBack } from './hudNumbers';

/**
 * The header's numbers while result cards play (prototype rqApply / fly):
 * the server has already counted every result, so until the first card of a batch plays the header shows the values
 * from before it (hudNumbers.ts). A card then flies «+10» (and «+1» to σερί) up to the header and applies itself;
 * for the held card the header counts up, or σερί falls (broken) or frosts (a freeze saved it).
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
  /** subtract from get_me's points: results not played yet */
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
  const [held, setHeld] = useState<HeldBack>(NOTHING_HELD);
  const heldRef = useRef(held);
  heldRef.current = held;
  const [streakFx, setStreakFx] = useState<StreakFx>(null);
  const [onFeed, setOnFeed] = useState(true);
  const [flights, setFlights] = useState<Flight[]>([]);
  const points = useRef<View | null>(null);
  const streak = useRef<View | null>(null);
  const [questBar, setQuestBar] = useState<QuestBarNote | null>(null);
  const showQuestBar = useCallback((note: Omit<QuestBarNote, 'n'> | null) => setQuestBar(note && { ...note, n: Date.now() }), []);

  const setPending = useCallback((results: CardResult[]) => {
    setPendingState(results);
    setHeld((prev) => pinBatch(prev, results));
    setApplied((prev) => new Set([...prev].filter((id) => results.some((r) => r.id === id))));
  }, []);

  const apply = useCallback((card: CardResult) => {
    setApplied((prev) => new Set(prev).add(card.id));
    // only the held card moves the header; cards 2..N are already in it, so σερί neither falls nor frosts for them
    if (heldRef.current.first?.id !== card.id) return;
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

  // every action is a stable callback (setOnFeed is a state setter), so this value never changes
  const actions = useMemo<HudActions>(
    () => ({ setPending, setOnFeed, apply, fly, targets: { points, streak }, showQuestBar }),
    [setPending, apply, fly, showQuestBar],
  );
  const { pointsOffset, streakShown } = hudNumbers(held, pending, applied, onFeed);
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
