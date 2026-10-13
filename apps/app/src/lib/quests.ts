import type { Copy } from '@netprophet/copy';
import type { QuestReward, QuestRow } from '@netprophet/db';
import { badgeBarFeedback, type BadgeSnapshot } from './badges';
import { fmt } from './votes';

/** the cosmetic or badge a reward points at, by its name */
function rewardName(r: QuestReward, t: Copy): string {
  const names = r.kind === 'badge' ? t.badges.names : t.quests.cosmetics;
  return names[r.key] ?? r.key;
}

/** «Frame Της εβδομάδας», «Φόντο Γρασίδι», «+5 στο badge Πολλά τα ψηφαλάκια» (celebration and toast) */
export function rewardLine(r: QuestReward, t: Copy): string {
  const name = rewardName(r, t);
  if (r.kind === 'badge') return fmt(t.quests.rewardBadge, { n: r.amount, name });
  return fmt(r.category === 'frame' ? t.quests.rewardFrame : t.quests.rewardBackground, { name });
}

/** the chip on a quest row: what kind of reward, the badge's name, or «Το κέρδισες» once done */
export function chipText(q: QuestRow, t: Copy): string {
  if (q.done) return t.quests.got;
  if (q.reward.kind === 'badge') return rewardName(q.reward, t);
  return q.reward.category === 'frame' ? t.quests.frame : t.quests.background;
}

export function questTitle(key: string, t: Copy): string {
  return t.quests.titles[key] ?? key;
}

/** «✓ 1 έγινε», «✓ 2 έγιναν»; empty when none are done */
export function doneLine(n: number, t: Copy): string {
  if (n <= 0) return '';
  return n === 1 ? t.quests.doneOne : fmt(t.quests.doneMany, { n });
}

export function toastLine(r: QuestReward, t: Copy): string {
  return fmt(t.quests.toast, { reward: rewardLine(r, t) });
}

/** the bar's fill, 0 to 1 */
export function fraction(q: Pick<QuestRow, 'progress' | 'target'>): number {
  return q.target > 0 ? Math.min(1, Math.max(0, q.progress / q.target)) : 0;
}

export type QuestFeedback = { kind: 'bar'; title: string; from: number; to: number; progress: number; target: number } | { kind: 'toast'; text: string } | null;
export type { BadgeSnapshot };

/**
 * What to show after a vote (prototype): a finished quest wins and gives a toast; otherwise the first quest
 * (daily before weekly) whose progress went up shows the slim bar; failing that, a badge one vote short of its next
 * tier shows the same bar («Ένα ακόμα για το badge …»). Never more than one.
 */
export function feedbackAfterVote(
  before: { daily: QuestRow[]; weekly: QuestRow[] } | null,
  after: { daily: QuestRow[]; weekly: QuestRow[] },
  t: Copy,
  badges?: { before: BadgeSnapshot | null; after: BadgeSnapshot | null },
): QuestFeedback {
  const was = new Map([...(before?.daily ?? []), ...(before?.weekly ?? [])].map((q) => [q.key, q]));
  const moved = [...after.daily, ...after.weekly].filter((q) => q.progress > (was.get(q.key)?.progress ?? 0));
  const finished = moved.find((q) => q.done && !was.get(q.key)?.done);
  if (finished) return { kind: 'toast', text: toastLine(finished.reward, t) };
  const q = moved.find((x) => !x.done);
  if (!q) return badges ? badgeBarFeedback(badges.before, badges.after, t) : null;
  return { kind: 'bar', title: questTitle(q.key, t), from: fraction(was.get(q.key) ?? { progress: 0, target: q.target }), to: fraction(q), progress: q.progress, target: q.target };
}

/** the quest celebrations queued together, as one: label, title, reward lines joined */
export function questCelebrationView(rewards: { quest: string; reward: QuestReward }[], t: Copy): { label: string; title: string; reward: string } {
  const one = rewards.length === 1;
  return {
    label: one ? t.quests.celebrationOne : t.quests.celebrationMany,
    title: one ? questTitle(rewards[0]!.quest, t) : fmt(t.quests.titleMany, { n: rewards.length }),
    reward: rewards.map((r) => rewardLine(r.reward, t)).join(' · '),
  };
}
