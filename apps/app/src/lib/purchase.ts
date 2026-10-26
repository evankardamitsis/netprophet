import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProOffer, ProOfferMoment } from '@netprophet/db';
import { useAuth } from './auth';
import { useApi } from './data';
import { buy, restore, storeDiagnostics, storeFacts, storeReady } from './store';
import { DIAG_TIMEOUT_MS, emptyDiag, storeErrorCode, withTimeout, type BuyOutcome, type RestoreResult, type StoreDiagnostics } from './storeTypes';

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

export function useProOffer(): { offer: ProOffer | null; failed: boolean; refresh: () => Promise<void> } {
  const api = useApi();
  const [offer, setOffer] = useState<ProOffer | null>(api ? null : SAMPLE);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setOffer(await api.proOffer());
      setFailed(false);
    } catch {
      // the plans did not come: the Pro screen says so and offers to ask again, instead of showing no button
      setFailed(true);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { offer, failed, refresh };
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
export function usePurchase(): { ready: boolean; buy: (productId: string, landed: () => Promise<boolean>) => Promise<BuyOutcome> } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const run = useCallback(
    async (productId: string, landed: () => Promise<boolean>): Promise<BuyOutcome> => {
      if (!userId) return { result: 'unavailable', code: 'no_user' };
      const r = await buy(productId, userId);
      if (r.result !== 'ok') return r;
      for (let i = 0; i < WAIT_TRIES; i++) {
        if (await landed().catch(() => false)) return r;
        await new Promise((res) => setTimeout(res, WAIT_MS));
      }
      // paid, the webhook is late: the next refresh shows it
      return r;
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

/** the staff panel's state: nothing asked yet, asking (the phone's own facts already in), done, or the check failed */
export type DiagState =
  | { phase: 'idle' }
  | { phase: 'checking'; diag: StoreDiagnostics }
  | { phase: 'done'; diag: StoreDiagnostics }
  | { phase: 'failed'; diag: StoreDiagnostics; code: string };

/**
 * Staff only (Εγώ › Ρυθμίσεις): the store's state on this phone, asked again with `check`. The phone's own facts show
 * at once; the offerings follow. A check that throws or hangs ends in «failed» with its code, never in silence.
 */
export function useStoreDiagnostics(): { state: DiagState; check: () => Promise<void> } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [state, setState] = useState<DiagState>({ phase: 'idle' });
  const running = useRef(false);
  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    let facts: StoreDiagnostics | null = null;
    try {
      facts = storeFacts();
      setState({ phase: 'checking', diag: facts });
      // storeDiagnostics never hangs on its own; this is the last guard
      const diag = await withTimeout(storeDiagnostics(userId), DIAG_TIMEOUT_MS * 2 + 1000);
      setState({ phase: 'done', diag });
    } catch (e) {
      let now: StoreDiagnostics | null = facts;
      try {
        now = storeFacts();
      } catch {
        // keep what we had
      }
      setState({ phase: 'failed', diag: now ?? emptyDiag(), code: storeErrorCode(e) });
    } finally {
      running.current = false;
    }
  }, [userId]);
  return { state, check };
}
