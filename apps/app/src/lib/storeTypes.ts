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
