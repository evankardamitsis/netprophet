import type { Copy } from '@netprophet/copy';
import type { BadgeRow, GetBadgesResult } from '@netprophet/db';
import { colors } from '@netprophet/tokens';
import { fmt } from './votes';

export type BadgeSnapshot = Pick<GetBadgesResult, 'badges'>;

const at = (b: BadgeRow, i: number): number => (b.thresholds as number[])[i]!;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** the counter the current tier started from (0 while locked) */
export function prevThreshold(b: BadgeRow): number {
  return b.tier === 0 ? 0 : at(b, b.tier - 1);
}

/** how many more to the next tier; 0 at gold */
export function left(b: BadgeRow): number {
  return b.tier >= 3 ? 0 : at(b, b.tier) - b.counter;
}

/** the bar's fill, 0 to 1, within the current tier; full at gold */
export function pct(b: BadgeRow): number {
  if (b.tier >= 3) return 1;
  const from = prevThreshold(b);
  const span = at(b, b.tier) - from;
  return span > 0 ? clamp01((b.counter - from) / span) : 0;
}

/** earned (tier above 0), highest tier first, the server's order within a tier */
export function earned(list: BadgeRow[]): BadgeRow[] {
  return list.map((b, i) => ({ b, i })).filter((x) => x.b.tier > 0).sort((a, c) => c.b.tier - a.b.tier || a.i - c.i).map((x) => x.b);
}

export function locked(list: BadgeRow[]): BadgeRow[] {
  return list.filter((b) => b.tier === 0);
}

/** the badge closest to its next tier, by the share of the current step still to go; null when all are gold */
export function nextBadge(list: BadgeRow[]): BadgeRow | null {
  let best: BadgeRow | null = null;
  let bestShare = Infinity;
  for (const b of list) {
    if (b.tier >= 3) continue;
    const span = at(b, b.tier) - prevThreshold(b);
    const share = span > 0 ? left(b) / span : Infinity;
    if (share < bestShare) {
      best = b;
      bestShare = share;
    }
  }
  return best;
}

/** what to show first on the badges screen: the asked-for badge if it exists, else the first earned, else the first */
export function pickSelected(list: BadgeRow[], key: string | undefined): BadgeRow | null {
  return list.find((b) => b.key === key) ?? earned(list)[0] ?? list[0] ?? null;
}

export interface TierStyle {
  bg: string;
  text: string;
  border: string;
  borderWidth: number;
  dashed: boolean;
  dot: string;
}

/** tier 0 dashed and see-through, 1 white with an ink frame, 2 silver, 3 lime (prototype) */
export function tierStyle(tier: number): TierStyle {
  switch (tier) {
    case 1:
      return { bg: colors.white, text: colors.ink, border: colors.ink, borderWidth: 3, dashed: false, dot: colors.ink };
    case 2:
      return { bg: colors.silver, text: colors.ink, border: colors.muted, borderWidth: 3, dashed: false, dot: colors.muted };
    case 3:
      return { bg: colors.lime, text: colors.ink, border: colors.ink, borderWidth: 3, dashed: false, dot: colors.ink };
    default:
      return { bg: 'transparent', text: colors.inkSoft, border: colors.muted, borderWidth: 2, dashed: true, dot: colors.muted };
  }
}

export function badgeName(key: string, t: Copy): string {
  return t.badges.names[key] ?? key;
}

export function tierName(tier: number, t: Copy): string {
  return t.badges.tiers[tier - 1] ?? '';
}

/** «5 / 25 / 100 σωστές ψήφοι στο Ψήφισε» */
export function ruleLine(b: BadgeRow, t: Copy): string {
  return `${b.thresholds.join(' / ')} ${t.badges.units[b.key] ?? ''}`.trim();
}

/** «Ασημένιο · βαθμίδα 2 από 3», or «Κλειδωμένο» */
export function tierOfLine(b: BadgeRow, t: Copy): string {
  return b.tier === 0 ? t.badges.lockedTier : fmt(t.badges.tierOf, { tier: tierName(b.tier, t), n: b.tier });
}

/** a grid tile: «Χάλκινο · ακόμα 4», gold just «Χρυσό» */
export function tileTierLine(b: BadgeRow, t: Copy): string {
  return b.tier >= 3 ? tierName(3, t) : fmt(t.badges.tileTier, { tier: tierName(b.tier, t), n: left(b) });
}

/** «Ακόμα 4 για το ασημένιο», or «Χρυσό. Τα έχεις όλα.» */
export function leftLine(b: BadgeRow, t: Copy): string {
  return b.tier >= 3 ? t.badges.maxed : fmt(t.badges.leftFor, { n: left(b), tierLower: t.badges.tiersLower[b.tier] ?? '' });
}

export function moreLine(b: BadgeRow, t: Copy): string {
  return fmt(t.badges.more, { n: left(b) });
}

export type BadgeBar = { kind: 'bar'; title: string; from: number; to: number; progress: number; target: number };

/**
 * After a vote: a badge whose counter went up and is now exactly one short of its next tier shows the slim bar,
 * filling from where it was. The first such badge in the server's order.
 */
export function badgeBarFeedback(before: BadgeSnapshot | null, after: BadgeSnapshot | null, t: Copy): BadgeBar | null {
  if (!after) return null;
  const was = new Map((before?.badges ?? []).map((b) => [b.key, b]));
  for (const b of after.badges) {
    const prev = was.get(b.key);
    if (b.tier >= 3 || left(b) !== 1 || b.counter <= (prev?.counter ?? 0)) continue;
    return {
      kind: 'bar',
      title: fmt(t.badges.oneMore, { name: badgeName(b.key, t) }),
      from: prev && prev.tier === b.tier ? pct(prev) : 0,
      to: pct(b),
      progress: b.counter,
      target: at(b, b.tier),
    };
  }
  return null;
}
