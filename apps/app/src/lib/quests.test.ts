import { describe, expect, it } from 'vitest';
import type { QuestRow } from '@netprophet/db';
import { copy } from '../i18n';
import { mockQuests } from '../mock/quests';
import { chipText, doneLine, feedbackAfterVote, fraction, rewardLine, toastLine } from './quests';

const [votes, kudos, matches] = mockQuests().daily as [QuestRow, QuestRow, QuestRow];
const [log] = mockQuests().weekly as [QuestRow, QuestRow];

describe('quests copy helpers', () => {
  it('names the reward the prototype way', () => {
    expect(rewardLine(votes.reward, copy)).toBe('+5 στο badge Πολλά τα ψηφαλάκια');
    expect(rewardLine(matches.reward, copy)).toBe('Φόντο Βραδινό ματς');
    expect(rewardLine(log.reward, copy)).toBe('Frame Της εβδομάδας');
    expect(toastLine(kudos.reward, copy)).toBe('Αποστολή ✓ · +1 στο badge Ο ευγενικός');
  });
  it('chips: kind of reward, badge name, or done', () => {
    expect(chipText(votes, copy)).toBe('Πολλά τα ψηφαλάκια');
    expect(chipText(matches, copy)).toBe('Φόντο');
    expect(chipText(log, copy)).toBe('Frame');
    expect(chipText({ ...votes, done: true }, copy)).toBe('Το κέρδισες');
  });
  it('done line', () => {
    expect(doneLine(0, copy)).toBe('');
    expect(doneLine(1, copy)).toBe('✓ 1 έγινε');
    expect(doneLine(2, copy)).toBe('✓ 2 έγιναν');
  });
  it('bar fraction stays within 0 and 1', () => {
    expect(fraction({ progress: 2, target: 3 })).toBeCloseTo(0.667, 2);
    expect(fraction({ progress: 5, target: 3 })).toBe(1);
  });
});

describe('feedbackAfterVote', () => {
  const before = mockQuests();
  const bump = (key: string, progress: number, done = false) => {
    const m = mockQuests();
    return { daily: m.daily.map((q) => (q.key === key ? { ...q, progress, done } : q)), weekly: m.weekly };
  };
  it('shows the bar for the first quest that moved but is not done', () => {
    expect(feedbackAfterVote(before, mockQuests(), copy)).toBeNull();
    const g = feedbackAfterVote(bump('daily_vote_3_cards', 1), bump('daily_vote_3_cards', 2), copy);
    expect(g).toMatchObject({ kind: 'bar', title: 'Ψήφισε 3 κάρτες', progress: 2, target: 3 });
  });
  it('a finished quest gives a toast, never the bar too', () => {
    const f = feedbackAfterVote(before, bump('daily_vote_3_cards', 3, true), copy);
    expect(f).toEqual({ kind: 'toast', text: 'Αποστολή ✓ · +5 στο badge Πολλά τα ψηφαλάκια' });
  });
});
