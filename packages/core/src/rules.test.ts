import { describe, expect, it } from 'vitest';
import {
  ALL_QUESTS,
  BADGES,
  DAILY_QUESTS,
  LEAGUE_NAMES_EL,
  PRO_FEATURES,
  UNLOCK_STEPS,
  allDailyDone,
  applyBadgeCounter,
  applyQuestEvent,
  assignGroups,
  canSee,
  closeGroup,
  closeMonth,
  initialActivity,
  isPro,
  isValidMatchTiebreak,
  isValidTennisSet,
  pointsToNextPosition,
  quizCardsPerDay,
  quizRefId,
  rank,
  recordActivity,
  resolveQuestReward,
  scoped,
  tierFor,
  toPointsEvents,
  validateResult,
  validateTennisScore,
  type Entitlement,
  type LeaderboardEntry,
  type League,
  type ProFeature,
} from './index';

describe('tennis adapter', () => {
  it('accepts valid set scores', () => {
    for (const [a, b] of [[6, 0], [6, 4], [7, 5], [7, 6], [4, 6], [6, 7]] as const) {
      expect(isValidTennisSet(a, b)).toBe(true);
    }
  });
  it('rejects impossible set scores', () => {
    for (const [a, b] of [[6, 5], [7, 7], [8, 6], [5, 5], [6, 6], [7, 4], [-1, 6], [6.5, 4]] as const) {
      expect(isValidTennisSet(a, b)).toBe(false);
    }
  });
  it('match tiebreak: first to 10 by 2', () => {
    expect(isValidMatchTiebreak(10, 8)).toBe(true);
    expect(isValidMatchTiebreak(12, 10)).toBe(true);
    expect(isValidMatchTiebreak(10, 9)).toBe(false);
    expect(isValidMatchTiebreak(13, 10)).toBe(false);
    expect(isValidMatchTiebreak(9, 7)).toBe(false);
  });
  it('accepts 2-0 and 2-1 with coherent sets, winner first', () => {
    expect(validateTennisScore({ totals: [2, 0], periods: [[6, 4], [6, 3]] })).toEqual({ ok: true });
    expect(validateTennisScore({ totals: [2, 1], periods: [[6, 4], [6, 7], [7, 5]] })).toEqual({ ok: true });
    expect(validateTennisScore({ totals: [2, 1], periods: [[6, 4], [3, 6], [10, 7]] })).toEqual({ ok: true });
    expect(validateTennisScore({ totals: [2, 0] })).toEqual({ ok: true });
  });
  it('rejects incoherent totals and sets', () => {
    expect(validateTennisScore({ totals: [3, 0] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [2, 2] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [1, 2] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [2, 0], periods: [[6, 4], [6, 3], [6, 1]] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [2, 1], periods: [[6, 4], [6, 3]] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [2, 0], periods: [[6, 4], [3, 6]] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [2, 1], periods: [[6, 4], [6, 3], [3, 6]] }).ok).toBe(false);
    expect(validateTennisScore({ totals: [2, 0], periods: [[6, 4], [6, 5]] }).ok).toBe(false);
  });
  it('a super tiebreak is only valid as the deciding set', () => {
    expect(validateTennisScore({ totals: [2, 0], periods: [[10, 5], [6, 3]] }).ok).toBe(false);
  });
  it('validateResult routes by sport and falls back for unknown sports', () => {
    expect(validateResult('tennis', { winnerSide: 0, score: { totals: [2, 0] } })).toEqual({ ok: true });
    expect(validateResult('tennis', { winnerSide: 0, score: { totals: [2, 2] } }).ok).toBe(false);
    expect(validateResult('padel', { winnerSide: 1, score: { totals: [3, 1] } })).toEqual({ ok: true });
    expect(validateResult('padel', { winnerSide: 1, score: { totals: [1, 3] } }).ok).toBe(false);
    expect(validateResult('tennis', { winnerSide: 0, score: null })).toEqual({ ok: true });
  });
});

describe('points events', () => {
  it('keys are idempotent and the month is the Athens month of the instant', () => {
    const ev = toPointsEvents({
      userId: 'u1',
      at: '2026-10-31T22:00:00Z',
      refId: 'vote:v1',
      parts: [{ reason: 'vote_correct', delta: 10 }, { reason: 'chain_bonus', delta: 5 }],
    });
    expect(ev.map((e) => e.key)).toEqual(['vote:v1:vote_correct', 'vote:v1:chain_bonus']);
    expect(ev.every((e) => e.monthKey === '2026-11')).toBe(true);
  });
  it('quiz ref changes at 09:00 Athens', () => {
    expect(quizRefId('u1', '2026-10-09T05:59:59Z')).toBe('quiz:u1:2026-10-08');
    expect(quizRefId('u1', '2026-10-09T06:00:00Z')).toBe('quiz:u1:2026-10-09');
  });
});

describe('quests', () => {
  it('rewards never carry points', () => {
    for (const q of ALL_QUESTS) {
      expect(Object.keys(q.reward).sort()).toEqual(['badgeAmount', 'badgeId', 'cosmeticId']);
    }
  });
  it('catalogue matches the spec', () => {
    expect(DAILY_QUESTS).toHaveLength(3);
    expect(ALL_QUESTS.filter((q) => q.window === 'weekly')).toHaveLength(2);
  });
  it('reward is the cosmetic if not owned, else the badge bonus', () => {
    const r = { cosmeticId: 'frame.x', badgeId: 'b', badgeAmount: 2 };
    expect(resolveQuestReward(r, new Set())).toEqual({ kind: 'cosmetic', cosmeticId: 'frame.x' });
    expect(resolveQuestReward(r, new Set(['frame.x']))).toEqual({ kind: 'badge', badgeId: 'b', amount: 2 });
    expect(resolveQuestReward({ ...r, cosmeticId: null }, new Set())).toEqual({ kind: 'badge', badgeId: 'b', amount: 2 });
  });
  it('one event can advance several quests', () => {
    const res = applyQuestEvent(DAILY_QUESTS, [], { type: 'vote_card', at: '2026-10-09T10:00:00Z' });
    expect(res.steps.map((s) => s.questId)).toEqual(['daily_vote_3_cards']);
  });
  it('allDailyDone requires all three in today s window', () => {
    const at = '2026-10-09T10:00:00Z';
    let progress = applyQuestEvent(DAILY_QUESTS, [], { type: 'kudos_given', at }).progress;
    expect(allDailyDone(progress, at)).toBe(false);
    for (const t of ['vote_card', 'vote_card', 'vote_card', 'vote_match', 'vote_match'] as const) {
      progress = applyQuestEvent(DAILY_QUESTS, progress, { type: t, at }).progress;
    }
    expect(allDailyDone(progress, at)).toBe(true);
    expect(allDailyDone(progress, '2026-10-09T21:00:00Z')).toBe(false);
  });
});

describe('badges and the progress-bar rule', () => {
  const first = BADGES[0]!;
  it('has the 16 badges from the spec with 3 increasing thresholds', () => {
    expect(BADGES).toHaveLength(16);
    for (const b of BADGES) expect(b.thresholds[0] < b.thresholds[1] && b.thresholds[1] < b.thresholds[2]).toBe(true);
  });
  it('tiers', () => {
    const miste = BADGES.find((b) => b.id === 'manths-tou-klab')!;
    expect([0, 4, 5, 24, 25, 99, 100].map((n) => tierFor(miste, n))).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
  it('shows the bar only when exactly one step from the next tier', () => {
    const b = BADGES.find((x) => x.id === 'manths-tou-klab')!; // 5 / 25 / 100
    expect(applyBadgeCounter(b, 2, 3).showProgressBar).toBe(false);
    expect(applyBadgeCounter(b, 3, 4).showProgressBar).toBe(true);
    expect(applyBadgeCounter(b, 4, 5)).toMatchObject({ tierUp: true, showProgressBar: false, remaining: 20 });
    expect(applyBadgeCounter(b, 98, 99).showProgressBar).toBe(true);
    expect(applyBadgeCounter(b, 99, 100)).toMatchObject({ tierUp: true, grantsFrameLevel: true, remaining: null });
    expect(applyBadgeCounter(b, 100, 100).showProgressBar).toBe(false);
    expect(first.unit).toBe('matches_logged');
  });
});

describe('activity', () => {
  it('3 cards make an active day, once', () => {
    let s = initialActivity();
    const flags: boolean[] = [];
    for (const t of ['10:00', '10:01', '10:02', '10:03']) {
      const r = recordActivity(s, 'vote_card', `2026-10-09T${t}:00Z`);
      s = r.state;
      flags.push(r.becameActiveDay);
    }
    expect(flags).toEqual([false, false, true, false]);
    expect(s.activeDays).toBe(1);
  });
  it('a logged match alone is an active day', () => {
    expect(recordActivity(initialActivity(), 'match_logged', '2026-10-09T10:00:00Z').becameActiveDay).toBe(true);
  });
  it('the day rolls over at 00:00 Athens', () => {
    let s = recordActivity(initialActivity(), 'match_logged', '2026-10-09T20:59:59Z').state;
    const r = recordActivity(s, 'match_logged', '2026-10-09T21:00:00Z');
    s = r.state;
    expect(r.becameActiveDay).toBe(true);
    expect(s.activeDays).toBe(2);
  });
  it('late events from an older day are ignored', () => {
    const s = recordActivity(initialActivity(), 'match_logged', '2026-10-10T10:00:00Z').state;
    const r = recordActivity(s, 'match_logged', '2026-10-09T10:00:00Z');
    expect(r.becameActiveDay).toBe(false);
    expect(r.state).toEqual(s);
  });
});

describe('unlock table', () => {
  it('has 13 steps and each has a vote-count backup', () => {
    expect(UNLOCK_STEPS).toHaveLength(13);
    expect(UNLOCK_STEPS.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(UNLOCK_STEPS.slice(1).every((s) => s.backupVotes > 0)).toBe(true);
  });
  it('nothing depends on streak 10 or more', () => {
    for (const s of UNLOCK_STEPS) for (const c of s.primary) if (c.counter === 'bestStreak') expect(c.min).toBeLessThan(10);
  });
});

describe('leaderboard', () => {
  const mk = (i: number, points: number, league: League = 'silver', groupId = 'g1', area: string | null = 'north', lastPointAt: string | null = `2026-10-0${(i % 9) + 1}T10:00:00Z`): LeaderboardEntry => ({
    userId: `u${String(i).padStart(2, '0')}`,
    points,
    lastPointAt,
    league,
    groupId,
    area,
  });
  const group = (league: League, groupId = 'g1') => Array.from({ length: 20 }, (_, i) => mk(i + 1, 200 - i * 10, league, groupId));

  it('ranks by points, then earliest, then id', () => {
    const r = rank([
      mk(1, 50, 'silver', 'g', null, '2026-10-03T10:00:00Z'),
      mk(2, 50, 'silver', 'g', null, '2026-10-02T10:00:00Z'),
      mk(3, 50, 'silver', 'g', null, '2026-10-02T10:00:00Z'),
      mk(4, 60, 'silver', 'g', null, '2026-10-09T10:00:00Z'),
      mk(5, 0, 'silver', 'g', null, null),
    ]);
    expect(r.map((e) => e.userId)).toEqual(['u04', 'u02', 'u03', 'u01', 'u05']);
    expect(r.map((e) => e.position)).toEqual([1, 2, 3, 4, 5]);
  });
  it('top 5 promote, 16 to 20 relegate, middle stays (silver)', () => {
    const res = closeGroup(group('silver'));
    expect(res.filter((r) => r.movement === 'promote').map((r) => r.position)).toEqual([1, 2, 3, 4, 5]);
    expect(res.filter((r) => r.movement === 'relegate').map((r) => r.position)).toEqual([16, 17, 18, 19, 20]);
    expect(res.filter((r) => r.movement === 'stay')).toHaveLength(10);
    expect(res[0]?.nextLeague).toBe('gold');
    expect(res[19]?.nextLeague).toBe('bronze');
  });
  it('gold does not promote, bronze does not relegate', () => {
    const gold = closeGroup(group('gold'));
    expect(gold.some((r) => r.movement === 'promote')).toBe(false);
    expect(gold.filter((r) => r.movement === 'relegate')).toHaveLength(5);
    const bronze = closeGroup(group('bronze'));
    expect(bronze.some((r) => r.movement === 'relegate')).toBe(false);
    expect(bronze.filter((r) => r.movement === 'promote')).toHaveLength(5);
    expect(bronze.filter((r) => r.movement === 'promote').every((r) => r.nextLeague === 'silver')).toBe(true);
  });
  it('top 3 get the award; zero points get nothing and never promote', () => {
    const res = closeGroup(group('silver').map((e) => ({ ...e, points: 0 })));
    expect(res.some((r) => r.topThreeAward || r.movement === 'promote')).toBe(false);
    const ok = closeGroup(group('silver'));
    expect(ok.filter((r) => r.topThreeAward).map((r) => r.position)).toEqual([1, 2, 3]);
  });
  it('small groups: nobody below position 16, so nobody relegates', () => {
    const small = Array.from({ length: 8 }, (_, i) => mk(i + 1, 100 - i * 5));
    const res = closeGroup(small);
    expect(res.some((r) => r.movement === 'relegate')).toBe(false);
    expect(res.filter((r) => r.movement === 'promote')).toHaveLength(5);
  });
  it('closeMonth handles groups independently, in group id order', () => {
    const res = closeMonth([...group('bronze', 'b-1'), ...group('gold', 'a-1')]);
    expect(res[0]?.groupId).toBe('a-1');
    expect(res[20]?.groupId).toBe('b-1');
  });
  it('scopes', () => {
    const entries = [
      mk(1, 10, 'silver', 'g1', 'north'),
      mk(2, 30, 'silver', 'g1', 'south'),
      mk(3, 20, 'bronze', 'g2', 'north'),
      mk(4, 40, 'silver', 'g1', 'north'),
    ];
    expect(scoped(entries, 'league', 'u01').map((e) => e.userId)).toEqual(['u04', 'u02', 'u01']);
    expect(scoped(entries, 'friends', 'u01', new Set(['u03'])).map((e) => e.userId)).toEqual(['u03', 'u01']);
    expect(scoped(entries, 'area', 'u01').map((e) => e.userId)).toEqual(['u04', 'u03', 'u01']);
    expect(scoped(entries, 'league', 'nobody')).toEqual([]);
  });
  it('points to the next position overtakes the entry above', () => {
    const ranked = rank([mk(1, 100), mk(2, 90), mk(3, 90, 'silver', 'g1', 'north', '2026-10-09T10:00:00Z')]);
    expect(pointsToNextPosition(ranked, 'u01')).toBeNull();
    expect(pointsToNextPosition(ranked, 'u02')).toBe(11);
    expect(pointsToNextPosition(ranked, 'u03')).toBe(1);
    expect(pointsToNextPosition(ranked, 'ghost')).toBeNull();
  });
  it('assignGroups chunks by 20', () => {
    const ids = Array.from({ length: 45 }, (_, i) => `u${i}`);
    const g = assignGroups(ids, 'bronze');
    expect(g.map((x) => x.userIds.length)).toEqual([20, 20, 5]);
    expect(g[2]?.groupId).toBe('bronze-3');
  });
  it('league names are the Greek ones', () => {
    expect(LEAGUE_NAMES_EL).toEqual({ bronze: 'Χάλκινη', silver: 'Ασημένια', gold: 'Χρυσή' });
  });
});

describe('entitlements', () => {
  const now = '2026-10-09T12:00:00Z';
  const ent = (p: Partial<Entitlement>): Entitlement => ({ userId: 'u1', status: 'none', endsAt: null, giftUntil: null, ...p });
  it('none and waitlist (fake door) see nothing', () => {
    for (const f of PRO_FEATURES) {
      expect(canSee(f, ent({ status: 'none' }), now)).toBe(false);
      expect(canSee(f, ent({ status: 'waitlist' }), now)).toBe(false);
      expect(canSee(f, null, now)).toBe(false);
      expect(canSee(f, undefined, now)).toBe(false);
    }
  });
  it('active sees every Pro feature', () => {
    for (const f of PRO_FEATURES) expect(canSee(f, ent({ status: 'active' }), now)).toBe(true);
    expect(PRO_FEATURES).toEqual(
      expect.arrayContaining<ProFeature>(['quiz_cards_12', 'tournament_alerts', 'opponent_scouting', 'deep_stats', 'level_numbers', 'win_cards']),
    );
  });
  it('expiry and gifts', () => {
    expect(isPro(ent({ status: 'active', endsAt: '2026-10-09T12:00:00Z' }), now)).toBe(false);
    expect(isPro(ent({ status: 'active', endsAt: '2026-10-09T12:00:01Z' }), now)).toBe(true);
    expect(isPro(ent({ giftUntil: '2026-10-16T12:00:00Z' }), now)).toBe(true);
    expect(isPro(ent({ giftUntil: '2026-10-09T11:59:59Z' }), now)).toBe(false);
  });
  it('quiz size follows Pro', () => {
    expect(quizCardsPerDay(ent({ status: 'active' }), now)).toBe(12);
    expect(quizCardsPerDay(null, now)).toBe(6);
  });
});
