import { ErrorCode, Purchases, PurchasesError } from '@revenuecat/purchases-js';
import type { BuyResult } from './storeTypes';

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

function client(userId: string): Purchases {
  if (!instance || forUser !== userId) {
    instance = Purchases.isConfigured() ? Purchases.getSharedInstance() : Purchases.configure({ apiKey: KEY, appUserId: userId });
    if (forUser && forUser !== userId) void instance.changeUser(userId);
    forUser = userId;
  }
  return instance;
}

export async function buy(productId: string, userId: string): Promise<BuyResult> {
  if (!storeReady()) return 'unavailable';
  try {
    const p = client(userId);
    const offerings = await p.getOfferings();
    const pkg = Object.values(offerings.all)
      .flatMap((o) => o.availablePackages)
      .find((x) => x.webBillingProduct.identifier === productId);
    if (!pkg) return 'unavailable';
    await p.purchase({ rcPackage: pkg });
    return 'ok';
  } catch (e) {
    if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) return 'cancelled';
    return 'failed';
  }
}
