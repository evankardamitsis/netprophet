import { greekCaps, type Copy } from '@netprophet/copy';
import type { BadgeCelebration, Celebration, LeagueCelebration, LevelCelebration, QuestCelebration, StreakCelebration, UnlockCelebration } from '@netprophet/db';
import { badgeName } from './badges';
import { questCelebrationView } from './quests';
import { leagueCelebrationView } from './ladder';
import { hasMoment } from './unlockLadder';
import { fmt } from './votes';

/**
 * What a σερί milestone celebration says (prototype msL): «ΣΕΡΙ», the number in the pill, the title, and a reward
 * line that names only what this milestone actually gave (a frame is given once, the σερί 3 freeze only the first
 * time).
 */
export interface CelebrationView {
  label: string;
  /** the pill's number (σερί, or the new level); null for quests, which have no pill */
  streak: number | null;
  /** the word beside the pill's number: «σερί» when left out, nothing for a level */
  unit?: string;
  /** a badge's tier (1 to 3): the three dots under the title fill up to it; null for σερί and quests */
  tier: number | null;
  title: string;
  reward: string;
}

/** which celebrations play together: the σερί ones one by one first, then a new level, then every queued quest as ONE, then badges, then unlocks, then the month's league result, one by one */
export function nextGroup(list: Celebration[]): Celebration[] {
  const streak = list.find((c) => c.payload.type === 'streak_milestone');
  if (streak) return [streak];
  const level = list.find(isLevel);
  if (level) return [level];
  const quests = list.filter((c) => c.payload.type === 'quest');
  if (quests.length > 0) return quests;
  const badge = list.find((c) => c.payload.type === 'badge');
  if (badge) return [badge];
  const unlock = list.find((c) => isUnlock(c) && hasMoment(c.payload.key));
  if (unlock) return [unlock];
  const league = list.find(isLeague);
  return league ? [league] : [];
}

const isQuest = (c: Celebration): c is QuestCelebration => c.payload.type === 'quest';
export const isLevel = (c: Celebration): c is LevelCelebration => c.payload.type === 'level';

/** a new game level: «LEVEL», the number in the pill, «Ανέβηκες level!» */
export function levelCelebrationView(c: LevelCelebration, t: Copy): CelebrationView {
  const l = t.celebrate.level;
  return { label: greekCaps(l.label), streak: c.payload.level, unit: '', tier: null, title: l.title, reward: l.line };
}
const isBadge = (c: Celebration): c is BadgeCelebration => c.payload.type === 'badge';
export const isLeague = (c: Celebration): c is LeagueCelebration => c.payload.type === 'league';
export const isUnlock = (c: Celebration): c is UnlockCelebration => c.payload.type === 'unlock';

/** an unlock step opening: «Νέο», the title by step and its line (empty for most) */
export function unlockCelebrationView(c: UnlockCelebration, t: Copy): CelebrationView {
  const m = t.unlocks.moments[c.payload.key];
  return { label: greekCaps(t.unlocks.label), streak: null, tier: null, title: m?.title ?? '', reward: m?.line ?? '' };
}

/** the month closed: «ΚΑΤΑΤΑΞΗ · ΧΑΛΚΙΝΗ», «3ος», then the Frame and badge or next month's league */
export function leagueView(c: LeagueCelebration, t: Copy): CelebrationView {
  const v = leagueCelebrationView(c, t);
  return { label: greekCaps(v.label), streak: null, tier: null, title: v.title, reward: v.reward };
}

/** the big title shrinks for the long ones so it fits in a few lines (54 → 40 past ~22 characters) */
export function celebrationTitleSize(title: string): number {
  return title.length > 22 ? 40 : 54;
}

/** «Νέο badge» / «Νέα βαθμίδα», the badge's name, then «Βαθμίδα Χάλκινο» (gold also names the Frame Level) */
export function badgeCelebrationView(c: BadgeCelebration, t: Copy): CelebrationView {
  const { badge, tier } = c.payload;
  const tierName = t.badges.tiers[tier - 1] ?? '';
  return {
    label: greekCaps(c.payload.new ? t.badges.celebrationNew : t.badges.celebrationTier),
    streak: null,
    tier,
    title: badgeName(badge, t),
    reward: fmt(tier >= 3 ? t.badges.rewardGold : t.badges.reward, { tier: tierName }),
  };
}

/** the same full-screen moment for a group: quests without the pill (prototype), a σερί milestone with it */
export function groupView(group: Celebration[], t: Copy): CelebrationView {
  const quests = group.filter(isQuest);
  if (quests.length > 0) {
    const v = questCelebrationView(quests.map((q) => ({ quest: q.payload.quest, reward: q.payload.reward })), t);
    return { label: greekCaps(v.label), streak: null, tier: null, title: v.title, reward: v.reward };
  }
  if (isLevel(group[0]!)) return levelCelebrationView(group[0], t);
  if (isBadge(group[0]!)) return badgeCelebrationView(group[0], t);
  if (isUnlock(group[0]!)) return unlockCelebrationView(group[0], t);
  if (isLeague(group[0]!)) return leagueView(group[0], t);
  return celebrationView(group[0] as StreakCelebration, t);
}

export function celebrationView(c: StreakCelebration, t: Copy): CelebrationView {
  const n = c.payload.streak;
  const r = c.payload.reward ?? { freeze: false, frame: null };
  const frame = r.frame ? t.celebrate.frames[r.frame] ?? r.frame : null;
  const gear = r.gear ? t.celebrate.gear[r.gear] ?? r.gear : null;
  const reward =
    r.freeze && frame
      ? t.celebrate.rewards.both
      : r.freeze
        ? t.celebrate.rewards.freeze
        : frame
          ? fmt(t.celebrate.rewards.frame, { name: frame })
          : gear
            ? fmt(t.celebrate.rewards.gear, { name: gear })
            : t.celebrate.rewards.none;
  return { label: greekCaps(t.celebrate.label), streak: n, tier: null, title: t.celebrate.titles[n] ?? `${n}`, reward };
}
