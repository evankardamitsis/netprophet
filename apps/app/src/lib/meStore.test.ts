import { describe, expect, it } from 'vitest';
import type { MeResult } from '@netprophet/db';
import { clearMe, currentMe, meTicket, publishMe, subscribeMe } from './meStore';

const me = (streak: number) => ({ game: { streak } }) as unknown as MeResult;

describe('meStore: one get_me for the header and Εγώ', () => {
  it('both read the newest reply; an older one coming back late is dropped', () => {
    clearMe();
    let calls = 0;
    const off = subscribeMe(() => calls++);
    const old = meTicket();
    const fresh = meTicket();
    expect(publishMe(me(5), fresh)).toBe(true);
    expect(publishMe(me(3), old)).toBe(false);
    expect(currentMe()?.game.streak).toBe(5);
    expect(calls).toBe(1);
    off();
  });
  it('a later fetch replaces it, and signing out clears it', () => {
    clearMe();
    publishMe(me(5), meTicket());
    publishMe(me(0), meTicket());
    expect(currentMe()?.game.streak).toBe(0);
    const inFlight = meTicket();
    clearMe();
    expect(currentMe()).toBeNull();
    // a reply started before sign-out never comes back on screen
    expect(publishMe(me(9), inFlight)).toBe(false);
  });
});
