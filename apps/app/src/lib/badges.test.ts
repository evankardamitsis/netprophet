import { describe, expect, it } from 'vitest';
import type { BadgeRow } from '@netprophet/db';
import { colors } from '@netprophet/tokens';
import { copy } from '../i18n';
import { mockBadges } from '../mock/badges';
import { badgeBarFeedback, earned, leftLine, left, locked, nextBadge, pct, pickSelected, ruleLine, tierOfLine, tierStyle, tileTierLine } from './badges';
import { feedbackAfterVote } from './quests';
import { mockQuests } from '../mock/quests';

const rows = mockBadges().badges;
const get = (key: string) => rows.find((b) => b.key === key)!;
const row = (counter: number, tier: 0 | 1 | 2 | 3, thresholds: [number, number, number] = [5, 25, 100]): BadgeRow => ({ key: 'club_oracle', counter, tier, thresholds, on_card: false });

describe('badge progress', () => {
  it('left and pct work within the current tier', () => {
    expect(left(row(0, 0))).toBe(5);
    expect(pct(row(0, 0))).toBe(0);
    expect(left(row(21, 1))).toBe(4);
    expect(pct(row(15, 1))).toBe(0.5);
    expect(left(row(100, 3))).toBe(0);
    expect(pct(row(250, 3))).toBe(1);
  });
  it('pct stays within 0 and 1', () => {
    expect(pct(row(2, 1))).toBe(0);
    expect(pct(row(40, 1))).toBe(1);
  });
});

describe('badge lists', () => {
  it('earned is tier above 0, highest first, stable', () => {
    const keys = earned(rows).map((b) => b.key);
    expect(keys).toEqual(['first_serve', 'nice_player', 'in_a_row', 'doubles_player', 'many_votes', 'gentleman', 'beloved', 'club_oracle', 'upset', 'whole_week', 'variety']);
    expect(locked(rows).map((b) => b.key)).toEqual(['influencer', 'steady', 'generous', 'season_veteran', 'month_top']);
  });
  it('the next badge is the one with the smallest share left', () => {
    expect(nextBadge(rows)?.key).toBe('club_oracle');
    expect(nextBadge([row(100, 3)])).toBeNull();
  });
  it('selects the asked-for badge, else the first earned, else the first', () => {
    expect(pickSelected(rows, 'steady')?.key).toBe('steady');
    expect(pickSelected(rows, undefined)?.key).toBe('first_serve');
    expect(pickSelected(rows, 'nope')?.key).toBe('first_serve');
    expect(pickSelected(rows.map((b) => ({ ...b, tier: 0 as const })), undefined)?.key).toBe('first_serve');
    expect(pickSelected([], undefined)).toBeNull();
  });
});

describe('tier styles', () => {
  it('follow the prototype', () => {
    expect(tierStyle(0)).toMatchObject({ bg: 'transparent', text: colors.inkSoft, borderWidth: 2, dashed: true, dot: colors.muted });
    expect(tierStyle(1)).toMatchObject({ bg: colors.white, border: colors.ink, borderWidth: 3, dot: colors.ink });
    expect(tierStyle(2)).toMatchObject({ bg: colors.silver, border: colors.muted, dot: colors.muted });
    expect(tierStyle(3)).toMatchObject({ bg: colors.lime, border: colors.ink });
  });
});

describe('badge lines', () => {
  it('rule, tier and left lines', () => {
    expect(ruleLine(get('club_oracle'), copy)).toBe('5 / 25 / 100 σωστές ψήφοι στο Ψήφισε');
    expect(tierOfLine(get('in_a_row'), copy)).toBe('Ασημένιο · βαθμίδα 2 από 3');
    expect(tierOfLine(get('steady'), copy)).toBe('Κλειδωμένο');
    expect(tileTierLine(get('gentleman'), copy)).toBe('Χάλκινο\u00A0· ακόμα\u00A08');
    expect(tileTierLine(row(100, 3), copy)).toBe('Χρυσό');
    expect(leftLine(get('gentleman'), copy)).toBe('Ακόμα 8 για το ασημένιο');
    expect(leftLine(get('steady'), copy)).toBe('Ακόμα 1 για το χάλκινο');
    expect(leftLine(row(100, 3), copy)).toBe('Χρυσό. Τα έχεις όλα.');
  });
});

describe('badgeBarFeedback', () => {
  const snap = (counter: number, tier: 0 | 1 | 2 | 3 = 2) => ({ badges: [{ ...get('in_a_row'), counter, tier }] });
  it('shows the bar when a counter rose to exactly one short of the next tier', () => {
    const f = badgeBarFeedback(snap(8), snap(9), copy);
    expect(f).toMatchObject({ kind: 'bar', title: 'Ένα ακόμα για το badge Στη σειρά', progress: 9, target: 10 });
    expect(f?.from).toBeCloseTo(1 / 3, 2);
    expect(f?.to).toBeCloseTo(2 / 3, 2);
  });
  it('stays quiet when nothing moved, it is not one short, or it is gold', () => {
    expect(badgeBarFeedback(snap(9), snap(9), copy)).toBeNull();
    expect(badgeBarFeedback(snap(7), snap(8), copy)).toBeNull();
    expect(badgeBarFeedback(snap(10, 3), snap(11, 3), copy)).toBeNull();
    expect(badgeBarFeedback(null, null, copy)).toBeNull();
  });
  it('a quest bar or toast wins over the badge bar', () => {
    const quests = mockQuests();
    const moved = { daily: quests.daily.map((q, i) => (i === 0 ? { ...q, progress: q.progress + 1 } : q)), weekly: quests.weekly };
    const f = feedbackAfterVote(quests, moved, copy, { before: snap(8), after: snap(9) });
    expect(f).toMatchObject({ kind: 'bar', title: 'Ψήφισε 3 κάρτες' });
  });
  it('with no quest moving, the badge bar shows', () => {
    const quests = mockQuests();
    const f = feedbackAfterVote(quests, quests, copy, { before: snap(8), after: snap(9) });
    expect(f).toMatchObject({ kind: 'bar', title: 'Ένα ακόμα για το badge Στη σειρά' });
  });
});
