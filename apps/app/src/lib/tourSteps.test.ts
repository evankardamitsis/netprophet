import { describe, expect, it } from 'vitest';
import {
  currentStep,
  isLastStep,
  placeTooltip,
  placeInWindow,
  revealOffset,
  scrollsHome,
  TOUR_TARGETS,
  type TourTarget,
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

/** a first launch with everything on the screen */
const all = () => true;
/** the places that exist, by target */
const only = (...here: TourTarget[]) => (t: TourTarget) => here.includes(t);
const noLadder = (t: TourTarget) => t !== 'tab:ladder';

describe('steps', () => {
  it('six steps when every place exists', () => {
    expect(tourSteps(all)).toEqual(['vote', 'streak', 'tournaments', 'results', 'ladder', 'me']);
  });
  it('each step points at its place', () => {
    expect(tourSteps(all).map(targetOf)).toEqual(['vote', 'stats', 'tournament', 'tab:results', 'tab:ladder', 'tab:me']);
    expect([...TOUR_TARGETS]).toEqual(['vote', 'stats', 'tournament', 'tab:results', 'tab:ladder', 'tab:me']);
  });
  it('the Ladder step is left out while its tab is not in the bar', () => {
    expect(tourSteps(noLadder)).toEqual(['vote', 'streak', 'tournaments', 'results', 'me']);
  });
  it('no match today: no vote row and no tournament card, the rest of the tour stays', () => {
    expect(tourSteps(only('stats', 'tab:results', 'tab:me'))).toEqual(['streak', 'results', 'me']);
  });
  it('a vote row but no tournament today', () => {
    expect(tourSteps(only('vote', 'stats', 'tab:results', 'tab:me'))).toEqual(['vote', 'streak', 'results', 'me']);
  });
  it('no place at all means no steps', () => {
    expect(tourSteps(() => false)).toEqual([]);
  });
  it('only the vote and tournament steps stand on the scrolling list', () => {
    expect(tourSteps(all).filter(scrollsHome)).toEqual(['vote', 'tournaments']);
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
    expect(seen).toEqual(['vote', 'streak', 'tournaments', 'results', 'me']);
    expect(s).toEqual({ phase: 'done' });
  });
  it('knows the last step', () => {
    let s = tourStart(['vote', 'me']);
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
  // the list: 756 high, 3000 of content, standing at the top; places are in the list's content
  const H = 756;
  const C = 3000;
  it('a place already in view does not scroll the list', () => {
    expect(revealOffset({ x: 16, y: 300, width: 350, height: 64 }, 0, H, C, 12)).toBe(0);
    expect(revealOffset({ x: 16, y: 1100, width: 350, height: 64 }, 989, H, C, 12)).toBe(989);
  });
  it('a place below the fold comes up to the top of the list (the Pro Max sample home, 16 Nov)', () => {
    expect(revealOffset({ x: 16, y: 1001, width: 408, height: 167 }, 0, H, C, 12)).toBe(989);
  });
  it('a place half cut at the bottom scrolls too', () => {
    expect(revealOffset({ x: 16, y: 720, width: 350, height: 64 }, 0, H, C, 12)).toBe(708);
  });
  it('a place above the top scrolls back up', () => {
    expect(revealOffset({ x: 16, y: 400, width: 350, height: 64 }, 989, H, C, 12)).toBe(388);
  });
  it('the list never scrolls past either end', () => {
    expect(revealOffset({ x: 16, y: 2900, width: 350, height: 64 }, 0, H, C, 12)).toBe(C - H);
    expect(revealOffset({ x: 16, y: 4, width: 350, height: 64 }, 500, H, C, 12)).toBe(0);
    // content shorter than the list: it cannot scroll at all
    expect(revealOffset({ x: 16, y: 700, width: 350, height: 64 }, 0, H, 600, 12)).toBe(0);
  });
  it('a place is drawn where the scroll leaves it, not where the window measure says', () => {
    // the vote row: 1001 into the content, the list's top at 124, scrolled to 989: on the screen at 136
    expect(placeInWindow({ x: 16, y: 1001, width: 408, height: 167 }, { x: 0, y: 124 }, 989)).toEqual({ x: 16, y: 136, width: 408, height: 167 });
  });
  it('a target off the screen or not laid out has no cut-out', () => {
    const bounds = { top: 112, bottom: 870, left: 0, right: 440 };
    // the stale measure of the vote row on the Pro Max (16 Nov): below the tab bar
    expect(spotlight({ x: 16, y: 1113, width: 408, height: 167 }, 4, bounds)).toBeNull();
    expect(spotlight({ x: 16, y: -300, width: 408, height: 167 }, 4, bounds)).toBeNull();
    expect(spotlight({ x: 0, y: 0, width: 0, height: 0 }, 0, { top: 0, bottom: 800, left: 0, right: 390 })).toBeNull();
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
  it('the card is always wholly on the screen, wherever the cut-out is', () => {
    // the Pro Max sample home (16 Nov): an empty cut-out under the screen put the card at 869 of 956
    expect(placeTooltip({ x: 12, y: 1109, width: 416, height: 0 }, 956, 226, 14, 16)).toBe(956 - 16 - 226);
    // a cut-out above the screen
    expect(placeTooltip({ x: 12, y: -400, width: 416, height: 100 }, 956, 226, 14, 16)).toBe(16);
    for (const y of [-2000, -100, 0, 300, 700, 940, 1500, 5000]) {
      for (const h of [0, 44, 300]) {
        const top = placeTooltip({ x: 0, y, width: 100, height: h }, 956, 226, 14, 16);
        expect(top).toBeGreaterThanOrEqual(16);
        expect(top + 226).toBeLessThanOrEqual(956 - 16);
      }
    }
  });
});
