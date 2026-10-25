import { NativeModules, Platform } from 'react-native';
import type { AnalyticsEvents } from '@netprophet/core';
import { track } from './analytics';
import {
  cleanKey,
  keyLooksRight,
  purchaseErrorOutcome,
  restoreOutcome,
  storeBlock,
  storeErrorCode,
  type BuyOutcome,
  type RestoreResult,
  type StoreBlock,
  type StoreDiagnostics,
} from './storeTypes';

/**
 * Buying in the apps (founder, 17 Oct): Google Play and the App Store, both through RevenueCat (react-native-purchases).
 * Subscriptions come from RevenueCat's offerings, cosmetics are one-time store products; the purchase reaches our
 * database through the webhook, never from here. The SDK is configured once, with the signed-in user's id, as soon
 * as there is one (prepareStore from the root layout); a different user later is a logIn. Every «no» from the store
 * is kept (lastStoreError, for the staff diagnostics row) and sent to PostHog as its code only.
 */
const KEY = cleanKey(Platform.OS === 'android' ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY : process.env.EXPO_PUBLIC_RC_IOS_KEY);

type RNP = typeof import('react-native-purchases').default;
let mod: RNP | null | undefined;
/** the native side refused configure (the module is not in this binary): nothing will sell */
let configureBroken = false;
let forUser: string | null = null;
let pending: Promise<RNP | null> | null = null;
let lastError: StoreDiagnostics['lastError'] = null;

/**
 * Expo Go has no RevenueCat native module; a development or store build does. The same check the SDK makes
 * (utils/environment.js): Expo Go registers an ExpoGo module. Not executionEnvironment «storeClient», which a
 * development build (expo-dev-client) reports too.
 */
function isExpoGo(): boolean {
  return Boolean((globalThis as { expo?: { modules?: { ExpoGo?: unknown } } }).expo?.modules?.ExpoGo);
}

function native(): RNP | null {
  if (mod !== undefined) return mod;
  if (isExpoGo()) {
    mod = null;
    return mod;
  }
  try {
    // the package itself finds its native module (NativeModules.RNPurchases, also under the new architecture's
    // interop layer); if that is missing, configure throws and configureBroken says so
    mod = require('react-native-purchases').default as RNP; // eslint-disable-line @typescript-eslint/no-var-requires
  } catch (e) {
    note('configure', storeErrorCode(e));
    mod = null;
  }
  return mod;
}

function note(op: AnalyticsEvents['store_error']['op'], code: string, product?: string): void {
  lastError = { op, code, at: Date.now() };
  track('store_error', { op, code, platform: Platform.OS, ...(product ? { product } : {}) });
}

/** why this build cannot sell, or null */
export function storeBlockNow(): StoreBlock | null {
  return storeBlock({ expoGo: isExpoGo(), hasModule: native() !== null && !configureBroken, key: KEY });
}

export function storeReady(): boolean {
  return storeBlockNow() === null;
}

/** Configure once with this user (or switch to them); null when the store cannot run here. */
async function client(userId: string): Promise<RNP | null> {
  if (!userId || !storeReady()) return null;
  if (forUser === userId) return native();
  // one switch at a time: a buy right after sign-in waits for the configure the layout started
  if (pending) await pending.catch(() => null);
  if (forUser === userId) return native();
  pending = (async () => {
    const P = native()!;
    if (forUser === null) {
      let configured = false;
      try {
        configured = await P.isConfigured();
      } catch {
        configured = false;
      }
      if (!configured) {
        try {
          P.configure({ apiKey: KEY, appUserID: userId });
        } catch (e) {
          configureBroken = true;
          note('configure', NativeModules.RNPurchases ? storeErrorCode(e) : 'no_module');
          return null;
        }
        forUser = userId;
        return P;
      }
    }
    try {
      await P.logIn(userId);
    } catch (e) {
      note('login', storeErrorCode(e));
      throw e;
    }
    forUser = userId;
    return P;
  })();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}

/**
 * Signed in: configure the store for this user straight away and ask RevenueCat for the customer, so a key or
 * network problem shows up (PostHog, diagnostics) before anyone presses buy, and RevenueCat knows the user.
 */
export async function prepareStore(userId: string): Promise<void> {
  const block = storeBlockNow();
  if (block) {
    if (block !== 'expo_go') note('blocked', block);
    return;
  }
  try {
    const P = await client(userId);
    if (!P) return;
    await P.getCustomerInfo();
  } catch (e) {
    note('customer', storeErrorCode(e));
  }
}

export async function buy(productId: string, userId: string): Promise<BuyOutcome> {
  const block = userId ? storeBlockNow() : 'no_user';
  if (block) {
    if (block !== 'expo_go') note('blocked', block, productId);
    return { result: 'unavailable', code: block };
  }
  let step: 'login' | 'offerings' | 'products' | 'purchase' = 'login';
  try {
    const P = await client(userId);
    if (!P) {
      const now = storeBlockNow() ?? 'no_module';
      return { result: 'unavailable', code: now };
    }
    if (productId.startsWith('pro_')) {
      step = 'offerings';
      const offerings = await P.getOfferings();
      // a Play subscription is «pro:monthly»-style (product:base plan); match on our id either way
      const pkg = Object.values(offerings.all)
        .flatMap((o) => o.availablePackages)
        .find((x) => x.product.identifier === productId || x.product.identifier.startsWith(`${productId}:`));
      if (!pkg) {
        // a store or RevenueCat setup gap, not the player's device: says «Δεν ολοκληρώθηκε», and we hear of it
        note('offerings', 'product_not_found', productId);
        return { result: 'failed', code: 'product_not_found' };
      }
      step = 'purchase';
      await P.purchasePackage(pkg);
    } else {
      step = 'products';
      const [product] = await P.getProducts([productId], P.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
      if (!product) {
        note('products', 'product_not_found', productId);
        return { result: 'failed', code: 'product_not_found' };
      }
      step = 'purchase';
      await P.purchaseStoreProduct(product);
    }
    return { result: 'ok', code: null };
  } catch (e) {
    const out = purchaseErrorOutcome(e);
    if (out.result !== 'cancelled') note(step, out.code ?? 'unknown', productId);
    return out;
  }
}

/**
 * «Επαναφορά αγορών» (App Store guideline 3.1.1): asks the store what this store account bought and hands it to
 * RevenueCat, which tells our database through the webhook as with a purchase. The screen then asks the server again.
 */
export async function restore(userId: string): Promise<RestoreResult> {
  if (!userId || !storeReady()) return 'unavailable';
  try {
    const P = await client(userId);
    if (!P) return 'unavailable';
    const info = await P.restorePurchases();
    return restoreOutcome({
      activeEntitlements: Object.keys(info.entitlements.active).length,
      oneTimePurchases: info.nonSubscriptionTransactions.length,
    });
  } catch (e) {
    note('restore', storeErrorCode(e));
    return 'failed';
  }
}


/** For the staff row in Ρυθμίσεις: what the store looks like on this phone. Never the key itself. */
export async function storeDiagnostics(userId: string | null): Promise<StoreDiagnostics> {
  let offerings: StoreDiagnostics['offerings'] = null;
  if (userId && storeReady()) {
    try {
      const P = await client(userId);
      if (P) {
        const o = await P.getOfferings();
        offerings = Object.values(o.all).map((x) => ({ id: x.identifier, products: x.availablePackages.map((p) => p.product.identifier) }));
      }
    } catch (e) {
      note('offerings', storeErrorCode(e));
    }
  }
  return {
    ready: storeReady(),
    block: storeBlockNow(),
    nativeModule: Boolean(NativeModules.RNPurchases),
    keyPresent: KEY.length > 0,
    keyLength: KEY.length,
    keyPrefixOk: keyLooksRight(KEY, Platform.OS),
    configured: forUser !== null,
    offerings,
    lastError,
  };
}
