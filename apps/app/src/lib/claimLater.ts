import { nameGender, type Copy } from '@netprophet/copy';
import type { MeResult } from '@netprophet/db';

/**
 * Claims outside onboarding (registration audit, 20 Oct 2026). The server decides (api.claim_player, api.report_claim,
 * staff approve or unlink); these only say when the app offers the quiet links and what it says after.
 */

/** api.claim_player's answer, as the app reads it (data.ts claimOutcome) */
export type ClaimOutcome = 'ok' | 'requested' | 'taken' | 'other' | 'limited' | 'failed';

type MeClaim = { player: MeResult['player']; profile: Pick<MeResult['profile'], 'claim_status'> };

/**
 * «Αυτός είμαι εγώ» on a player's profile: nobody holds the player (the profile is only ever an active, shown, adult
 * one) and the account has no player and nothing waiting with staff. A skipped or rejected account counts as none.
 */
export function canClaimHere(p: { claimed: boolean; isMe: boolean }, me: MeClaim | null): boolean {
  if (!me || p.claimed || p.isMe || me.player) return false;
  return me.profile.claim_status === 'none' || me.profile.claim_status === 'skipped';
}

/** «Αυτός είμαι εγώ» / «Αυτή είμαι εγώ» */
export function claimHereLabel(first: string, gender: 'm' | 'f' | null, t: Copy): string {
  return t.players.claimMe[nameGender(first, gender)];
}

/** the toast after «Αυτός είμαι εγώ»: the same words as onboarding */
export function claimHereToast(r: ClaimOutcome, t: Copy): string {
  const c = t.onboarding.claim;
  if (r === 'ok' || r === 'requested') return c.requested;
  if (r === 'taken') return t.link.claimTaken;
  if (r === 'other') return c.otherClaimed;
  if (r === 'limited') return c.limited;
  return c.failed;
}

/** «Δεν είμαι εγώ» in Εγώ: the account holds a player */
export function ownReportShown(me: MeClaim | null): boolean {
  return me !== null && me.player !== null && me.profile.claim_status === 'claimed';
}
