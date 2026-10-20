/** whether the signed-in account still has to go through onboarding (onboardingGate.tsx) */
export type OnboardingStatus = 'unknown' | 'needed' | 'done';

/** the gate for `userId`: an answer for another account (or none yet) is «unknown» until this one's is read */
export function gateStatus(answer: { user: string | null; status: OnboardingStatus }, userId: string | null, live: boolean): OnboardingStatus {
  if (!userId || !live) return 'done';
  return answer.user === userId ? answer.status : 'unknown';
}
