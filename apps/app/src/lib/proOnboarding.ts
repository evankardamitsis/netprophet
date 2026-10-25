import type { ProMoment } from './proEntries';

/**
 * The soft paywall after a new sign-up (founder, 25 Oct 2026): the Pro screen opens once over the home, with the free
 * week when the server says there is one, and «Όχι τώρα» lands on the home. It never comes again by itself.
 *
 * Onboarding marks the moment when it finishes; the home takes it once it knows whether the player has Pro. The mark is
 * only in memory, so a relaunch never replays it, and a player who already has Pro (or whose state is unknown for good)
 * simply loses it.
 */
export const ONBOARDING_MOMENT: ProMoment = 'onboarding';

let pending = false;

/** onboarding finished for a new account: the home may show Pro once */
export function markOnboardingPro(): void {
  pending = true;
}

/** the mark is still waiting (for tests and for the home to avoid work) */
export function onboardingProPending(): boolean {
  return pending;
}

/**
 * Called by the home with what it knows. `pro` is null while get_me/get_pro loads: the mark waits. Pro players never
 * see the paywall: the mark is dropped. For a player without Pro the mark is taken (so it can not show twice) and the
 * answer is true.
 */
export function takeOnboardingPro(pro: boolean | null): boolean {
  if (!pending || pro === null) return false;
  pending = false;
  return pro === false;
}

/** tests only */
export function resetOnboardingPro(): void {
  pending = false;
}
