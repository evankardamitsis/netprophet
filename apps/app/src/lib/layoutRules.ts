import { layout } from '@netprophet/tokens';

/** phone under 600 pt, tablet from 600, wide from 1024 (tablet board, 24 Nov 2026) */
export type LayoutKind = 'phone' | 'tablet' | 'wide';

export interface Layout {
  kind: LayoutKind;
  /** the window's width, capped at the page's widest */
  width: number;
  /** from `wide`: a side rail instead of the header and the bottom bar */
  rail: boolean;
  /** from `tablet`: sheets open as centred dialogs */
  dialogs: boolean;
  /** the width the screens get: the window less the rail */
  content: number;
  /** the side padding of a page */
  gutter: number;
}

const GUTTER: Record<LayoutKind, number> = { phone: 16, tablet: 28, wide: 36 };

/** pure, so the rules are tested without a screen; useLayout() feeds it the window */
export function layoutFor(windowWidth: number): Layout {
  const width = Math.max(0, Math.min(windowWidth, layout.page));
  const kind: LayoutKind = width >= layout.wide ? 'wide' : width >= layout.tablet ? 'tablet' : 'phone';
  const rail = kind === 'wide';
  return { kind, width, rail, dialogs: kind !== 'phone', content: rail ? width - layout.rail : width, gutter: GUTTER[kind] };
}

/**
 * How many cards of at least `min` wide fit a row of `available` with `gap` between them, between 1 and `max`. A row of
 * cards is never wider than the room it has, and a card never narrower than `min`.
 */
export function columnsFor(available: number, min: number, gap = 12, max = 3): number {
  if (available <= 0 || min <= 0) return 1;
  const n = Math.floor((available + gap) / (min + gap));
  return Math.max(1, Math.min(max, n));
}
