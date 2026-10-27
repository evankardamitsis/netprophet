import { beforeEach, describe, expect, it } from 'vitest';
import type { GetLookResult } from '@netprophet/db';
import { changeLook, clearLook, currentLook, loadLook, lookOwner, subscribeLook } from './lookStore';

const look = (kit: string) => ({ worn: { kit } }) as unknown as GetLookResult;
const wearKit = (kit: string) => (_l: GetLookResult) => look(kit);
const kitOf = (l: GetLookResult | null) => (l as unknown as { worn: { kit: string } } | null)?.worn.kit;

describe('lookStore: one look for the header and the wardrobe', () => {
  beforeEach(() => clearLook());

  it('shares one request between callers and shows it to every subscriber', async () => {
    let calls = 0;
    const fetchLook = async () => {
      calls++;
      return look('red');
    };
    let a = 0;
    let b = 0;
    const offA = subscribeLook(() => a++);
    const offB = subscribeLook(() => b++);
    const [x, y] = await Promise.all([loadLook(fetchLook, 'u1'), loadLook(fetchLook, 'u1')]);
    expect(calls).toBe(1);
    expect(kitOf(x)).toBe('red');
    expect(kitOf(y)).toBe('red');
    expect(a).toBe(1);
    expect(b).toBe(1);
    offA();
    offB();
  });

  it('an equip is seen by both subscribers at once, then settles on the server look', async () => {
    await loadLook(async () => look('red'), 'u1');
    const seen: Array<string | undefined> = [];
    const off1 = subscribeLook(() => seen.push(kitOf(currentLook())));
    const off2 = subscribeLook(() => seen.push(kitOf(currentLook())));
    let release!: (l: GetLookResult) => void;
    const pending = changeLook('u1', wearKit('blue'), () => new Promise<GetLookResult>((r) => (release = r)));
    expect(kitOf(currentLook())).toBe('blue');
    expect(seen).toEqual(['blue', 'blue']);
    release(look('blue'));
    expect(await pending).toBe(true);
    expect(kitOf(currentLook())).toBe('blue');
    off1();
    off2();
  });

  it('goes back for everyone when the server refuses', async () => {
    await loadLook(async () => look('red'), 'u1');
    const seen: Array<string | undefined> = [];
    const off = subscribeLook(() => seen.push(kitOf(currentLook())));
    const ok = await changeLook('u1', wearKit('blue'), () => Promise.reject(new Error('no')));
    expect(ok).toBe(false);
    expect(kitOf(currentLook())).toBe('red');
    expect(seen).toEqual(['blue', 'red']);
    off();
  });

  it('a read that started before an equip does not undo it', async () => {
    let release!: (l: GetLookResult) => void;
    await loadLook(async () => look('red'), 'u1');
    const slow = loadLook(() => new Promise<GetLookResult>((r) => (release = r)), 'u1');
    await changeLook('u1', wearKit('blue'), async () => look('blue'));
    release(look('red'));
    await slow;
    expect(kitOf(currentLook())).toBe('blue');
  });

  it('another account clears the look, and a reply from before never lands', async () => {
    await loadLook(async () => look('red'), 'u1');
    let release!: (l: GetLookResult) => void;
    const late = loadLook(() => new Promise<GetLookResult>((r) => (release = r)), 'u1');
    clearLook();
    expect(currentLook()).toBeNull();
    expect(lookOwner()).toBeNull();
    release(look('red'));
    expect(await late).toBeNull();
    expect(currentLook()).toBeNull();
    await loadLook(async () => look('green'), 'u2');
    expect(lookOwner()).toBe('u2');
    await loadLook(async () => look('x'), 'u3');
    expect(kitOf(currentLook())).toBe('x');
  });

  it('a failed read keeps what is shown', async () => {
    await loadLook(async () => look('red'), 'u1');
    const r = await loadLook(() => Promise.reject(new Error('offline')), 'u1');
    expect(kitOf(r)).toBe('red');
  });
});
