import { describe, expect, it } from 'vitest';
import { buyLineFor, cleanKey, deviceBlocked, keyLooksRight, purchaseErrorOutcome, restoreOutcome, storeBlock, storeErrorCode } from './storeTypes';

// a made-up key of the usual shape; never a real one
const KEY = 'appl_AbCdEfGhIjKlMnOpQrStUvWxYz0';

describe('cleanKey', () => {
  it.each([
    [KEY, KEY],
    [`  ${KEY}\n`, KEY],
    [`"${KEY}"`, KEY],
    [`'${KEY}'`, KEY],
    [` "${KEY}" `, KEY],
    [`"${KEY}`, `"${KEY}`],
    ['', ''],
    [undefined, ''],
    [null, ''],
  ])('%j -> %j', (raw, want) => {
    expect(cleanKey(raw)).toBe(want);
  });
});

describe('keyLooksRight', () => {
  it('wants the store prefix', () => {
    expect(keyLooksRight(KEY, 'ios')).toBe(true);
    expect(keyLooksRight('goog_x', 'ios')).toBe(false);
    expect(keyLooksRight('goog_x', 'android')).toBe(true);
    expect(keyLooksRight(KEY, 'android')).toBe(false);
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
    // anything else is «Δεν ολοκληρώθηκε» with a retry
    [{ result: 'unavailable', code: 'no_user' }, 'failed'],
    [{ result: 'failed', code: 'product_not_found' }, 'failed'],
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
