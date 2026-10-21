import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { RpcError } from '@netprophet/db';
import { followToast, toggleFollow } from './follow';

const t = getCopy('el');

describe('follow a tournament', () => {
  it('flips at once and says it is followed', async () => {
    const seen: boolean[] = [];
    const sent: boolean[] = [];
    const out = await toggleFollow({ on: false, set: (v) => seen.push(v), call: async (v) => { sent.push(v); } });
    expect(out).toBe('followed');
    expect(seen).toEqual([true]);
    expect(sent).toEqual([true]);
    expect(followToast(out, t)).toBe('Θα σου πούμε για κλήρωση, πρόγραμμα και τελικό.');
  });
  it('unfollow', async () => {
    const out = await toggleFollow({ on: true, set: () => {}, call: async () => {} });
    expect(out).toBe('unfollowed');
    expect(followToast(out, t)).toBe('Δεν ακολουθείς πια');
  });
  it('an error puts it back', async () => {
    const seen: boolean[] = [];
    const out = await toggleFollow({ on: false, set: (v) => seen.push(v), call: async () => { throw new Error('offline'); } });
    expect(out).toBe('failed');
    expect(seen).toEqual([true, false]);
    expect(followToast(out, t)).toBe('Δεν έγινε. Δοκίμασε ξανά.');
  });
  it('the 101st: too many, put back', async () => {
    const seen: boolean[] = [];
    const out = await toggleFollow({
      on: false,
      set: (v) => seen.push(v),
      call: async () => { throw new RpcError('follow_tournament', 'too_many', '54000', 'too_many'); },
    });
    expect(out).toBe('too_many');
    expect(seen).toEqual([true, false]);
    expect(followToast(out, t)).toBe('Ακολουθείς ήδη 100 τουρνουά. Άφησε κάποιο πρώτα.');
  });
  it('sample mode: local only', async () => {
    expect(await toggleFollow({ on: false, set: () => {}, call: null })).toBe('followed');
  });
});
