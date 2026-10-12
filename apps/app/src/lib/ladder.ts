import type { Copy } from '@netprophet/copy';
import { POINTS } from '@netprophet/core';
import type { Ladder, LadderRow } from '@netprophet/db';
import { fmt } from './votes';

/**
 * Κατάταξη (prototype V2, isRank): the words around this month's board. The numbers come from
 * api.get_ladder; this only turns them into the prototype's lines.
 */

/** The name on a row: first name and surname, else the display name; «Εσύ» for the viewer. */
export function rowName(row: Pick<LadderRow, 'first_name' | 'surname' | 'display_name'> & { is_me?: boolean }, t: Copy): string {
  if (row.is_me) return t.ladder.you;
  const full = [row.first_name, row.surname].filter(Boolean).join(' ').trim();
  return full || row.display_name?.trim() || '';
}

/** «Για την επόμενη θέση: 21 πόντοι ακόμα», or «Στην κορυφή: Κράτα τη θέση» */
export function nextLine(ladder: Ladder, t: Copy): { label: string; value: string } {
  const l = t.ladder;
  const toNext = ladder.me?.to_next ?? null;
  if (toNext === null) return { label: l.top, value: l.keep };
  return { label: l.next, value: toNext === 1 ? l.toNext.one : fmt(l.toNext.many, { n: toNext }) };
}

export interface Motivation {
  head: string;
  sub: string;
  button: string;
}

/**
 * The lime card under the position: what is in the air, or who is right above you and how many
 * correct votes pass them, or that you lead. Its button goes back to the votes.
 */
export function motivation(ladder: Ladder, t: Copy): Motivation {
  const l = t.ladder;
  const button = ladder.open_votes > 0 ? fmt(l.voteNow, { n: ladder.open_votes }) : l.backToVotes;
  const atTop = ladder.me?.to_next == null;

  if (ladder.pending > 0) {
    const open =
      ladder.open_votes > 0
        ? ladder.open_votes === 1
          ? l.pending.open.one
          : fmt(l.pending.open.many, { n: ladder.open_votes })
        : l.pending.allVoted;
    return { head: fmt(l.pending.head, { n: ladder.pending }), sub: `${atTop ? l.pending.lead : l.pending.up} ${open}`, button };
  }

  const above = ladder.me?.above;
  const toNext = ladder.me?.to_next ?? null;
  if (toNext !== null && above) {
    const name = rowName(above, t);
    const votes = votesToPass(toNext);
    const sub = votes === 1 ? l.chase.sub.one : fmt(l.chase.sub.many, { n: votes });
    const streak = ladder.streak > 0 ? ` ${fmt(l.chase.streak, { n: ladder.streak })}` : '';
    return {
      head: toNext === 1 ? fmt(l.chase.headOne, { name }) : fmt(l.chase.head, { name, n: toNext }),
      sub: sub + streak,
      button,
    };
  }

  return { head: l.leading.head, sub: l.leading.sub, button };
}

/** Correct votes (at +10 each) that cover the points to the next place. */
export function votesToPass(toNext: number): number {
  return Math.max(1, Math.ceil(toNext / POINTS.CORRECT_VOTE));
}

/** «Πώς βγαίνουν οι πόντοι», from the core rules. The daily quiz row comes with M3. */
export function pointRules(t: Copy): { label: string; value: string }[] {
  const r = t.ladder.rules;
  return [
    { label: r.correct, value: `+${POINTS.CORRECT_VOTE}` },
    { label: r.upset, value: `+${POINTS.UPSET_CALL}` },
    { label: r.chain, value: fmt(r.chainValue, { n: POINTS.CHAIN_BONUS }) },
  ];
}
