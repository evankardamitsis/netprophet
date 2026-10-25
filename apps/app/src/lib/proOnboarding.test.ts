import { beforeEach, describe, expect, it } from 'vitest';
import { markOnboardingPro, onboardingProPending, resetOnboardingPro, takeOnboardingPro } from './proOnboarding';

describe('Pro after onboarding: once, softly', () => {
  beforeEach(resetOnboardingPro);

  it('nothing is due unless onboarding just finished', () => {
    expect(takeOnboardingPro(false)).toBe(false);
  });

  it('a new account without Pro gets it once, and never again', () => {
    markOnboardingPro();
    expect(takeOnboardingPro(false)).toBe(true);
    expect(takeOnboardingPro(false)).toBe(false);
    expect(onboardingProPending()).toBe(false);
  });

  it('waits while it is not known whether the player has Pro', () => {
    markOnboardingPro();
    expect(takeOnboardingPro(null)).toBe(false);
    expect(onboardingProPending()).toBe(true);
    expect(takeOnboardingPro(false)).toBe(true);
  });

  it('a Pro player never sees it, and the mark is dropped', () => {
    markOnboardingPro();
    expect(takeOnboardingPro(true)).toBe(false);
    expect(onboardingProPending()).toBe(false);
    expect(takeOnboardingPro(false)).toBe(false);
  });
});
