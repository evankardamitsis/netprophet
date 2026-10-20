import { describe, expect, it } from 'vitest';
import type { MeResult } from '@netprophet/db';
import { clearMe, currentMe, loadMe, markMeStale, ME_STALE_MS, meIsStale, meTicket, publishMe, subscribeMe } from './meStore';

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

describe('loadMe: one get_me on the wire, a fresh one reused', () => {
  const deferred = () => {
    let resolve!: (m: MeResult) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<MeResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('callers at the same moment share one request, even a forced one', async () => {
    clearMe();
    let calls = 0;
    const d = deferred();
    const fetchMe = () => {
      calls++;
      return d.promise;
    };
    const a = loadMe(fetchMe, { owner: 'u1', now: 1000 });
    const b = loadMe(fetchMe, { owner: 'u1', now: 1001 });
    const c = loadMe(fetchMe, { owner: 'u1', now: 1002, maxAgeMs: 0 });
    d.resolve(me(4));
    expect((await a)?.game.streak).toBe(4);
    expect((await b)?.game.streak).toBe(4);
    expect((await c)?.game.streak).toBe(4);
    expect(calls).toBe(1);
  });

  it('a fresh reply is reused; a stale one, a forced read or a marked one asks again', async () => {
    clearMe();
    let calls = 0;
    const fetchMe = async () => {
      calls++;
      return me(calls);
    };
    const t0 = 1000;
    await loadMe(fetchMe, { owner: 'u1', now: t0 });
    await loadMe(fetchMe, { owner: 'u1', now: t0 + ME_STALE_MS - 1 });
    expect(calls).toBe(1);
    expect(meIsStale(t0 + ME_STALE_MS - 1)).toBe(false);
    expect(meIsStale(t0 + ME_STALE_MS)).toBe(true);
    await loadMe(fetchMe, { owner: 'u1', now: t0 + ME_STALE_MS });
    expect(calls).toBe(2);
    await loadMe(fetchMe, { owner: 'u1', now: t0 + ME_STALE_MS + 1, maxAgeMs: 0 });
    expect(calls).toBe(3);
    markMeStale();
    await loadMe(fetchMe, { owner: 'u1', now: t0 + ME_STALE_MS + 2 });
    expect(calls).toBe(4);
    expect(currentMe()?.game.streak).toBe(4);
  });

  it('after an action (`since`) a read that started before it is not reused', async () => {
    clearMe();
    let calls = 0;
    const old = deferred();
    const fresh = deferred();
    const fetchMe = () => (++calls === 1 ? old.promise : fresh.promise);
    const a = loadMe(fetchMe, { owner: 'u1', now: 100 });
    const b = loadMe(fetchMe, { owner: 'u1', now: 200, maxAgeMs: 0, since: 150 });
    expect(calls).toBe(2);
    fresh.resolve(me(7));
    old.resolve(me(6));
    await Promise.all([a, b]);
    // the older reply came back last and is dropped
    expect(currentMe()?.game.streak).toBe(7);
    // a reply asked for before the action is not fresh enough for it
    await loadMe(fetchMe, { owner: 'u1', now: 300, since: 250 });
    expect(calls).toBe(3);
  });

  it('another account never sees the last one, and a failure keeps what is held', async () => {
    clearMe();
    await loadMe(async () => me(5), { owner: 'u1', now: 10 });
    const other = loadMe(() => Promise.reject(new Error('offline')), { owner: 'u2', now: 1 });
    expect(currentMe()).toBeNull();
    expect(await other).toBeNull();
    await loadMe(async () => me(2), { owner: 'u2', now: 2 });
    expect(await loadMe(() => Promise.reject(new Error('offline')), { owner: 'u2', now: 3, maxAgeMs: 0 })).toEqual(me(2));
  });
});
