import { ErrorCode, Purchases, PurchasesError } from '@revenuecat/purchases-js';
import type { BuyResult, RestoreResult } from './storeTypes';

/**
 * Buying on the web (founder, 17 Oct): RevenueCat Web Billing, paid through Stripe. The products (Pro plans and every
 * cosmetic, see core.store_products) live in RevenueCat's offerings; we find the package whose product id matches and
 * open RevenueCat's checkout. The purchase reaches our database through the webhook, never from here.
 * Without EXPO_PUBLIC_RC_WEB_KEY (until the founder sets it) buying is «unavailable» and the screens say so.
 */
const KEY = process.env.EXPO_PUBLIC_RC_WEB_KEY ?? '';
let instance: Purchases | null = null;
let forUser: string | null = null;

export function storeReady(): boolean {
  return KEY.length > 0;
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

export async function buy(productId: string, userId: string): Promise<BuyResult> {
  if (!storeReady()) return 'unavailable';
  try {
    const p = await client(userId);
    const offerings = await p.getOfferings();
    const pkg = Object.values(offerings.all)
      .flatMap((o) => o.availablePackages)
      .find((x) => x.webBillingProduct.identifier === productId);
    if (!pkg) return 'unavailable';
    // never let a purchase land on another account
    if (p.getAppUserId() !== userId) return 'failed';
    await p.purchase({ rcPackage: pkg });
    return 'ok';
  } catch (e) {
    if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) return 'cancelled';
    return 'failed';
  }
}

/** On the web a purchase belongs to the account it was made on, so there is nothing to restore: signing in is enough. */
export async function restore(userId: string): Promise<RestoreResult> {
  void userId;
  return 'unavailable';
}
