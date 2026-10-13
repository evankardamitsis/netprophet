import { describe, expect, it } from 'vitest';
import type { BadgeCelebration, Celebration, StreakCelebration, QuestReward, UnlockCelebration } from '@netprophet/db';
import { copy } from '../i18n';
import { celebrationTitleSize, celebrationView, groupView, nextGroup } from './celebrate';

const c = (streak: number, freeze: boolean, frame: string | null): StreakCelebration => ({
  id: 'c',
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'streak_milestone', streak, match_id: 'm', reward: { freeze, frame } },
});

describe('celebrationView', () => {
  it('says the prototype lines and only what was given', () => {
    expect(celebrationView(c(3, true, null), copy)).toEqual({ label: 'ΣΕΡΙ', streak: 3, tier: null, title: 'Τρία στη σειρά!', reward: 'Πάρε κι ένα πάγωμα για τις δύσκολες μέρες' });
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
      tier: null,
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

const b = (id: string, badgeKey: string, tier: 1 | 2 | 3, isNew: boolean): BadgeCelebration => ({
  id,
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'badge', badge: badgeKey, tier, new: isNew },
});

describe('badge celebrations', () => {
  it('a new badge and a new tier say it, with the tier and no pill', () => {
    expect(groupView([b('x', 'gentleman', 1, true)], copy)).toEqual({ label: 'ΝΕΟ BADGE', streak: null, tier: 1, title: 'Ο ευγενικός', reward: 'Βαθμίδα Χάλκινο' });
    expect(groupView([b('x', 'in_a_row', 2, false)], copy)).toMatchObject({ label: 'ΝΕΑ ΒΑΘΜΙΔΑ', tier: 2, reward: 'Βαθμίδα Ασημένιο' });
  });
  it('gold also names the Frame Level', () => {
    expect(groupView([b('x', 'many_votes', 3, false)], copy).reward).toBe('Βαθμίδα Χρυσό · Frame Level');
  });
  it('plays σερί, then quests, then badges one at a time', () => {
    const list = [b('b1', 'gentleman', 1, true), q('a', 'daily_kudos_1', badge), b('b2', 'upset', 1, true), c(5, false, null)];
    expect(nextGroup(list).map((x) => x.id)).toEqual(['c']);
    expect(nextGroup(list.filter((x) => x.id !== 'c')).map((x) => x.id)).toEqual(['a']);
    expect(nextGroup(list.filter((x) => x.id.startsWith('b'))).map((x) => x.id)).toEqual(['b1']);
    expect(nextGroup([])).toEqual([]);
  });
});

const u = (id: string, key: string): UnlockCelebration => ({ id, created_at: '2026-10-12T10:00:00Z', payload: { type: 'unlock', key } });

describe('unlock celebrations', () => {
  it('says «Νέο», the title and the line by step', () => {
    expect(groupView([u('u', 'level_bar')], copy)).toEqual({ label: 'ΝΕΟ', streak: null, tier: null, title: 'Ανέβηκες level!', reward: '' });
    expect(groupView([u('u', 'daily_quests')], copy)).toMatchObject({ title: 'Νέο: Αποστολές', reward: 'Τρεις μικρές για σήμερα' });
    expect(groupView([u('u', 'ladder_friends')], copy)).toMatchObject({ title: 'Μπήκες στην Κατάταξη!', reward: 'Φέρε έναν φίλο να σε κυνηγάει' });
    expect(groupView([u('u', 'stats_area')], copy).title).toBe('Τώρα βλέπεις τα στατιστικά σου και όλη την Αττική');
  });
  it('plays after σερί, quests and badges, one at a time; quiet steps never play', () => {
    const list = [u('u1', 'level_bar'), u('u2', 'first_freeze'), b('b1', 'gentleman', 1, true), u('u3', 'daily_quests')];
    expect(nextGroup(list).map((x) => x.id)).toEqual(['b1']);
    expect(nextGroup(list.filter((x) => x.id !== 'b1')).map((x) => x.id)).toEqual(['u1']);
    expect(nextGroup([u('u2', 'first_freeze'), u('u4', 'gifts')])).toEqual([]);
  });
  it('shrinks long titles', () => {
    expect(celebrationTitleSize('Ανέβηκες level!')).toBe(54);
    expect(celebrationTitleSize('Τώρα βλέπεις τα στατιστικά σου και όλη την Αττική')).toBe(40);
  });
});
