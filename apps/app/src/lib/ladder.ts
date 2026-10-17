import type { Copy } from '@netprophet/copy';
import { POINTS } from '@netprophet/core';
import type { Ladder, LadderRow, LadderScope, LeagueCelebration } from '@netprophet/db';
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

/** the scope tabs in prototype order; «Κατηγορία» only with a league, «Όλη η Αττική» only once the stats area is open */
export function scopeTabs(hasLeague: boolean, areaOpen: boolean): LadderScope[] {
  const tabs: LadderScope[] = [];
  if (hasLeague) tabs.push('league');
  tabs.push('friends');
  if (areaOpen) tabs.push('all');
  return tabs;
}

/** the scope to show: the picked one if it is still a tab, else the league when there is one, else the people you know */
export function pickScope(picked: LadderScope | null, hasLeague: boolean, areaOpen: boolean): LadderScope {
  const tabs = scopeTabs(hasLeague, areaOpen);
  if (picked && tabs.includes(picked)) return picked;
  return hasLeague ? 'league' : 'friends';
}

/** the pill on the ink card */
export function scopeLabel(ladder: Ladder, t: Copy): string {
  if (ladder.scope === 'league' && ladder.league) {
    return fmt(t.ladder.scopeName.league, { tier: t.ladder.tiers[ladder.league.tier], n: ladder.league.size });
  }
  return t.ladder.scopeName[ladder.scope === 'all' ? 'all' : 'friends'];
}

export type BoardItem = { kind: 'band'; label: string } | { kind: 'row'; row: LadderRow };

/**
 * The «Κατηγορία» board: «↑ Ανεβαίνουν κατηγορία» above row 1 (not in gold) and «↓ Αλλάζουν κατηγορία» before
 * row 16 (not in bronze). Other scopes are plain rows.
 */
export function boardItems(ladder: Ladder, t: Copy): BoardItem[] {
  const items: BoardItem[] = [];
  const lg = ladder.scope === 'league' ? ladder.league : null;
  ladder.rows.forEach((row, i) => {
    if (lg && i === 0 && lg.tier !== 'gold') items.push({ kind: 'band', label: t.ladder.league.up });
    if (lg && row.position === lg.relegate_from && lg.tier !== 'bronze') items.push({ kind: 'band', label: t.ladder.league.down });
    items.push({ kind: 'row', row });
  });
  return items;
}

/** the month-close moment: «ΚΑΤΑΤΑΞΗ · ΧΑΛΚΙΝΗ», «3ος», then the Frame and badge or next month's league */
export function leagueCelebrationView(c: LeagueCelebration, t: Copy): { label: string; title: string; reward: string } {
  const l = t.ladder;
  const p = c.payload;
  return {
    label: fmt(l.league.label, { tier: l.tiers[p.tier] }),
    title: fmt(l.position, { n: p.position }),
    reward: p.award ? l.league.award : fmt(l.league.next, { tier: l.tiers[p.next_tier] }),
  };
}

/**
 * The podium over the board (founder, 17 Oct: Baller everywhere): the top three with points, laid out second, first,
 * third. Null with fewer than two, where a podium says nothing.
 */
export function podiumOf<R extends { position: number; points: number }>(rows: R[]): R[] | null {
  const top = rows.filter((r) => r.position <= 3 && r.points > 0).sort((a, b) => a.position - b.position);
  if (top.length < 2) return null;
  return top.length === 3 ? [top[1]!, top[0]!, top[2]!] : [top[1]!, top[0]!];
}
