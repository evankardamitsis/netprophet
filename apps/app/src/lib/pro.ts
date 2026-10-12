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
