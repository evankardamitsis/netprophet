import type { Copy } from '@netprophet/copy';
import { PRO_PRICE_CENTS_PER_MONTH } from '@netprophet/core';
import type { ProState } from '@netprophet/db';
import { fmt } from './votes';

/** Pro (prototype V2, the pass sheet): the price line and what the screen says about your Pro. */

/** «8,99€», from core */
export function proPrice(cents: number = PRO_PRICE_CENTS_PER_MONTH): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}€`;
}

/** «8,99€ τον μήνα» */
export function priceLine(t: Copy): string {
  return fmt(t.pro.price, { price: proPrice() });
}

/** «Ενεργό» or «Ενεργό μέχρι 12/11» when you have Pro; null when you do not */
export function activeLine(state: ProState, t: Copy): string | null {
  if (!state.pro) return null;
  const end = state.current?.ends_at;
  if (!end) return t.pro.active;
  const d = new Date(end);
  return fmt(t.pro.activeUntil, { date: `${d.getDate()}/${d.getMonth() + 1}` });
}

/** «49,99€» from euros */
export function euro(n: number): string {
  const cents = Math.round(n * 100);
  return proPrice(cents);
}

export interface PlanCard {
  productId: string;
  title: string;
  /** «49,99€» */
  price: string;
  /** «ο πρώτος χρόνος · μέχρι 31/12» */
  note: string;
  /** «4,17€ τον μήνα» for a yearly plan */
  perMonth: string | null;
  /** the yearly or founding plan carries «Καλύτερη τιμή» */
  best: boolean;
}

const TRIAL_DAYS = 7;

/** «Σήμερα 0€. Από 25/10, 8,99€ τον μήνα. Ακύρωσε πριν και δεν χρεώνεσαι.»: what the free week costs, said plainly */
export function trialLine(card: PlanCard, t: Copy, now: Date = new Date()): string {
  const d = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
  const then = t.pro.trialThen[card.productId as keyof Copy['pro']['trialThen']] ?? t.pro.trialThen.pro_monthly;
  return fmt(t.pro.trialNote, { date: `${d.getDate()}/${d.getMonth() + 1}`, then: fmt(then, { price: card.price }) });
}

/** the plans as the Pro screen shows them: the yearly (or founding) first, then the monthly */
export function planCards(plans: { product_id: string; price: number; period: 'month' | 'year' }[], t: Copy): PlanCard[] {
  const p = t.pro.plans;
  return [...plans]
    .sort((a, b) => (a.period === b.period ? 0 : a.period === 'year' ? -1 : 1))
    .map((x) => ({
      productId: x.product_id,
      title: p[x.product_id as 'pro_monthly' | 'pro_yearly' | 'pro_founding'] ?? x.product_id,
      price: euro(x.price),
      note: x.product_id === 'pro_founding' ? p.foundingNote : x.period === 'year' ? p.yearlyNote : p.monthlyNote,
      perMonth: x.period === 'year' ? fmt(p.perMonth, { price: euro(Math.round((x.price / 12) * 100) / 100) }) : null,
      best: x.period === 'year',
    }));
}
