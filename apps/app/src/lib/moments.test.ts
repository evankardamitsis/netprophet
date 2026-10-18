import { describe, expect, it } from 'vitest';
import { claim, coldStart, mayShow, onAction, onAppPhase, pick, VISIT_GAP_MS, type PacerState } from './moments';

const MIN = 60 * 1000;
const t0 = 1_000_000;

describe('visits', () => {
  it('a cold start is a visit with nothing done and nothing shown', () => {
    expect(coldStart()).toEqual({ visit: 1, backgroundAt: null, acted: false, shown: null });
  });
  it('back within 30 minutes is the same visit, its moment still used', () => {
    let s: PacerState = claim(onAction(coldStart()), 'celebration')!;
    s = onAppPhase(s, 'background', t0);
    s = onAppPhase(s, 'active', t0 + 29 * MIN);
    expect(s).toMatchObject({ visit: 1, acted: true, shown: 'celebration', backgroundAt: null });
  });
  it('back after 30 minutes or more is a new visit: the gate closes again and the slot is free', () => {
    let s: PacerState = claim(onAction(coldStart()), 'baller')!;
    s = onAppPhase(s, 'background', t0);
    s = onAppPhase(s, 'active', t0 + VISIT_GAP_MS);
    expect(s).toEqual({ visit: 2, backgroundAt: null, acted: false, shown: null });
  });
  it('«inactive» (a call, the app switcher) is not leaving', () => {
    let s = onAction(coldStart());
    s = onAppPhase(s, 'inactive', t0);
    s = onAppPhase(s, 'active', t0 + 2 * VISIT_GAP_MS);
    expect(s).toMatchObject({ visit: 1, acted: true });
  });
  it('the gap counts from the first time it left, not a later background event', () => {
    let s = onAction(coldStart());
    s = onAppPhase(s, 'background', t0);
    s = onAppPhase(s, 'background', t0 + 20 * MIN);
    s = onAppPhase(s, 'active', t0 + 31 * MIN);
    expect(s.visit).toBe(2);
  });
});

describe('the first action gate', () => {
  it('nothing interrupts before the first vote, answer or confirmation', () => {
    const s = coldStart();
    expect(mayShow(s)).toBe(false);
    expect(pick(s, ['celebration', 'baller', 'forYou'])).toBeNull();
    expect(claim(s, 'celebration')).toBeNull();
  });
  it('after it, a moment may come', () => {
    const s = onAction(coldStart());
    expect(mayShow(s)).toBe(true);
    expect(pick(s, ['forYou'])).toBe('forYou');
  });
  it('a place the player opened (Εγώ for Baller) needs no vote first', () => {
    const s = coldStart();
    expect(pick(s, ['baller'], { asked: true })).toBe('baller');
    expect(claim(s, 'baller', { asked: true })).toMatchObject({ shown: 'baller', acted: false });
  });
});

describe('one moment a visit', () => {
  it('a second claim is refused, so the caller keeps it queued (and unseen)', () => {
    const s = claim(onAction(coldStart()), 'celebration')!;
    expect(s.shown).toBe('celebration');
    expect(claim(s, 'forYou')).toBeNull();
    expect(claim(s, 'celebration')).toBeNull();
    expect(claim(s, 'baller', { asked: true })).toBeNull();
    expect(pick(s, ['baller', 'forYou'])).toBeNull();
  });
  it('a deferred moment gets its turn next visit', () => {
    let s = claim(onAction(coldStart()), 'celebration')!;
    s = onAppPhase(s, 'background', t0);
    s = onAppPhase(s, 'active', t0 + 45 * MIN);
    expect(pick(s, ['forYou'])).toBeNull();
    s = onAction(s);
    expect(pick(s, ['forYou'])).toBe('forYou');
  });
});

describe('priority', () => {
  const s = onAction(coldStart());
  it('a celebration first, then Baller, then «Για σένα»', () => {
    expect(pick(s, ['forYou', 'baller', 'celebration'])).toBe('celebration');
    expect(pick(s, ['forYou', 'baller'])).toBe('baller');
    expect(pick(s, ['forYou'])).toBe('forYou');
    expect(pick(s, [])).toBeNull();
  });
});
