import { useCallback, useEffect, useState } from 'react';
import type { ProOffer, ProOfferMoment } from '@netprophet/db';
import { useAuth } from './auth';
import { useApi } from './data';
import { buy, restore, storeReady } from './store';
import type { BuyResult, RestoreResult } from './storeTypes';

/**
 * Pro and cosmetics, bought (founder, 17 Oct). The store (RevenueCat: Stripe on the web, Google Play, later Apple)
 * takes the money; our database learns of it from the webhook a moment later, so after a purchase we ask again until
 * it shows. The free week is the store's trial on every plan: the card at the start, the charge on day 8 unless
 * the player cancels (founder, 18 Oct).
 */

/** sample mode: the guest sees the founding plans and a free week */
const SAMPLE: ProOffer = {
  pro: false,
  trial_available: true,
  on_trial: false,
  founding_until: '2026-12-31',
  plans: [
    { product_id: 'pro_founding', price: 49.99, period: 'year', renews: 69.99 },
    { product_id: 'pro_monthly', price: 8.99, period: 'month', renews: 8.99 },
  ],
  can_offer: true,
};

export function useProOffer(): { offer: ProOffer | null; refresh: () => Promise<void> } {
  const api = useApi();
  const [offer, setOffer] = useState<ProOffer | null>(api ? null : SAMPLE);
  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setOffer(await api.proOffer());
    } catch {
      // unknown: the screens show the plans without a free week
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { offer, refresh };
}

/** an offer moment showed its line: the server counts it toward one a day */
export function useOfferShown(): (moment: ProOfferMoment) => void {
  const api = useApi();
  return useCallback(
    (moment: ProOfferMoment) => {
      if (api) void api.proOfferShown(moment).catch(() => undefined);
    },
    [api],
  );
}

const WAIT_MS = 1500;
const WAIT_TRIES = 8;

/**
 * Buy a product (`pro_monthly`, `pro_founding`, `cos_bg_hard`…). Resolves after the store and, for a bought item,
 * once `landed()` says our database has it (the webhook), or after about twelve seconds of asking.
 */
export function usePurchase(): { ready: boolean; buy: (productId: string, landed: () => Promise<boolean>) => Promise<BuyResult> } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const run = useCallback(
    async (productId: string, landed: () => Promise<boolean>) => {
      if (!userId) return 'unavailable' as const;
      const r = await buy(productId, userId);
      if (r !== 'ok') return r;
      for (let i = 0; i < WAIT_TRIES; i++) {
        if (await landed()) return 'ok' as const;
        await new Promise((res) => setTimeout(res, WAIT_MS));
      }
      // paid, the webhook is late: the next refresh shows it
      return 'ok' as const;
    },
    [userId],
  );
  return { ready: userId !== null && storeReady(), buy: run };
}

/** «Επαναφορά αγορών»: the store's restore for the signed-in account; «unavailable» without one. */
export function useRestore(): () => Promise<RestoreResult> {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  return useCallback(async () => (userId ? restore(userId) : ('unavailable' as const)), [userId]);
}
