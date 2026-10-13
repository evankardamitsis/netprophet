import { describe, expect, it } from 'vitest';
import type { Celebration, StreakCelebration, QuestReward } from '@netprophet/db';
import { copy } from '../i18n';
import { celebrationView, groupView, nextGroup } from './celebrate';

const c = (streak: number, freeze: boolean, frame: string | null): StreakCelebration => ({
  id: 'c',
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'streak_milestone', streak, match_id: 'm', reward: { freeze, frame } },
});

describe('celebrationView', () => {
  it('says the prototype lines and only what was given', () => {
    expect(celebrationView(c(3, true, null), copy)).toEqual({ label: 'ΣΕΡΙ', streak: 3, title: 'Τρία στη σειρά!', reward: 'Πάρε κι ένα πάγωμα για τις δύσκολες μέρες' });
    expect(celebrationView(c(3, false, null), copy).reward).toBe('Συνέχισε έτσι');
    expect(celebrationView(c(5, false, null), copy).title).toBe('Πέντε στη σειρά!');
    expect(celebrationView(c(7, false, 'frame_seven'), copy).reward).toBe('Κορνίζα «Επτά»');
    expect(celebrationView(c(10, false, 'frame_ten'), copy)).toMatchObject({ title: 'Το δέκα το καλό', reward: 'Κορνίζα «Δέκα»' });
    expect(celebrationView(c(10, true, 'frame_ten'), copy).reward).toBe('Πάγωμα και κορνίζα');
  });
});

const q = (id: string, quest: string, reward: QuestReward): Celebration => ({
  id,
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'quest', quest, period: '2026-10-12', reward },
});
const badge: QuestReward = { kind: 'badge', key: 'many_votes', amount: 5 };
const frame: QuestReward = { kind: 'cosmetic', key: 'frame_week', category: 'frame' };

describe('quest celebrations', () => {
  it('one quest: its title and reward, no pill', () => {
    expect(groupView([q('a', 'daily_vote_3_cards', badge)], copy)).toEqual({
      label: 'ΑΠΟΣΤΟΛΗ ✓',
      streak: null,
      title: 'Ψήφισε 3 κάρτες',
      reward: '+5 στο badge Πολλά τα ψηφαλάκια',
    });
  });
  it('several quests become one celebration', () => {
    const v = groupView([q('a', 'daily_vote_3_cards', badge), q('b', 'weekly_log_2_matches', frame)], copy);
    expect(v).toMatchObject({ label: 'ΑΠΟΣΤΟΛΕΣ ✓', title: '2 αποστολές', reward: '+5 στο badge Πολλά τα ψηφαλάκια · Frame Της εβδομάδας' });
  });
  it('plays a σερί first, then all quests together', () => {
    const list = [q('a', 'daily_kudos_1', badge), c(5, false, null), q('b', 'daily_vote_3_cards', badge)];
    expect(nextGroup(list).map((x) => x.id)).toEqual(['c']);
    expect(nextGroup(list.filter((x) => x.id !== 'c')).map((x) => x.id)).toEqual(['a', 'b']);
    expect(groupView(nextGroup([c(3, true, null)]), copy).streak).toBe(3);
  });
});
