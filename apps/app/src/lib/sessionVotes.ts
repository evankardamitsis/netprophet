import { useSyncExternalStore } from 'react';
import type { Side } from './votes';

/**
 * The votes cast this session, on any screen (VoteRow notes each one that went in). The feed is read on load and on a
 * pull only, so the home's end of the day (homeGuidance.dayEnd) lays these over the feed's own votes: the last vote of
 * the day, here or on «Όλα τα ματς σήμερα», brings the end card without a refresh.
 */

const votes = new Map<string, Side>();
const listeners = new Set<() => void>();
let version = 0;

export function noteSessionVote(matchId: string, side: Side): void {
  if (votes.get(matchId) === side) return;
  votes.set(matchId, side);
  version += 1;
  for (const l of listeners) l();
}

export function sessionVote(matchId: string): Side | undefined {
  return votes.get(matchId);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** re-renders the caller on every new session vote; the number itself means nothing */
export function useSessionVotes(): number {
  return useSyncExternalStore(subscribe, () => version);
}
