import type { Copy } from '@netprophet/copy';
import type { QuestReward, QuestRow } from '@netprophet/db';
import { badgeBarFeedback, badgeName, type BadgeSnapshot, type Gender } from './badges';
import { fmt } from './votes';

/** the cosmetic or badge a reward points at, by its name */
function rewardName(r: QuestReward, t: Copy, gender?: Gender): string {
  return r.kind === 'badge' ? badgeName(r.key, t, gender) : (t.quests.cosmetics[r.key] ?? r.key);
}

/** «Frame Της εβδομάδας», «Φόντο Γρασίδι», «+5 στο badge Πολλά τα ψηφαλάκια» (celebration and toast) */
export function rewardLine(r: QuestReward, t: Copy, gender?: Gender): string {
  const name = rewardName(r, t, gender);
  if (r.kind === 'badge') return fmt(t.quests.rewardBadge, { n: r.amount, name });
  return fmt(r.category === 'frame' ? t.quests.rewardFrame : t.quests.rewardBackground, { name });
}

/** the chip on a quest row: what kind of reward, the badge's name, or «Το κέρδισες» once done */
export function chipText(q: QuestRow, t: Copy, gender?: Gender): string {
  if (q.done) return t.quests.got;
  if (q.reward.kind === 'badge') return rewardName(q.reward, t, gender);
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

export function toastLine(r: QuestReward, t: Copy, gender?: Gender): string {
  return fmt(t.quests.toast, { reward: rewardLine(r, t, gender) });
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
  gender?: Gender,
): QuestFeedback {
  const was = new Map([...(before?.daily ?? []), ...(before?.weekly ?? [])].map((q) => [q.key, q]));
  const moved = [...after.daily, ...after.weekly].filter((q) => q.progress > (was.get(q.key)?.progress ?? 0));
  const finished = moved.find((q) => q.done && !was.get(q.key)?.done);
  if (finished) return { kind: 'toast', text: toastLine(finished.reward, t, gender) };
  const q = moved.find((x) => !x.done);
  if (!q) return badges ? badgeBarFeedback(badges.before, badges.after, t, gender) : null;
  return { kind: 'bar', title: questTitle(q.key, t), from: fraction(was.get(q.key) ?? { progress: 0, target: q.target }), to: fraction(q), progress: q.progress, target: q.target };
}

/** the lines for several rewards: the same badge sums into one line (5 + 3 is «+8 …»), a repeated cosmetic shows once */
export function rewardLines(rewards: QuestReward[], t: Copy, gender?: Gender): string[] {
  const merged: QuestReward[] = [];
  for (const r of rewards) {
    const same = merged.findIndex((m) => m.kind === r.kind && m.key === r.key);
    const m = merged[same];
    if (m && m.kind === 'badge' && r.kind === 'badge') merged[same] = { ...m, amount: m.amount + r.amount };
    else if (same < 0) merged.push(r);
  }
  return merged.map((r) => rewardLine(r, t, gender));
}

/** the quest celebrations queued together, as one: label, title, reward lines joined */
export function questCelebrationView(rewards: { quest: string; reward: QuestReward }[], t: Copy, gender?: Gender): { label: string; title: string; reward: string } {
  const one = rewards.length === 1;
  return {
    label: one ? t.quests.celebrationOne : t.quests.celebrationMany,
    title: one ? questTitle(rewards[0]!.quest, t) : fmt(t.quests.titleMany, { n: rewards.length }),
    reward: rewardLines(rewards.map((r) => r.reward), t, gender).join(' · '),
  };
}
