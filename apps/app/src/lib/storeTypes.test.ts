import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCopy } from '@netprophet/copy';
import {
  buyLineFor,
  cleanKey,
  deviceBlocked,
  diagLines,
  emptyDiag,
  keyLooksRight,
  purchaseErrorOutcome,
  restoreOutcome,
  storeBlock,
  storeErrorCode,
  withTimeout,
  type StoreDiagnostics,
} from './storeTypes';

// a made-up key of the usual shape; never a real one
const KEY = 'appl_AbCdEfGhIjKlMnOpQrStUvWxYz0';

describe('cleanKey', () => {
  it.each([
    [KEY, KEY],
    // build 19: two trailing ETX characters from the EAS env
    [`${KEY}\u0003\u0003`, KEY],
    [`  ${KEY}\n`, KEY],
    [`${KEY}\r\n`, KEY],
    [`"${KEY}"`, KEY],
    [`'${KEY}'`, KEY],
    [` "${KEY}" `, KEY],
    [`"${KEY}`, KEY],
    [`"${KEY}"\u0003`, KEY],
    [`\u00a0${KEY}\u00a0`, KEY],
    [`${KEY}\u200b`, KEY],
    ['', ''],
    [undefined, ''],
    [null, ''],
  ])('%j -> %j', (raw, want) => {
    expect(cleanKey(raw)).toBe(want);
  });
  it('turns the build 19 value (34 chars) into the 32 char key', () => {
    const raw = `${KEY}\u0003\u0003`;
    expect(raw.length).toBe(34);
    expect(cleanKey(raw).length).toBe(32);
    expect(keyLooksRight(cleanKey(raw), 'ios')).toBe(true);
  });
});

describe('keyLooksRight', () => {
  const GOOG = 'goog_AbCdEfGhIjKlMnOpQrStUvWxYz0';
  it('wants the shape and the store prefix', () => {
    expect(keyLooksRight(KEY, 'ios')).toBe(true);
    expect(keyLooksRight(`${KEY}\u0003\u0003`, 'ios')).toBe(false);
    expect(keyLooksRight(`"${KEY}"`, 'ios')).toBe(false);
    expect(keyLooksRight('appl_short', 'ios')).toBe(false);
    expect(keyLooksRight(GOOG, 'ios')).toBe(false);
    expect(keyLooksRight(GOOG, 'android')).toBe(true);
    expect(keyLooksRight(KEY, 'android')).toBe(false);
    expect(keyLooksRight('rcb_AbCdEfGhIjKlMnOpQrStUvWxYz0', 'web')).toBe(true);
    expect(keyLooksRight('sk_AbCdEfGhIjKlMnOpQrStUvWxYz0', 'ios')).toBe(false);
    expect(keyLooksRight('', 'ios')).toBe(false);
  });
});

describe('storeBlock', () => {
  it.each([
    [{ expoGo: true, hasModule: false, key: KEY }, 'expo_go'],
    [{ expoGo: true, hasModule: true, key: '' }, 'expo_go'],
    [{ expoGo: false, hasModule: false, key: KEY }, 'no_module'],
    [{ expoGo: false, hasModule: true, key: '' }, 'no_key'],
    [{ expoGo: false, hasModule: true, key: KEY }, null],
  ] as const)('%j -> %s', (env, want) => {
    expect(storeBlock(env)).toBe(want);
  });
});

describe('storeErrorCode', () => {
  it('prefers the readable code RevenueCat puts in userInfo', () => {
    expect(storeErrorCode({ code: '11', userInfo: { readableErrorCode: 'INVALID_CREDENTIALS_ERROR' } })).toBe('INVALID_CREDENTIALS_ERROR');
    expect(storeErrorCode({ code: '10', readableErrorCode: 'NETWORK_ERROR' })).toBe('NETWORK_ERROR');
  });
  it('names a bare numeric code, and keeps an unknown one', () => {
    expect(storeErrorCode({ code: '11' })).toBe('INVALID_CREDENTIALS_ERROR');
    expect(storeErrorCode({ code: 23 })).toBe('CONFIGURATION_ERROR');
    expect(storeErrorCode({ code: '99' })).toBe('rc_99');
  });
  it('tells a plain error from nothing', () => {
    expect(storeErrorCode(new Error('x'))).toBe('js_error');
    expect(storeErrorCode('x')).toBe('unknown');
    expect(storeErrorCode(null)).toBe('unknown');
  });
});

describe('purchaseErrorOutcome', () => {
  it.each([
    [{ userCancelled: true, code: '1' }, { result: 'cancelled', code: null }],
    [{ code: '1' }, { result: 'cancelled', code: null }],
    [{ code: '3' }, { result: 'unavailable', code: 'PURCHASE_NOT_ALLOWED_ERROR' }],
    [{ code: '24' }, { result: 'unavailable', code: 'UNSUPPORTED_ERROR' }],
    [{ code: '11' }, { result: 'failed', code: 'INVALID_CREDENTIALS_ERROR' }],
    [{ code: '10' }, { result: 'failed', code: 'NETWORK_ERROR' }],
    [{ code: '2' }, { result: 'failed', code: 'STORE_PROBLEM_ERROR' }],
    [{ code: '20' }, { result: 'failed', code: 'PAYMENT_PENDING_ERROR' }],
    [new Error('boom'), { result: 'failed', code: 'js_error' }],
  ])('%j -> %j', (e, want) => {
    expect(purchaseErrorOutcome(e)).toEqual(want);
  });
});

describe('buyLineFor', () => {
  it.each([
    [{ result: 'ok', code: null }, 'none'],
    [{ result: 'cancelled', code: null }, 'none'],
    // payments not open in this build: the founding list
    [{ result: 'unavailable', code: 'no_key' }, 'waitlist'],
    // this phone cannot buy: said so, never the list
    [{ result: 'unavailable', code: 'no_module' }, 'device'],
    [{ result: 'unavailable', code: 'expo_go' }, 'device'],
    [{ result: 'unavailable', code: 'PURCHASE_NOT_ALLOWED_ERROR' }, 'device'],
    // said plainly: waiting for approval, already bought, no connection, the store not answering
    [{ result: 'failed', code: 'PAYMENT_PENDING_ERROR' }, 'pending'],
    [{ result: 'failed', code: 'PRODUCT_ALREADY_PURCHASED_ERROR' }, 'owned'],
    [{ result: 'failed', code: 'RECEIPT_ALREADY_IN_USE_ERROR' }, 'owned'],
    [{ result: 'failed', code: 'NETWORK_ERROR' }, 'offline'],
    [{ result: 'failed', code: 'OFFLINE_CONNECTION_ERROR' }, 'offline'],
    [{ result: 'failed', code: 'STORE_PROBLEM_ERROR' }, 'store'],
    [{ result: 'failed', code: 'product_not_found' }, 'store'],
    [{ result: 'failed', code: 'CONFIGURATION_ERROR' }, 'store'],
    // anything else is «Δεν ολοκληρώθηκε» with a retry
    [{ result: 'unavailable', code: 'no_user' }, 'failed'],
    [{ result: 'failed', code: 'INVALID_CREDENTIALS_ERROR' }, 'failed'],
    [{ result: 'failed', code: null }, 'failed'],
  ] as const)('%j -> %s', (o, want) => {
    expect(buyLineFor(o)).toBe(want);
  });
});

describe('deviceBlocked', () => {
  it('is only the device reasons', () => {
    expect(deviceBlocked('no_key')).toBe(false);
    expect(deviceBlocked(null)).toBe(false);
    expect(deviceBlocked('no_module')).toBe(true);
  });
});

describe('restoreOutcome', () => {
  it('restored with anything, none with nothing', () => {
    expect(restoreOutcome({ activeEntitlements: 1, oneTimePurchases: 0 })).toBe('restored');
    expect(restoreOutcome({ activeEntitlements: 0, oneTimePurchases: 2 })).toBe('restored');
    expect(restoreOutcome({ activeEntitlements: 0, oneTimePurchases: 0 })).toBe('none');
  });
});

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it('passes the value through', async () => {
    await expect(withTimeout(Promise.resolve(7), 50)).resolves.toBe(7);
  });
  it('passes the rejection through', async () => {
    await expect(withTimeout(Promise.reject(Object.assign(new Error('x'), { code: '10' })), 50)).rejects.toMatchObject({ code: '10' });
  });
  it('gives up with «timeout» on a promise that never ends', async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise<never>(() => undefined), 1000);
    const caught = p.catch((e: unknown) => storeErrorCode(e));
    vi.advanceTimersByTime(1000);
    await expect(caught).resolves.toBe('timeout');
  });
});

describe('diagLines', () => {
  const w = { ...getCopy('el').me.storeDiag };
  const base: StoreDiagnostics = {
    ready: true,
    block: null,
    nativeModule: true,
    keyPresent: true,
    keyLength: 37,
    keyPrefixOk: true,
    configured: true,
    offerings: [{ id: 'default', products: ['pro_monthly', 'pro_yearly'] }],
    lastError: null,
    offeringsError: null,
  };
  const KEY_TEXT = 'appl_AbCdEfGhIjKlMnOpQrStUvWxYz0';

  it('a working store: every line fine, the offerings with their products', () => {
    const lines = diagLines(base, w);
    expect(lines.map((l) => l.label)).toEqual([w.ready, w.module, w.key, w.keyShape, w.configured, w.offerings, w.lastError]);
    expect(lines.find((l) => l.label === w.offerings)).toEqual({ label: w.offerings, value: '1\ndefault: 2 (pro_monthly, pro_yearly)', ok: true });
    expect(lines.find((l) => l.label === w.keyShape)?.value).toBe('37 / ναι');
    expect(lines.find((l) => l.label === w.lastError)).toEqual({ label: w.lastError, value: w.none, ok: null });
  });

  it('a blocked build says why, and why there are no offerings', () => {
    const lines = diagLines({ ...base, ready: false, block: 'no_key', keyPresent: false, keyLength: 0, keyPrefixOk: false, configured: false, offerings: null, offeringsError: 'not_ready' }, w);
    expect(lines[0]).toEqual({ label: w.ready, value: 'όχι', ok: false });
    expect(lines[1]).toEqual({ label: w.block, value: 'no_key', ok: false });
    expect(lines.find((l) => l.label === w.offerings)).toEqual({ label: w.offerings, value: `${w.none} (not_ready)`, ok: false });
  });

  it('shows the last error and the waiting line while the store is asked', () => {
    const lines = diagLines({ ...base, offerings: null, lastError: { op: 'login', code: 'INVALID_CREDENTIALS_ERROR', at: 1 } }, w, true);
    expect(lines.find((l) => l.label === w.offerings)).toEqual({ label: w.offerings, value: w.waiting, ok: null });
    expect(lines.find((l) => l.label === w.lastError)).toEqual({ label: w.lastError, value: 'login · INVALID_CREDENTIALS_ERROR', ok: false });
  });

  it('an offering with no products is not fine', () => {
    expect(diagLines({ ...base, offerings: [{ id: 'default', products: [] }] }, w).find((l) => l.label === w.offerings)?.ok).toBe(false);
  });

  it('never prints a key, only its length', () => {
    const all = diagLines(base, w).map((l) => `${l.label} ${l.value}`).join(' ');
    expect(all).not.toContain('appl_');
    expect(all).not.toContain(KEY_TEXT);
  });

  it('an empty panel is all «no»', () => {
    expect(diagLines(emptyDiag(), w).every((l) => l.ok !== true)).toBe(true);
  });
});
