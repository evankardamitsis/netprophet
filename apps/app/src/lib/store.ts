import { NativeModules, Platform } from 'react-native';
import type { BuyResult } from './storeTypes';

/**
 * Buying in the apps (founder, 17 Oct): Google Play now, Apple when its account is approved, both through RevenueCat
 * (react-native-purchases). Subscriptions come from RevenueCat's offerings, cosmetics are one-time store products;
 * the purchase reaches our database through the webhook, never from here. The native module exists only in a
 * development or store build, and the keys come from the founder: without either, buying is «unavailable».
 */
const KEY = (Platform.OS === 'android' ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY : process.env.EXPO_PUBLIC_RC_IOS_KEY) ?? '';

type RNP = typeof import('react-native-purchases').default;
let mod: RNP | null | undefined;
let forUser: string | null = null;

function native(): RNP | null {
  if (mod !== undefined) return mod;
  try {
    // Expo Go has no native module: loading it there would throw on first use
    mod = NativeModules.RNPurchases ? (require('react-native-purchases').default as RNP) : null; // eslint-disable-line @typescript-eslint/no-var-requires
  } catch {
    mod = null;
  }
  return mod;
}

export function storeReady(): boolean {
  return KEY.length > 0 && native() !== null;
}

async function client(userId: string): Promise<RNP> {
  const P = native()!;
  if (forUser === null) {
    P.configure({ apiKey: KEY, appUserID: userId });
  } else if (forUser !== userId) {
    await P.logIn(userId);
  }
  forUser = userId;
  return P;
}

export async function buy(productId: string, userId: string): Promise<BuyResult> {
  if (!storeReady()) return 'unavailable';
  try {
    const P = await client(userId);
    if (productId.startsWith('pro_')) {
      const offerings = await P.getOfferings();
      // a Play subscription is «pro:monthly»-style (product:base plan); match on our id either way
      const pkg = Object.values(offerings.all)
        .flatMap((o) => o.availablePackages)
        .find((x) => x.product.identifier === productId || x.product.identifier.startsWith(`${productId}:`));
      if (!pkg) return 'unavailable';
      await P.purchasePackage(pkg);
    } else {
      const [product] = await P.getProducts([productId], P.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
      if (!product) return 'unavailable';
      await P.purchaseStoreProduct(product);
    }
    return 'ok';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
    return 'failed';
  }
}
