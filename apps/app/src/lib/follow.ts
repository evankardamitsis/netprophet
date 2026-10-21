import type { Copy } from '@netprophet/copy';

/**
 * Follow a tournament (founder, 21 Oct 2026: free for everyone). The pill flips at once and goes back if the server
 * says no; the toast says what changed, or why it did not. The server (api.follow_tournament) keeps the rows and sends
 * the pushes; this only drives the pill.
 */
export type FollowOutcome = 'followed' | 'unfollowed' | 'failed' | 'too_many';

export async function toggleFollow(input: {
  /** what the pill shows now */
  on: boolean;
  /** what the pill shows; called with the new value first, and with the old one again on an error */
  set: (on: boolean) => void;
  /** the server call (null in sample mode: the change stays local) */
  call: ((on: boolean) => Promise<unknown>) | null;
}): Promise<FollowOutcome> {
  const next = !input.on;
  input.set(next);
  try {
    if (input.call) await input.call(next);
  } catch (e) {
    input.set(input.on);
    return e instanceof Error && 'code' in e && (e as { code?: unknown }).code === 'too_many' ? 'too_many' : 'failed';
  }
  return next ? 'followed' : 'unfollowed';
}

/** the toast after a tap on the pill */
export function followToast(outcome: FollowOutcome, t: Copy): string {
  const d = t.tournaments.detail;
  if (outcome === 'followed') return d.followedToast;
  if (outcome === 'unfollowed') return d.unfollowedToast;
  return outcome === 'too_many' ? d.followTooMany : d.followFailed;
}
