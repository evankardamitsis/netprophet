/**
 * The first-visit tour on Σήμερα (founder, 20 Oct: "a small wizard when the player first joins, on the first screen,
 * to navigate him around"). Pure rules here, so they are tested without React; `tour.tsx` holds the state and
 * `TourOverlay` draws it.
 *
 * - Once per account: the mark lives on the profile (onboarding_state.tour = 'done' | 'skipped') with a mirror on the
 *   device, so a later launch never flashes it. Accounts from before the tour have no mark and see it once.
 * - It starts only once onboarding is done on the server copy we hold (so writing the mark never drops `done`), and
 *   only while Σήμερα is calm: its feed loaded, no result card, celebration or sheet in front.
 * - «Δες ξανά την ξενάγηση» (Εγώ › Ρυθμίσεις) runs it again whatever the mark says.
 */
export type TourStepId = 'vote' | 'streak' | 'tournaments' | 'results' | 'ladder' | 'me';

/**
 * What each step points at (the Τουρνουά home, 22 Oct): the first open vote row, the σερί and πόντοι in the header,
 * the first card of «Τουρνουά σήμερα», and three tabs. A tab that is not in the bar (the Ladder until it is
 * unlocked) has no target, so its step is left out like any other whose place is missing.
 */
export type TourTarget = 'vote' | 'stats' | 'tournament' | `tab:${string}`;

export const TOUR_STEPS: readonly TourStepId[] = ['vote', 'streak', 'tournaments', 'results', 'ladder', 'me'];

export function targetOf(step: TourStepId): TourTarget {
  switch (step) {
    case 'vote':
      return 'vote';
    case 'streak':
      return 'stats';
    case 'tournaments':
      return 'tournament';
    case 'results':
      return 'tab:results';
    case 'ladder':
      return 'tab:ladder';
    case 'me':
      return 'tab:me';
  }
}

/** every place a step can point at */
export const TOUR_TARGETS: readonly TourTarget[] = TOUR_STEPS.map(targetOf);

/**
 * The steps of a run: those whose place exists right now (`present`). A new account with no match today has no vote
 * row and no tournament card, and the tour tells the rest; a tab still locked is not in the bar and is skipped.
 */
export function tourSteps(present: (target: TourTarget) => boolean): TourStepId[] {
  return TOUR_STEPS.filter((s) => present(targetOf(s)));
}

/** the steps that stand on Σήμερα's scrolling list: the tour scrolls them into view before it lights them */
export function scrollsHome(step: TourStepId): boolean {
  return step === 'vote' || step === 'tournaments';
}

export type TourMark = 'done' | 'skipped';

/** the device mirror of the mark, one per account */
export const tourKey = (userId: string | null) => `np.tour.${userId ?? 'guest'}`;

export function isTourMark(v: unknown): v is TourMark {
  return v === 'done' || v === 'skipped';
}

/** the mark kept on the profile's onboarding_state, or null when the tour never ran to an end */
export function tourMarkOf(state: unknown): TourMark | null {
  if (!state || typeof state !== 'object') return null;
  const v = (state as Record<string, unknown>).tour;
  return isTourMark(v) ? v : null;
}

/**
 * The onboarding_state to write: update_profile replaces the whole object, so everything already in it stays
 * (done, via, at) and only the tour's mark and when it was set are added.
 */
export function withTourMark(state: Record<string, unknown> | null | undefined, mark: TourMark, at: string): Record<string, unknown> {
  return { ...(state ?? {}), tour: mark, tour_at: at };
}

export interface StartCheck {
  /** Σήμερα is in front and calm (feed loaded, nothing else covering it) */
  homeReady: boolean;
  /** asked for again from Ρυθμίσεις */
  replay: boolean;
  /** the device mirror: undefined while reading, null when this device has none */
  mirror: TourMark | null | undefined;
  /** the profile's onboarding_state as last read; null while get_me has not answered */
  profile: Record<string, unknown> | null;
}

export function shouldStartTour(c: StartCheck): boolean {
  if (!c.homeReady) return false;
  if (c.replay) return true;
  // still reading the device, or this device already has the mark: nothing flashes
  if (c.mirror === undefined || c.mirror !== null) return false;
  if (!c.profile) return false;
  // a snapshot from before onboarding finished: wait for the fresh one, so the mark is never written over it
  if (c.profile.done !== true) return false;
  return tourMarkOf(c.profile) === null;
}

export type TourState =
  | { phase: 'idle' }
  | { phase: 'running'; steps: TourStepId[]; index: number }
  | { phase: TourMark };

export const TOUR_IDLE: TourState = { phase: 'idle' };

export function tourStart(steps: TourStepId[]): TourState {
  return steps.length > 0 ? { phase: 'running', steps, index: 0 } : { phase: 'done' };
}

/** «Επόμενο ›»: the next step, or done after the last one */
export function tourNext(s: TourState): TourState {
  if (s.phase !== 'running') return s;
  return s.index + 1 < s.steps.length ? { ...s, index: s.index + 1 } : { phase: 'done' };
}

/** «Παράλειψη» (or Android's back) */
export function tourSkip(s: TourState): TourState {
  return s.phase === 'running' ? { phase: 'skipped' } : s;
}

export function currentStep(s: TourState): TourStepId | null {
  return s.phase === 'running' ? s.steps[s.index] ?? null : null;
}

export function isLastStep(s: TourState): boolean {
  return s.phase === 'running' && s.index === s.steps.length - 1;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How far Σήμερα's list must scroll (positive: down) to bring `target` into `view`: 0 when it is already wholly
 * there, else enough to put its top `pad` under the view's top. The caller keeps the offset at 0 or more.
 */
export function revealDelta(target: Rect, view: { top: number; bottom: number }, pad: number): number {
  if (target.y >= view.top && target.y + target.height <= view.bottom) return 0;
  return target.y - (view.top + pad);
}

/** the cut-out around a target: `pad` of room, kept inside `bounds` (a tall card is cut at the tab bar) */
export function spotlight(target: Rect, pad: number, bounds: { top: number; bottom: number; left: number; right: number }): Rect {
  const x = Math.max(bounds.left, target.x - pad);
  const y = Math.max(bounds.top, target.y - pad);
  const right = Math.min(bounds.right, target.x + target.width + pad);
  const bottom = Math.min(bounds.bottom, target.y + target.height + pad);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/**
 * Where the tooltip card sits: under the cut-out when it fits there (the avatar, the feed), above it otherwise (the
 * tabs at the bottom), never off the screen.
 */
export function placeTooltip(hole: Rect, screenHeight: number, cardHeight: number, gap: number, margin: number): number {
  const below = hole.y + hole.height + gap;
  if (below + cardHeight <= screenHeight - margin) return below;
  const above = hole.y - gap - cardHeight;
  if (above >= margin) return above;
  // neither fits whole (a tall card on a small phone): over the cut-out's lower part, inside the screen
  return Math.max(margin, screenHeight - margin - cardHeight);
}
