import { describe, expect, it } from 'vitest';
import { OTA_MIN_INTERVAL_MS, checkEnded, checkStarted, mayCheck, otaAtLaunch } from './otaThrottle';

const MIN = 60 * 1000;
const t0 = 1_700_000_000_000;

describe('over-the-air update throttle', () => {
  it('waits 30 minutes after launch, because the native launch check counts', () => {
    const s = otaAtLaunch(t0);
    expect(OTA_MIN_INTERVAL_MS).toBe(30 * MIN);
    expect(mayCheck(s, t0)).toBe(false);
    expect(mayCheck(s, t0 + 29 * MIN)).toBe(false);
    expect(mayCheck(s, t0 + 30 * MIN)).toBe(true);
  });

  it('does not start a second check while one runs', () => {
    const s = checkStarted(otaAtLaunch(t0), t0 + 31 * MIN);
    expect(mayCheck(s, t0 + 90 * MIN)).toBe(false);
  });

  it('restarts the clock at each check, also when it failed', () => {
    let s = checkStarted(otaAtLaunch(t0), t0 + 40 * MIN);
    s = checkEnded(s, false);
    expect(mayCheck(s, t0 + 60 * MIN)).toBe(false);
    expect(mayCheck(s, t0 + 70 * MIN)).toBe(true);
  });

  it('stops looking once an update waits for the next cold start', () => {
    let s = checkStarted(otaAtLaunch(t0), t0 + 40 * MIN);
    s = checkEnded(s, true);
    expect(s.pending).toBe(true);
    expect(mayCheck(s, t0 + 600 * MIN)).toBe(false);
    // a later check that finds nothing does not forget the waiting update
    expect(checkEnded({ ...s, inFlight: true }, false).pending).toBe(true);
  });

  it('checks again when the phone clock went backwards', () => {
    const s = otaAtLaunch(t0);
    expect(mayCheck(s, t0 - 5 * MIN)).toBe(true);
  });

  it('takes another interval for tests', () => {
    const s = otaAtLaunch(t0);
    expect(mayCheck(s, t0 + 1000, 1000)).toBe(true);
  });
});
