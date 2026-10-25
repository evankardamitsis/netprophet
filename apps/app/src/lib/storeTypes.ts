/** how a purchase ended: bought, the player closed it, no store yet (keys not set, Expo Go), or an error */
export type BuyResult = 'ok' | 'cancelled' | 'unavailable' | 'failed';

/** how «Επαναφορά αγορών» ended: something came back, the store account has nothing, no store here, or an error */
export type RestoreResult = 'restored' | 'none' | 'unavailable' | 'failed';

/** What the store's customer record holds, reduced to what decides the restore line. */
export interface RestoredInfo {
  /** active entitlements (Pro) */
  activeEntitlements: number;
  /** one-time purchases (cosmetics) */
  oneTimePurchases: number;
}

/** «restored» when the store account holds an active entitlement or any one-time purchase, else «none». */
export function restoreOutcome(info: RestoredInfo): RestoreResult {
  return info.activeEntitlements > 0 || info.oneTimePurchases > 0 ? 'restored' : 'none';
}

/** why the store cannot sell here: Expo Go, a build without the native module, no key in the build, or no account */
export type StoreBlock = 'expo_go' | 'no_module' | 'no_key' | 'no_user';

/** a purchase's end, with the store's error code (or the block) so the screen and the logs can say which */
export interface BuyOutcome {
  result: BuyResult;
  /** RevenueCat's readable code («NETWORK_ERROR»), our own («product_not_found»), a StoreBlock, or null */
  code: string | null;
}

/**
 * The key as the build holds it, cleaned: a value pasted into the EAS env with spaces, a newline or its quotes
 * («"appl_…"») would reach RevenueCat as a different key and every call would fail on credentials.
 */
export function cleanKey(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();
}

/** RevenueCat's public SDK keys start with the store's prefix: «appl_» on iOS, «goog_» on Android */
export function keyLooksRight(key: string, platform: string): boolean {
  if (platform === 'ios') return key.startsWith('appl_');
  if (platform === 'android') return key.startsWith('goog_');
  return key.length > 0;
}

export interface StoreEnv {
  /** Expo Go (expo-constants executionEnvironment «storeClient»): no native module there */
  expoGo: boolean;
  /** react-native-purchases loaded, and its native side answered configure */
  hasModule: boolean;
  /** the key, already cleaned */
  key: string;
}

/** The first reason the store cannot sell in this build, or null when it can. */
export function storeBlock(env: StoreEnv): StoreBlock | null {
  if (env.expoGo) return 'expo_go';
  if (!env.hasModule) return 'no_module';
  if (env.key.length === 0) return 'no_key';
  return null;
}

/** the codes the player hears as «not on this device»; «no_key» means payments are not open yet */
export function deviceBlocked(code: string | null): boolean {
  return code === 'expo_go' || code === 'no_module' || code === 'PURCHASE_NOT_ALLOWED_ERROR' || code === 'UNSUPPORTED_ERROR';
}

/** RevenueCat's numeric codes (PURCHASES_ERROR_CODE), for an error that comes back without its readable name */
const RC_CODES: Record<string, string> = {
  '0': 'UNKNOWN_ERROR',
  '1': 'PURCHASE_CANCELLED_ERROR',
  '2': 'STORE_PROBLEM_ERROR',
  '3': 'PURCHASE_NOT_ALLOWED_ERROR',
  '4': 'PURCHASE_INVALID_ERROR',
  '5': 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR',
  '6': 'PRODUCT_ALREADY_PURCHASED_ERROR',
  '10': 'NETWORK_ERROR',
  '11': 'INVALID_CREDENTIALS_ERROR',
  '12': 'UNEXPECTED_BACKEND_RESPONSE_ERROR',
  '14': 'INVALID_APP_USER_ID_ERROR',
  '15': 'OPERATION_ALREADY_IN_PROGRESS_ERROR',
  '16': 'UNKNOWN_BACKEND_ERROR',
  '20': 'PAYMENT_PENDING_ERROR',
  '23': 'CONFIGURATION_ERROR',
  '24': 'UNSUPPORTED_ERROR',
  '32': 'PRODUCT_REQUEST_TIMED_OUT_ERROR',
  '34': 'OFFLINE_CONNECTION_ERROR',
};

/** the readable code of what RevenueCat threw («NETWORK_ERROR»), «js_error» for a plain Error, «unknown» otherwise */
export function storeErrorCode(e: unknown): string {
  if (typeof e !== 'object' || e === null) return 'unknown';
  const err = e as { code?: unknown; readableErrorCode?: unknown; userInfo?: { readableErrorCode?: unknown } };
  const readable = err.userInfo?.readableErrorCode ?? err.readableErrorCode;
  if (typeof readable === 'string' && readable.length > 0) return readable;
  if (err.code !== undefined && err.code !== null && err.code !== '') {
    const c = String(err.code);
    return RC_CODES[c] ?? `rc_${c}`;
  }
  return e instanceof Error ? 'js_error' : 'unknown';
}

/** A thrown purchase, as the screen hears it: closed by the player, not possible on this device, or failed. */
export function purchaseErrorOutcome(e: unknown): BuyOutcome {
  const code = storeErrorCode(e);
  if ((e as { userCancelled?: boolean } | null)?.userCancelled === true || code === 'PURCHASE_CANCELLED_ERROR') {
    return { result: 'cancelled', code: null };
  }
  if (deviceBlocked(code)) return { result: 'unavailable', code };
  return { result: 'failed', code };
}

/** What the paywall says after a purchase that did not go through. */
export type BuyLine = 'none' | 'waitlist' | 'device' | 'failed';

/**
 * «unavailable» joins the founding list only while payments are not open (no key in the build); a device without the
 * store hears so; every other end that is not a purchase or a cancel is «Δεν ολοκληρώθηκε» with the button to retry.
 */
export function buyLineFor(o: BuyOutcome): BuyLine {
  if (o.result === 'ok' || o.result === 'cancelled') return 'none';
  if (o.result === 'unavailable' && o.code === 'no_key') return 'waitlist';
  if (o.result === 'unavailable' && deviceBlocked(o.code)) return 'device';
  return 'failed';
}

/** For the staff row in Ρυθμίσεις: what the store looks like on this phone. Never the key itself. */
export interface StoreDiagnostics {
  ready: boolean;
  block: StoreBlock | null;
  /** the native module object as React Native sees it (the same check the SDK makes) */
  nativeModule: boolean;
  keyPresent: boolean;
  keyLength: number;
  /** «appl_» on iOS, «goog_» on Android */
  keyPrefixOk: boolean;
  configured: boolean;
  /** each offering with its packages' store product ids; null when not asked or the ask failed */
  offerings: { id: string; products: string[] }[] | null;
  lastError: { op: string; code: string; at: number } | null;
}
