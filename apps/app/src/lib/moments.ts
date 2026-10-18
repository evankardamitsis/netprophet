/**
 * The moments pacer (founder, 18 Oct: "show at most one per visit, after the first vote, and play those when they
 * should, not all on load"). Pure rules here, so they are tested without React; `useMoments` holds the one copy.
 *
 * - A visit is a cold start, or the app coming back after 30 minutes or more in the background.
 * - Nothing interrupts until the player does something that matters this visit: a vote, an answer in the game of
 *   the day, a confirmation. Something the player asked for (opening Εγώ for the Baller offer) counts as its own
 *   context.
 * - One interrupting moment a visit. The rest stay queued: celebrations are acknowledged only once they played, so
 *   the server hands the others back next visit; the Baller offer and «Για σένα» keep their own "already shown"
 *   marks only for the one that showed.
 *
 * Not paced: result cards (inline, the player taps them), the quest bar and toasts, ProNudge (one quiet line the
 * server allows once a day), the +30 inside the game. None of them covers the screen.
 */

/** the moments that cover the screen, highest priority first */
export const MOMENT_PRIORITY = ['celebration', 'baller', 'forYou'] as const;
export type MomentKind = (typeof MOMENT_PRIORITY)[number];

/** this long in the background starts a new visit */
export const VISIT_GAP_MS = 30 * 60 * 1000;

export type AppPhase = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export interface PacerState {
  /** counts visits since the cold start (1 is the cold start) */
  visit: number;
  /** when the app last left the foreground; null while in it */
  backgroundAt: number | null;
  /** the player did something that matters this visit */
  acted: boolean;
  /** the one moment this visit already used */
  shown: MomentKind | null;
}

/** a cold start is a visit of its own */
export function coldStart(): PacerState {
  return { visit: 1, backgroundAt: null, acted: false, shown: null };
}

/** the app went to the background or came back: back after the gap is a new visit, nothing done and nothing shown */
export function onAppPhase(s: PacerState, phase: AppPhase, now: number): PacerState {
  if (phase === 'active') {
    if (s.backgroundAt === null) return s;
    if (now - s.backgroundAt >= VISIT_GAP_MS) return { visit: s.visit + 1, backgroundAt: null, acted: false, shown: null };
    return { ...s, backgroundAt: null };
  }
  if (phase === 'background') return s.backgroundAt === null ? { ...s, backgroundAt: now } : s;
  // «inactive» (a call, the app switcher) is not leaving yet
  return s;
}

/** a vote, an answer, a confirmation: the moments may come now */
export function onAction(s: PacerState): PacerState {
  return s.acted ? s : { ...s, acted: true };
}

/** whether a moment may cover the screen now; `asked` when the player opened the place it belongs to */
export function mayShow(s: PacerState, opts: { asked?: boolean } = {}): boolean {
  return s.shown === null && (s.acted || opts.asked === true);
}

/** of the moments ready right now, the one to play (or none): the highest priority, if this visit still has room */
export function pick(s: PacerState, ready: readonly MomentKind[], opts: { asked?: boolean } = {}): MomentKind | null {
  if (!mayShow(s, opts)) return null;
  return MOMENT_PRIORITY.find((k) => ready.includes(k)) ?? null;
}

/** the moment is showing: the visit's one slot is used; null when it may not show (the caller keeps it queued) */
export function claim(s: PacerState, kind: MomentKind, opts: { asked?: boolean } = {}): PacerState | null {
  return mayShow(s, opts) ? { ...s, shown: kind } : null;
}

/** after a vote, an answer or a confirmation, the celebration queue is read again this long after the last one */
export const REFETCH_AFTER_ACTION_MS = 1000;

/** `fn` runs once, `ms` after the last call: rapid votes make one request */
export function debounce(fn: () => void, ms: number): { call: () => void; cancel: () => void } {
  let id: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (id !== null) clearTimeout(id);
    id = null;
  };
  return {
    call: () => {
      cancel();
      id = setTimeout(() => {
        id = null;
        fn();
      }, ms);
    },
    cancel,
  };
}
