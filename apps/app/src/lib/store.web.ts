import { ErrorCode, Purchases, PurchasesError } from '@revenuecat/purchases-js';
import { cleanKey, storeErrorCode, type BuyOutcome, type RestoreResult, type StoreBlock, type StoreDiagnostics } from './storeTypes';

/**
 * Buying on the web (founder, 17 Oct): RevenueCat Web Billing, paid through Stripe. The products (Pro plans and every
 * cosmetic, see core.store_products) live in RevenueCat's offerings; we find the package whose product id matches and
 * open RevenueCat's checkout. The purchase reaches our database through the webhook, never from here.
 * Without EXPO_PUBLIC_RC_WEB_KEY (until the founder sets it) buying is «unavailable» and the screens say so.
 */
const KEY = cleanKey(process.env.EXPO_PUBLIC_RC_WEB_KEY);
let lastError: StoreDiagnostics['lastError'] = null;
let instance: Purchases | null = null;
let forUser: string | null = null;

export function storeReady(): boolean {
  return KEY.length > 0;
}

export function storeBlockNow(): StoreBlock | null {
  return storeReady() ? null : 'no_key';
}

/** on the web the checkout configures itself when it opens */
export async function prepareStore(userId: string): Promise<void> {
  void userId;
}

/** The shared RevenueCat client, switched to this user (and waited for) before anything is bought. */
async function client(userId: string): Promise<Purchases> {
  if (!instance || forUser !== userId) {
    instance = Purchases.isConfigured() ? Purchases.getSharedInstance() : Purchases.configure({ apiKey: KEY, appUserId: userId });
    if (instance.getAppUserId() !== userId) await instance.changeUser(userId);
    forUser = userId;
  }
  return instance;
}

export async function buy(productId: string, userId: string): Promise<BuyOutcome> {
  if (!storeReady()) return { result: 'unavailable', code: 'no_key' };
  if (!userId) return { result: 'unavailable', code: 'no_user' };
  try {
    const p = await client(userId);
    const offerings = await p.getOfferings();
    const pkg = Object.values(offerings.all)
      .flatMap((o) => o.availablePackages)
      .find((x) => x.webBillingProduct.identifier === productId);
    if (!pkg) return fail('product_not_found');
    // never let a purchase land on another account
    if (p.getAppUserId() !== userId) return fail('wrong_user');
    await p.purchase({ rcPackage: pkg });
    return { result: 'ok', code: null };
  } catch (e) {
    if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) return { result: 'cancelled', code: null };
    return fail(e instanceof PurchasesError ? `web_${e.errorCode}` : storeErrorCode(e));
  }
}

/** On the web a purchase belongs to the account it was made on, so there is nothing to restore: signing in is enough. */
export async function restore(userId: string): Promise<RestoreResult> {
  void userId;
  return 'unavailable';
}

function fail(code: string): BuyOutcome {
  lastError = { op: 'purchase', code, at: Date.now() };
  return { result: 'failed', code };
}

export async function storeDiagnostics(userId: string | null): Promise<StoreDiagnostics> {
  let offerings: StoreDiagnostics['offerings'] = null;
  if (userId && storeReady()) {
    try {
      const o = await (await client(userId)).getOfferings();
      offerings = Object.values(o.all).map((x) => ({ id: x.identifier, products: x.availablePackages.map((p) => p.webBillingProduct.identifier) }));
    } catch (e) {
      lastError = { op: 'offerings', code: storeErrorCode(e), at: Date.now() };
    }
  }
  return {
    ready: storeReady(),
    block: storeBlockNow(),
    nativeModule: false,
    keyPresent: KEY.length > 0,
    keyLength: KEY.length,
    keyPrefixOk: KEY.length > 0,
    configured: forUser !== null,
    offerings,
    lastError,
  };
}
