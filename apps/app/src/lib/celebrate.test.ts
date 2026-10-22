import { describe, expect, it } from 'vitest';
import type { BadgeCelebration, Celebration, LeagueCelebration, LevelCelebration, StreakCelebration, QuestReward, UnlockCelebration } from '@netprophet/db';
import { copy } from '../i18n';
import { celebrationTitleSize, celebrationView, groupView, nextGroup } from './celebrate';

const c = (streak: number, freeze: boolean, frame: string | null): StreakCelebration => ({
  id: 'c',
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'streak_milestone', streak, match_id: 'm', reward: { freeze, frame } },
});

describe('celebrationView', () => {
  it('says the prototype lines and only what was given', () => {
    expect(celebrationView(c(3, true, null), copy)).toEqual({ label: 'ΣΕΡΙ', streak: 3, tier: null, title: 'Τρία στη σειρά!', reward: 'Πάρε και μια Ασφάλεια για τις δύσκολες μέρες' });
    expect(celebrationView(c(3, false, null), copy).reward).toBe('Συνέχισε έτσι');
    expect(celebrationView(c(5, false, null), copy).title).toBe('Πέντε στη σειρά!');
    expect(celebrationView(c(7, false, 'frame_seven'), copy).reward).toBe('Κορνίζα «Επτά»');
    expect(celebrationView(c(10, false, 'frame_ten'), copy)).toMatchObject({ title: 'Το δέκα το καλό', reward: 'Κορνίζα «Δέκα»' });
    expect(celebrationView(c(10, true, 'frame_ten'), copy).reward).toBe('Ασφάλεια και κορνίζα');
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

const sc = (id: string, streak: number, reward: { freeze: boolean; frame: string | null; gear?: string | null }): StreakCelebration => ({
  id,
  created_at: '2026-10-18T08:00:00Z',
  payload: { type: 'streak_milestone', streak, match_id: `m${streak}`, reward },
});

describe('σερί milestones queued together (founder, 18 Oct: σερί 5 and σερί 3 on two screens)', () => {
  it('play as ONE moment, whatever order they came in, and all are marked seen', () => {
    const three = sc('s3', 3, { freeze: true, frame: null, gear: null });
    const five = sc('s5', 5, { freeze: false, frame: null, gear: 'gear_headband' });
    for (const list of [[five, three], [three, five]]) {
      const group = nextGroup([...list, b('b1', 'in_a_row', 1, true)]);
      expect(group.map((x) => x.id).sort()).toEqual(['s3', 's5']);
      const v = groupView(group, copy);
      expect(v.streak).toBe(5);
      expect(v.title).toBe('Πέντε στη σειρά!');
      // both gifts, only what was given
      expect(v.reward).toBe('Ασφάλεια + Κορδέλα');
    }
  });
  it('names a single gift with the milestone line, and nothing when nothing was given', () => {
    expect(groupView([sc('a', 3, { freeze: false, frame: null }), sc('b', 5, { freeze: false, frame: null, gear: 'gear_headband' })], copy).reward).toBe(
      '«Κορδέλα» για τον παίκτη σου',
    );
    expect(groupView([sc('a', 3, { freeze: false, frame: null }), sc('b', 5, { freeze: false, frame: null })], copy)).toMatchObject({ streak: 5, reward: 'Συνέχισε έτσι' });
    expect(groupView([sc('a', 5, { freeze: false, frame: null }), sc('b', 7, { freeze: false, frame: 'frame_seven' })], copy).reward).toBe('Κορνίζα «Επτά»');
    expect(groupView([sc('a', 3, { freeze: true, frame: null }), sc('b', 7, { freeze: false, frame: 'frame_seven' })], copy).reward).toBe('Ασφάλεια και κορνίζα');
    expect(groupView([sc('a', 3, { freeze: true, frame: null }), sc('b', 5, { freeze: false, frame: null, gear: 'gear_headband' }), sc('c', 7, { freeze: false, frame: 'frame_seven' })], copy)).toMatchObject({
      streak: 7,
      reward: 'Ασφάλεια + Κορδέλα + Κορνίζα «Επτά»',
    });
  });
  it('the «Στη σειρά» badge names its tier number, so it never reads as the σερί you have now', () => {
    expect(groupView([b('x', 'in_a_row', 1, true)], copy).reward).toBe('Χάλκινη Βαθμίδα · 5 σωστές ψήφοι στη σειρά');
    expect(groupView([b('x', 'in_a_row', 3, false)], copy).reward).toBe('Χρυσή Βαθμίδα · Frame Level · 10 σωστές ψήφοι στη σειρά');
    expect(groupView([b('x', 'gentleman', 1, true)], copy).reward).toBe('Χάλκινη Βαθμίδα');
  });
});

const b = (id: string, badgeKey: string, tier: 1 | 2 | 3, isNew: boolean): BadgeCelebration => ({
  id,
  created_at: '2026-10-12T10:00:00Z',
  payload: { type: 'badge', badge: badgeKey, tier, new: isNew },
});

describe('badge celebrations', () => {
  it('a new badge and a new tier say it, with the tier and no pill', () => {
    expect(groupView([b('x', 'gentleman', 1, true)], copy)).toEqual({ label: 'ΝΕΟ BADGE', streak: null, tier: 1, title: 'Ο ευγενικός', reward: 'Χάλκινη Βαθμίδα' });
    expect(groupView([b('x', 'in_a_row', 2, false)], copy)).toMatchObject({ label: 'ΝΕΑ ΒΑΘΜΙΔΑ', tier: 2, reward: 'Ασημένια Βαθμίδα · 7 σωστές ψήφοι στη σειρά' });
  });
  it('gold also names the Frame Level', () => {
    expect(groupView([b('x', 'many_votes', 3, false)], copy).reward).toBe('Χρυσή Βαθμίδα · Frame Level');
  });
  it('plays σερί, then badges one at a time, then quests', () => {
    const list = [b('b1', 'gentleman', 1, true), q('a', 'daily_kudos_1', badge), b('b2', 'upset', 1, true), c(5, false, null)];
    expect(nextGroup(list).map((x) => x.id)).toEqual(['c']);
    expect(nextGroup(list.filter((x) => x.id !== 'c')).map((x) => x.id)).toEqual(['b1']);
    expect(nextGroup(list.filter((x) => x.id === 'a')).map((x) => x.id)).toEqual(['a']);
    expect(nextGroup(list.filter((x) => x.id.startsWith('b'))).map((x) => x.id)).toEqual(['b1']);
    expect(nextGroup([])).toEqual([]);
  });
});

const u = (id: string, key: string): UnlockCelebration => ({ id, created_at: '2026-10-12T10:00:00Z', payload: { type: 'unlock', key } });

const lg = (id: string, position: number, award: boolean, movement: 'promote' | 'relegate' | 'stay' = 'promote'): LeagueCelebration => ({
  id,
  created_at: '2026-11-01T00:00:00Z',
  payload: { type: 'league', month: '2026-10', tier: 'bronze', position, movement, next_tier: 'silver', award },
});

describe('league celebrations', () => {
  it('top 3 get the Frame and badge line, no pill, no dots', () => {
    expect(groupView([lg('l', 2, true)], copy)).toEqual({ label: 'ΚΑΤΑΤΑΞΗ · ΧΑΛΚΙΝΗ', streak: null, tier: null, title: '2ος', reward: 'Frame Κορυφαίος του μήνα και badge' });
  });
  it('others hear next month\'s league', () => {
    expect(groupView([lg('l', 7, false)], copy).reward).toBe('Κατηγορία τον άλλο μήνα: Ασημένια');
  });
  it('plays after unlocks', () => {
    expect(nextGroup([lg('l', 1, true), u('u', 'level_bar')]).map((x) => x.id)).toEqual(['u']);
    expect(nextGroup([lg('l', 1, true)]).map((x) => x.id)).toEqual(['l']);
  });
});

describe('unlock celebrations', () => {
  it('says «Νέο», the title and the line by step', () => {
    expect(groupView([u('u', 'level_bar')], copy)).toEqual({ label: 'ΝΕΟ', streak: null, tier: null, title: 'Το level σου', reward: 'Κάθε σωστή ψήφος σε ανεβάζει. Δες το στο Εγώ.' });
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

describe('level celebrations', () => {
  const lv = (id: string, level: number): LevelCelebration => ({ id, created_at: '2026-10-14T10:00:00Z', payload: { type: 'level', level } });
  it('says the new level in the pill, with no «σερί» beside it', () => {
    expect(groupView([lv('l', 4)], copy)).toEqual({ label: 'LEVEL', streak: 4, unit: '', tier: null, title: 'Ανέβηκες level!', reward: 'Συνέχισε τις σωστές προβλέψεις' });
  });
  it('plays first, before the σερί moment, badges and quests', () => {
    const list = [b('b1', 'gentleman', 1, true), q('a', 'daily_kudos_1', badge), lv('l', 3), c(5, false, null)];
    expect(nextGroup(list).map((x) => x.id)).toEqual(['l']);
    expect(nextGroup(list.filter((x) => x.id !== 'l')).map((x) => x.id)).toEqual(['c']);
  });
});

describe('«Νέο ρεκόρ» (founder, 22 Oct: celebrate beating your best, once a run)', () => {
  const rec = (streak: number, id = 'r'): Celebration => ({
    id,
    created_at: '2026-10-22T05:01:00Z',
    payload: { type: 'streak_record', streak, match_id: 'm' },
  });

  it('a record alone: its own moment, the new σερί in the pill and the record it beat', () => {
    expect(groupView(nextGroup([rec(12)]), copy)).toEqual({ label: 'ΣΕΡΙ', streak: 12, tier: null, title: 'Νέο ρεκόρ!', reward: 'Πέρασες το 11. Πάμε για παραπάνω!' });
  });

  it('plays with the σερί group, before badges', () => {
    expect(nextGroup([b('b1', 'gentleman', 1, true), rec(9)]).map((x) => x.id)).toEqual(['r']);
  });

  it('with a milestone in the same batch, the milestone wins', () => {
    expect(groupView(nextGroup([rec(9), c(10, false, 'frame_ten')]), copy)).toMatchObject({ streak: 10, title: 'Το δέκα το καλό' });
  });
});
