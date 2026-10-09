/** Active day = 3 cards voted or a match logged (Athens day). Pure. */
import { dayKey, type Instant } from '../time';

export const ACTIVE_DAY_CARDS = 3;

export interface ActivityState {
  dayKey: string | null;
  cardsVotedToday: number;
  matchLoggedToday: boolean;
  /** Today already counted as an active day. */
  countedToday: boolean;
  activeDays: number;
}

export const initialActivity = (): ActivityState => ({
  dayKey: null,
  cardsVotedToday: 0,
  matchLoggedToday: false,
  countedToday: false,
  activeDays: 0,
});

export function recordActivity(
  state: ActivityState,
  kind: 'vote_card' | 'match_logged',
  at: Instant,
): { state: ActivityState; becameActiveDay: boolean } {
  const today = dayKey(at);
  let s = state;
  if (s.dayKey !== today) {
    if (s.dayKey !== null && s.dayKey > today) return { state, becameActiveDay: false }; // late event
    s = { ...s, dayKey: today, cardsVotedToday: 0, matchLoggedToday: false, countedToday: false };
  }
  s = {
    ...s,
    cardsVotedToday: kind === 'vote_card' ? s.cardsVotedToday + 1 : s.cardsVotedToday,
    matchLoggedToday: kind === 'match_logged' ? true : s.matchLoggedToday,
  };
  const active = s.cardsVotedToday >= ACTIVE_DAY_CARDS || s.matchLoggedToday;
  if (active && !s.countedToday) {
    return { state: { ...s, countedToday: true, activeDays: s.activeDays + 1 }, becameActiveDay: true };
  }
  return { state: s, becameActiveDay: false };
}
