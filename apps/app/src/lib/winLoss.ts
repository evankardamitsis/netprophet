import type { Copy } from '@netprophet/copy';
import type { WinLossSplits } from '@netprophet/db';

/**
 * «Πού κερδίζεις, πού χάνεις» (Pro): which splits of your results are strengths and which weaknesses.
 * A split needs MIN_MATCHES to count. Above your overall win rate is ↑, below is ↓. The prototype shows two of
 * each: the two best splits above your rate and the two worst below it.
 */
export const MIN_MATCHES = 3;
const SHOW_EACH = 2;

export interface WinLossRow {
  key: string;
  label: string;
  /** «↑ 5-1» */
  value: string;
  up: boolean;
}

export function winLossRows(data: WinLossSplits, t: Copy): WinLossRow[] {
  const total = data.total;
  if (!total || total.w + total.l === 0) return [];
  const overall = total.w / (total.w + total.l);
  const scored = data.rows
    .filter((r) => r.w + r.l >= MIN_MATCHES)
    .map((r) => ({ ...r, rate: r.w / (r.w + r.l) }));
  const ups = scored.filter((r) => r.rate > overall).sort((a, b) => b.rate - a.rate || b.w + b.l - (a.w + a.l)).slice(0, SHOW_EACH);
  const downs = scored.filter((r) => r.rate < overall).sort((a, b) => a.rate - b.rate || b.w + b.l - (a.w + a.l)).slice(0, SHOW_EACH);
  return [...ups.map((r) => ({ r, up: true })), ...downs.map((r) => ({ r, up: false }))].map(({ r, up }) => ({
    key: r.key,
    label: t.winLoss.rows[r.key],
    value: `${up ? '↑' : '↓'} ${r.w}-${r.l}`,
    up,
  }));
}

/** what free users see, blurred: sample rows in the prototype's shape */
export function teaserRows(t: Copy): WinLossRow[] {
  const r = t.winLoss.rows;
  return [
    { key: 'morning', label: r.morning, value: '↑ 7-3', up: true },
    { key: 'deciding', label: r.deciding, value: '↑ 5-1', up: true },
    { key: 'lefties', label: r.lefties, value: '↓ 2-5', up: false },
    { key: 'evening', label: r.evening, value: '↓ 3-5', up: false },
  ];
}
