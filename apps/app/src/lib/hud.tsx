import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';
import type { CardResult } from './feed';

/**
 * The header's numbers while result cards play (prototype rqApply / fly):
 * the server has already counted every result, so until a card plays the header shows the values from before it.
 * A card then flies «+10» (and «+1» to σερί) up to the header and applies itself; the header counts up,
 * or σερί falls (broken) or frosts (a freeze saved it).
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

interface Hud {
  /** subtract from get_me's points: results not played yet */
  pointsOffset: number;
  /** σερί to show instead of get_me's, while a result is pending */
  streakShown: number | null;
  streakFx: StreakFx;
  flights: Flight[];
  setPending(results: CardResult[]): void;
  /** the card's moment: its points and σερί reach the header */
  apply(card: CardResult): void;
  /** «+10» to πόντοι, and «+1» to σερί when `withStreak` */
  fly(from: RefObject<View | null>, points: number, withStreak: boolean): void;
  targets: { points: RefObject<View | null>; streak: RefObject<View | null> };
}

const HudContext = createContext<Hud | null>(null);

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
  const [streakFx, setStreakFx] = useState<StreakFx>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const points = useRef<View | null>(null);
  const streak = useRef<View | null>(null);

  const setPending = useCallback((results: CardResult[]) => {
    setPendingState(results);
    setApplied((prev) => new Set([...prev].filter((id) => results.some((r) => r.id === id))));
  }, []);

  const apply = useCallback((card: CardResult) => {
    setApplied((prev) => new Set(prev).add(card.id));
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

  const value = useMemo<Hud>(() => {
    const waiting = pending.filter((r) => !applied.has(r.id));
    return {
      pointsOffset: waiting.reduce((sum, r) => sum + r.points, 0),
      streakShown: waiting.length ? waiting[0]!.streakBefore : null,
      streakFx,
      flights,
      setPending,
      apply,
      fly,
      targets: { points, streak },
    };
  }, [pending, applied, streakFx, flights, setPending, apply, fly]);

  return <HudContext.Provider value={value}>{children}</HudContext.Provider>;
}

export function useHud(): Hud {
  const ctx = useContext(HudContext);
  if (!ctx) throw new Error('useHud outside HudProvider');
  return ctx;
}
