import { withArticleAccusative, type Copy } from '@netprophet/copy';
import type { PlayerProTeaser } from '@netprophet/db';
import { fmt } from './votes';

/**
 * A player's card, the Pro part (founder, 2 Nov 2026: Pro sees everything on every card). For a free player the
 * card teases it with the real counts and the values locked: what there is to see, never what it says.
 */

export interface TeaserRow {
  key: string;
  label: string;
  /** «23 ματς» */
  count: string;
}

const matches = (t: Copy, n: number) => (n === 1 ? t.playerPro.matches.one : fmt(t.playerPro.matches.many, { n }));

/** the locked rows: every match, between you (only with a player of your own), each surface, deciding sets, tie-breaks */
export function teaserRows(x: PlayerProTeaser, hasPlayer: boolean, t: Copy): TeaserRow[] {
  const p = t.playerPro;
  const rows: TeaserRow[] = [];
  if (x.matches > 0) rows.push({ key: 'all', label: p.all, count: matches(t, x.matches) });
  if (hasPlayer && x.meetings > 0) rows.push({ key: 'meetings', label: p.meetings, count: matches(t, x.meetings) });
  for (const s of x.surfaces) {
    if (s.matches > 0) rows.push({ key: `surface-${s.surface}`, label: t.match.surfaces[s.surface] ?? s.surface, count: matches(t, s.matches) });
  }
  if (x.deciding > 0) rows.push({ key: 'deciding', label: p.deciding, count: matches(t, x.deciding) });
  if (x.tiebreaks > 0) rows.push({ key: 'tiebreaks', label: p.tiebreaks, count: matches(t, x.tiebreaks) });
  return rows;
}

/** «Όλα για τον Γιώργο» */
export function teaserTitle(first: string, gender: 'm' | 'f' | null, t: Copy): string {
  return fmt(t.playerPro.title, { who: withArticleAccusative(first, '', gender).trim() });
}

/** the guest's sample: a busy player, met three times */
export function mockPlayerProTeaser(): PlayerProTeaser {
  return {
    matches: 23,
    meetings: 3,
    surfaces: [
      { surface: 'clay', matches: 14 },
      { surface: 'hard', matches: 9 },
    ],
    deciding: 6,
    tiebreaks: 8,
  };
}
