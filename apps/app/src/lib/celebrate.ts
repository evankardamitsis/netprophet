import { greekCaps, type Copy } from '@netprophet/copy';
import type { Celebration, QuestCelebration, StreakCelebration } from '@netprophet/db';
import { questCelebrationView } from './quests';
import { fmt } from './votes';

/**
 * What a σερί milestone celebration says (prototype msL): «ΣΕΡΙ», the number in the pill, the title, and a reward
 * line that names only what this milestone actually gave (a frame is given once, the σερί 3 freeze only the first
 * time).
 */
export interface CelebrationView {
  label: string;
  /** the σερί pill's number; null for quests, which have no pill */
  streak: number | null;
  title: string;
  reward: string;
}

/** which celebrations play together: the σερί ones one by one first, then every queued quest as ONE */
export function nextGroup(list: Celebration[]): Celebration[] {
  const streak = list.find((c) => c.payload.type === 'streak_milestone');
  return streak ? [streak] : list.filter((c) => c.payload.type === 'quest');
}

const isQuest = (c: Celebration): c is QuestCelebration => c.payload.type === 'quest';

/** the same full-screen moment for a group: quests without the pill (prototype), a σερί milestone with it */
export function groupView(group: Celebration[], t: Copy): CelebrationView {
  const quests = group.filter(isQuest);
  if (quests.length > 0) {
    const v = questCelebrationView(quests.map((q) => ({ quest: q.payload.quest, reward: q.payload.reward })), t);
    return { label: greekCaps(v.label), streak: null, title: v.title, reward: v.reward };
  }
  return celebrationView(group[0] as StreakCelebration, t);
}

export function celebrationView(c: StreakCelebration, t: Copy): CelebrationView {
  const n = c.payload.streak;
  const r = c.payload.reward ?? { freeze: false, frame: null };
  const frame = r.frame ? t.celebrate.frames[r.frame] ?? r.frame : null;
  const reward = r.freeze && frame ? t.celebrate.rewards.both : r.freeze ? t.celebrate.rewards.freeze : frame ? fmt(t.celebrate.rewards.frame, { name: frame }) : t.celebrate.rewards.none;
  return { label: greekCaps(t.celebrate.label), streak: n, title: t.celebrate.titles[n] ?? `${n}`, reward };
}
