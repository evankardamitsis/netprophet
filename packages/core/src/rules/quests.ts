/** Quest rules. Rewards are cosmetic or badge only, never points. Pure. */
import { dayKey, weekKey, type Instant } from '../time';
import type { QuestDef, QuestEvent, QuestProgress, QuestReward, QuestWindow } from '../types';

export const DAILY_QUESTS: readonly QuestDef[] = [
  {
    id: 'daily_vote_3_cards',
    window: 'daily',
    target: 3,
    triggers: [{ event: 'vote_card', mode: 'inc' }],
    reward: { cosmeticId: 'frame.daily.1', badgeId: 'polla-ta-psifalakia', badgeAmount: 3 },
  },
  {
    id: 'daily_kudos_1',
    window: 'daily',
    target: 1,
    triggers: [{ event: 'kudos_given', mode: 'inc' }],
    reward: { cosmeticId: 'background.daily.2', badgeId: 'o-evgenikos', badgeAmount: 1 },
  },
  {
    id: 'daily_vote_2_matches',
    window: 'daily',
    target: 2,
    triggers: [{ event: 'vote_match', mode: 'inc' }],
    reward: { cosmeticId: 'frame.daily.3', badgeId: 'manths-tou-klab', badgeAmount: 2 },
  },
];

export const WEEKLY_QUESTS: readonly QuestDef[] = [
  {
    id: 'weekly_log_2_matches',
    window: 'weekly',
    target: 2,
    triggers: [{ event: 'match_logged', mode: 'inc' }],
    reward: { cosmeticId: 'frame.weekly.1', badgeId: 'proto-servis', badgeAmount: 2 },
  },
  {
    id: 'weekly_vote_5_days',
    window: 'weekly',
    target: 5,
    triggers: [{ event: 'active_day', mode: 'distinct_day' }],
    reward: { cosmeticId: 'background.weekly.2', badgeId: 'oli-i-vdomada', badgeAmount: 1 },
  },
];

/** Invite quest: 0 = not invited, 1 = invite sent, 2 = friend joined and a match was played. */
export const INVITE_QUEST: QuestDef = {
  id: 'invite_friend',
  window: 'lifetime',
  target: 2,
  triggers: [
    { event: 'friend_invited', mode: 'at_least', value: 1 },
    { event: 'friend_activated', mode: 'at_least', value: 2 },
  ],
  reward: { cosmeticId: 'frame.invite', badgeId: 'influencer', badgeAmount: 1 },
};

export const ALL_QUESTS: readonly QuestDef[] = [...DAILY_QUESTS, ...WEEKLY_QUESTS, INVITE_QUEST];

export function windowKeyFor(window: QuestWindow, at: Instant): string {
  if (window === 'daily') return dayKey(at);
  if (window === 'weekly') return weekKey(at);
  return 'all';
}

export function emptyProgress(def: QuestDef, at: Instant): QuestProgress {
  return {
    questId: def.id,
    windowKey: windowKeyFor(def.window, at),
    current: 0,
    days: [],
    doneAt: null,
    rewardGranted: false,
  };
}

/** The stored progress if it belongs to the current window, else a fresh one (the reset). */
export function progressAt(def: QuestDef, stored: QuestProgress | undefined, at: Instant): QuestProgress {
  const key = windowKeyFor(def.window, at);
  return stored && stored.windowKey === key ? stored : emptyProgress(def, at);
}

export interface QuestStep {
  questId: string;
  from: number;
  to: number;
  target: number;
}

export interface QuestUpdate {
  progress: QuestProgress[];
  /** Every counted step: drives the slim progress bar (old to new value). */
  steps: QuestStep[];
  /** Quests that reached their target on this event: the only moment for a celebration. */
  completed: string[];
}

/** Apply one event to every quest it touches. `stored` may be missing quests or hold stale windows. */
export function applyQuestEvent(
  defs: readonly QuestDef[],
  stored: readonly QuestProgress[],
  event: QuestEvent,
): QuestUpdate {
  const byId = new Map(stored.map((p) => [p.questId, p]));
  const steps: QuestStep[] = [];
  const completed: string[] = [];
  const out: QuestProgress[] = [];
  for (const def of defs) {
    const existing = byId.get(def.id);
    const eventKey = windowKeyFor(def.window, event.at);
    if (existing && existing.windowKey > eventKey) {
      out.push(existing); // late event from an older window: ignore
      continue;
    }
    const prog = progressAt(def, existing, event.at);
    const trigger = def.triggers.find((t) => t.event === event.type);
    if (!trigger || prog.doneAt !== null) {
      out.push(prog);
      continue;
    }
    let current = prog.current;
    let days = prog.days;
    if (trigger.mode === 'inc') {
      current += 1;
    } else if (trigger.mode === 'distinct_day') {
      const day = dayKey(event.at);
      if (!days.includes(day)) {
        days = [...days, day];
        current += 1;
      }
    } else {
      current = Math.max(current, trigger.value ?? 0);
    }
    current = Math.min(current, def.target);
    if (current === prog.current) {
      out.push(prog);
      continue;
    }
    const done = current >= def.target;
    out.push({ ...prog, current, days, doneAt: done ? event.at : null });
    steps.push({ questId: def.id, from: prog.current, to: current, target: def.target });
    if (done) completed.push(def.id);
  }
  return { progress: out, steps, completed };
}

export type ResolvedReward =
  | { kind: 'cosmetic'; cosmeticId: string }
  | { kind: 'badge'; badgeId: string; amount: number };

/** A frame or background not yet owned, else the badge bonus. There is no points variant by construction. */
export function resolveQuestReward(reward: QuestReward, ownedCosmeticIds: ReadonlySet<string>): ResolvedReward {
  if (reward.cosmeticId !== null && !ownedCosmeticIds.has(reward.cosmeticId)) {
    return { kind: 'cosmetic', cosmeticId: reward.cosmeticId };
  }
  return { kind: 'badge', badgeId: reward.badgeId, amount: reward.badgeAmount };
}

/** True when all three daily quests are done (counts a «full day» for the unlock ladder). */
export function allDailyDone(progress: readonly QuestProgress[], at: Instant): boolean {
  const key = dayKey(at);
  return DAILY_QUESTS.every((d) => progress.some((p) => p.questId === d.id && p.windowKey === key && p.doneAt !== null));
}
