/** Monthly ladder: ranking, scopes, leagues, promotion and relegation. Pure. */
import { toMs } from '../time';
import type { LeaderboardEntry, LeaderboardScope, League } from '../types';

export const LEAGUES: readonly League[] = ['bronze', 'silver', 'gold'];
export const LEAGUE_NAMES_EL: Readonly<Record<League, string>> = {
  bronze: 'Χάλκινη',
  silver: 'Ασημένια',
  gold: 'Χρυσή',
};
export const GROUP_SIZE = 20;
export const PROMOTE_TOP = 5;
export const RELEGATE_FROM_POSITION = 16;
export const AWARD_TOP = 3;

/** Points desc, then who reached their points first, then user id (binary order). */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.points !== b.points) return b.points - a.points;
  const ta = a.lastPointAt === null ? Number.POSITIVE_INFINITY : toMs(a.lastPointAt);
  const tb = b.lastPointAt === null ? Number.POSITIVE_INFINITY : toMs(b.lastPointAt);
  if (ta !== tb) return ta - tb;
  return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
}

export interface RankedEntry extends LeaderboardEntry {
  position: number;
}

export function rank(entries: readonly LeaderboardEntry[]): RankedEntry[] {
  return [...entries].sort(compareEntries).map((e, i) => ({ ...e, position: i + 1 }));
}

/**
 * Scope tabs. league: the viewer's group. friends: the viewer plus the friend ids. area: everyone in the viewer's area.
 * Rows are ranked within the scope.
 */
export function scoped(
  entries: readonly LeaderboardEntry[],
  scope: LeaderboardScope,
  viewerId: string,
  friendIds: ReadonlySet<string> = new Set(),
): RankedEntry[] {
  const me = entries.find((e) => e.userId === viewerId);
  if (!me) return [];
  let pool: LeaderboardEntry[];
  if (scope === 'league') pool = entries.filter((e) => e.groupId === me.groupId);
  else if (scope === 'friends') pool = entries.filter((e) => e.userId === viewerId || friendIds.has(e.userId));
  else pool = entries.filter((e) => e.area !== null && e.area === me.area);
  return rank(pool);
}

/** «Για την επόμενη θέση: N πόντοι ακόμα». N overtakes the entry above (one more than the gap, because ties are decided earlier). Null at the top. */
export function pointsToNextPosition(ranked: readonly RankedEntry[], userId: string): number | null {
  const idx = ranked.findIndex((e) => e.userId === userId);
  if (idx <= 0) return null;
  const me = ranked[idx];
  const above = ranked[idx - 1];
  if (!me || !above) return null;
  return above.points - me.points + 1;
}

export type Movement = 'promote' | 'relegate' | 'stay';

export interface CloseResult {
  userId: string;
  groupId: string;
  position: number;
  league: League;
  movement: Movement;
  nextLeague: League;
  topThreeAward: boolean;
}

const up = (l: League): League => (l === 'bronze' ? 'silver' : 'gold');
const down = (l: League): League => (l === 'gold' ? 'silver' : 'bronze');

/**
 * Month close for one league group (apply per group). Top 5 with points promote (not above gold);
 * positions 16 to 20 relegate (not below bronze); top 3 with points get the award.
 * Players with 0 points never promote or get awards.
 */
export function closeGroup(group: readonly LeaderboardEntry[]): CloseResult[] {
  return rank(group).map((e) => {
    let movement: Movement = 'stay';
    if (e.position <= PROMOTE_TOP && e.points > 0 && e.league !== 'gold') movement = 'promote';
    else if (e.position >= RELEGATE_FROM_POSITION && e.league !== 'bronze') movement = 'relegate';
    return {
      userId: e.userId,
      groupId: e.groupId,
      position: e.position,
      league: e.league,
      movement,
      nextLeague: movement === 'promote' ? up(e.league) : movement === 'relegate' ? down(e.league) : e.league,
      topThreeAward: e.position <= AWARD_TOP && e.points > 0,
    };
  });
}

/** Close every group in the month. Input order does not matter. */
export function closeMonth(entries: readonly LeaderboardEntry[]): CloseResult[] {
  const groups = new Map<string, LeaderboardEntry[]>();
  for (const e of entries) groups.set(e.groupId, [...(groups.get(e.groupId) ?? []), e]);
  return [...groups.keys()].sort().flatMap((id) => closeGroup(groups.get(id) ?? []));
}

/** Fill groups of 20 in the given user order (callers order by last month's points or join date). */
export function assignGroups(userIds: readonly string[], league: League, size: number = GROUP_SIZE): Array<{ groupId: string; league: League; userIds: string[] }> {
  const out: Array<{ groupId: string; league: League; userIds: string[] }> = [];
  for (let i = 0; i < userIds.length; i += size) {
    out.push({ groupId: `${league}-${out.length + 1}`, league, userIds: userIds.slice(i, i + size) });
  }
  return out;
}
