import { greekCaps, type Copy } from '@netprophet/copy';
import type { Celebration, MyResultCelebration } from '@netprophet/db';
import { fmt } from './votes';

export const isMyResult = (c: Celebration): c is MyResultCelebration => c.payload.type === 'my_result';

export interface MyResultView {
  win: boolean;
  label: string;
  title: string;
  /** the (latest) match: «6-4 6-2 με τον Π. Βλάχο» */
  line: string;
  /** what changed: «Φέτος 12-4», «3 νίκες στη σειρά», «Μεταξύ σας 2-1» */
  facts: string[];
}

/**
 * What a Pro player's result says. Several together (founder, 4 Nov) are one screen: how they went, then the latest
 * match and the numbers as they stand after it. The tone is a win when wins are at least as many as losses.
 */
export function myResultView(list: MyResultCelebration[], t: Copy): MyResultView {
  const c = t.myResult;
  const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const last = sorted[sorted.length - 1]!.payload;
  const wins = sorted.filter((x) => x.payload.win).length;
  const losses = sorted.length - wins;
  const one = sorted.length === 1;
  const win = wins >= losses;
  const parts = [
    wins > 0 ? (wins === 1 ? c.winsOne : fmt(c.winsMany, { n: wins })) : null,
    losses > 0 ? (losses === 1 ? c.lossesOne : fmt(c.lossesMany, { n: losses })) : null,
  ].filter((x): x is string => x !== null);
  const facts = [fmt(c.year, { w: last.year_wins, l: last.year_losses })];
  if (last.wins_in_row >= 2) facts.push(fmt(c.inRow, { n: last.wins_in_row }));
  if (one && last.h2h_wins !== null && last.h2h_losses !== null && last.h2h_wins + last.h2h_losses >= 2) {
    facts.push(fmt(c.h2h, { w: last.h2h_wins, l: last.h2h_losses }));
  }
  return {
    win,
    label: greekCaps(one ? (win ? c.labelWin : c.labelLoss) : c.labelMany),
    title: one ? (win ? c.titleWin : c.titleLoss) : parts.join(', '),
    line: last.score && last.opponent ? fmt(c.line, { score: last.score, opponent: last.opponent }) : last.score ?? '',
    facts,
  };
}
