import { describe, expect, it } from 'vitest';
import {
  currentStep,
  feedTarget,
  isLastStep,
  placeTooltip,
  shouldStartTour,
  spotlight,
  targetOf,
  TOUR_IDLE,
  tourMarkOf,
  tourNext,
  tourSkip,
  tourStart,
  tourSteps,
  withTourMark,
  type StartCheck,
  type TourState,
} from './tourSteps';

const all = () => true;
const noLadder = (f: string) => f !== 'ladder_friends';

describe('steps', () => {
  it('five steps once the Ladder is open', () => {
    expect(tourSteps(all)).toEqual(['feed', 'results', 'tournaments', 'ladder', 'me']);
  });
  it('the Ladder step is left out while its tab is hidden', () => {
    expect(tourSteps(noLadder)).toEqual(['feed', 'results', 'tournaments', 'me']);
  });
  it('each step points at its place', () => {
    expect(['feed', 'results', 'tournaments', 'ladder', 'me'].map((s) => targetOf(s as never))).toEqual([
      'feedCard',
      'tab:results',
      'tab:tournaments',
      'tab:ladder',
      'avatar',
    ]);
  });
});

describe('the mark', () => {
  it('reads done or skipped, nothing else', () => {
    expect(tourMarkOf({ done: true, tour: 'done' })).toBe('done');
    expect(tourMarkOf({ done: true, tour: 'skipped' })).toBe('skipped');
    expect(tourMarkOf({ done: true, tour: 'yes' })).toBeNull();
    expect(tourMarkOf({ done: true })).toBeNull();
    expect(tourMarkOf(null)).toBeNull();
  });
  it('keeps everything onboarding wrote', () => {
    const state = { done: true, via: 'before-onboarding', at: '2026-10-01T00:00:00Z' };
    expect(withTourMark(state, 'skipped', '2026-10-20T10:00:00Z')).toEqual({ ...state, tour: 'skipped', tour_at: '2026-10-20T10:00:00Z' });
    expect(withTourMark(null, 'done', 'x')).toEqual({ tour: 'done', tour_at: 'x' });
  });
});

describe('should start', () => {
  const base: StartCheck = { homeReady: true, replay: false, mirror: null, profile: { done: true } };
  it('a new account right after onboarding, and an older one that never saw it', () => {
    expect(shouldStartTour(base)).toBe(true);
    expect(shouldStartTour({ ...base, profile: { done: true, via: 'before-onboarding' } })).toBe(true);
  });
  it('waits for a calm Σήμερα', () => {
    expect(shouldStartTour({ ...base, homeReady: false })).toBe(false);
  });
  it('never again once done or skipped, on the account or on this device', () => {
    expect(shouldStartTour({ ...base, profile: { done: true, tour: 'done' } })).toBe(false);
    expect(shouldStartTour({ ...base, profile: { done: true, tour: 'skipped' } })).toBe(false);
    expect(shouldStartTour({ ...base, mirror: 'skipped' })).toBe(false);
  });
  it('waits while the device mirror or get_me is still being read', () => {
    expect(shouldStartTour({ ...base, mirror: undefined })).toBe(false);
    expect(shouldStartTour({ ...base, profile: null })).toBe(false);
  });
  it('waits for a profile that says onboarding is done', () => {
    expect(shouldStartTour({ ...base, profile: {} })).toBe(false);
  });
  it('replay runs it whatever the mark says, but only on a calm Σήμερα', () => {
    expect(shouldStartTour({ ...base, replay: true, mirror: 'done', profile: { done: true, tour: 'done' } })).toBe(true);
    expect(shouldStartTour({ ...base, replay: true, homeReady: false })).toBe(false);
  });
});

describe('next and skip', () => {
  it('walks every step and ends done', () => {
    let s: TourState = tourStart(tourSteps(noLadder));
    const seen: (string | null)[] = [];
    while (s.phase === 'running') {
      seen.push(currentStep(s));
      s = tourNext(s);
    }
    expect(seen).toEqual(['feed', 'results', 'tournaments', 'me']);
    expect(s).toEqual({ phase: 'done' });
  });
  it('knows the last step', () => {
    let s = tourStart(['feed', 'me']);
    expect(isLastStep(s)).toBe(false);
    s = tourNext(s);
    expect(isLastStep(s)).toBe(true);
    expect(currentStep(s)).toBe('me');
  });
  it('skip ends it at any step', () => {
    expect(tourSkip(tourNext(tourStart(tourSteps(all))))).toEqual({ phase: 'skipped' });
  });
  it('next and skip do nothing outside a run', () => {
    expect(tourNext(TOUR_IDLE)).toBe(TOUR_IDLE);
    expect(tourSkip({ phase: 'done' })).toEqual({ phase: 'done' });
    expect(currentStep(TOUR_IDLE)).toBeNull();
  });
  it('no steps is done at once', () => {
    expect(tourStart([])).toEqual({ phase: 'done' });
  });
});

describe('where things go', () => {
  const view = { top: 100, bottom: 700 };
  const head = { x: 20, y: 120, width: 350, height: 60 };
  it('the first card when enough of it shows', () => {
    const card = { x: 20, y: 200, width: 350, height: 220 };
    expect(feedTarget(card, head, view)).toBe(card);
  });
  it('the feed head when the card sits below the tab bar or is missing', () => {
    expect(feedTarget({ x: 20, y: 650, width: 350, height: 220 }, head, view)).toBe(head);
    expect(feedTarget(null, head, view)).toBe(head);
    expect(feedTarget({ x: 0, y: 0, width: 0, height: 0 }, head, view)).toBe(head);
    expect(feedTarget(null, null, view)).toBeNull();
  });
  it('the cut-out pads the target and stops at the bounds', () => {
    const bounds = { top: 100, bottom: 700, left: 0, right: 390 };
    expect(spotlight({ x: 20, y: 200, width: 350, height: 100 }, 8, bounds)).toEqual({ x: 12, y: 192, width: 366, height: 116 });
    expect(spotlight({ x: 20, y: 600, width: 350, height: 300 }, 8, bounds)).toEqual({ x: 12, y: 592, width: 366, height: 108 });
  });
  it('the tooltip goes under the avatar and above a tab', () => {
    expect(placeTooltip({ x: 330, y: 50, width: 44, height: 44 }, 800, 200, 14, 16)).toBe(108);
    expect(placeTooltip({ x: 100, y: 740, width: 120, height: 44 }, 800, 200, 14, 16)).toBe(526);
  });
  it('a tooltip that fits neither way stays on the screen', () => {
    expect(placeTooltip({ x: 0, y: 150, width: 390, height: 500 }, 800, 200, 14, 16)).toBe(584);
  });
});
