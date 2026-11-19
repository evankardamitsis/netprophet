import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { initialDailyStreak, recordDayPlayed, dayStreakMoment } from '@netprophet/core';
import type { FeedResultCard, MeResult, StreakCelebration, StreakWeek } from '@netprophet/db';
import {
  bestCalls,
  callsChip,
  dayCelebrationWords,
  dayMilestoneFrame,
  daysInRow,
  freezeLine,
  isDailyStreak,
  nextPrize,
  plusOneMoment,
  streakSheetView,
  weekCells,
} from './dailyStreak';
import { fromResultCard } from './feed';
import { celebrationView, groupView, nextGroup } from './celebrate';
import { takeAll, takenToast } from './resultsSummary';
import { streakAtHead } from './hudNumbers';
import { mayHaveCelebrated } from './postVote';
import { mockStreakWeek } from '../mock/me';

const t = getCopy('el');
const en = getCopy('en');

type Game = MeResult['game'];
const game = (over: Partial<Game> = {}): Game => ({
  total_points: 340,
  month_points: 340,
  streak: 12,
  streak_best: 23,
  chain: 0,
  votes_cast: 40,
  votes_correct: 22,
  votes_to_next_free_freeze: 2,
  daily_streak: true,
  days_to_next_free_freeze: 2,
  played_today: false,
  calls_streak: 2,
  calls_best: 7,
  freezes: { free: 1, paid: 0, max: 2 },
  ...over,
});

describe('the switch', () => {
  it('reads get_me: on only when the server says so (a server from before 18 Nov is off)', () => {
    expect(isDailyStreak(game())).toBe(true);
    expect(isDailyStreak(game({ daily_streak: false }))).toBe(false);
    expect(isDailyStreak({ daily_streak: undefined })).toBe(false);
    expect(isDailyStreak(null)).toBe(false);
  });
});

describe('the σερί sheet', () => {
  const week: StreakWeek = {
    on: true,
    today: '2026-11-19',
    monday: '2026-11-16',
    days: [
      { day: '2026-11-16', kind: 'played' },
      { day: '2026-11-17', kind: 'played' },
      { day: '2026-11-18', kind: 'frozen' },
    ],
  };

  it('the board: «12 μέρες στη σειρά», the week with the covered day as ✓, today to do, «Ασφάλειες: 1 από 2»', () => {
    const v = streakSheetView(game(), week, new Set(['frame_seven', 'frame_ten']), t);
    expect(v.title).toBe('12 μέρες στη σειρά');
    expect(v.week?.map((c) => c.letter).join(' ')).toBe('Δ Τ ✓ Π Π Σ Κ');
    expect(v.week?.map((c) => c.state)).toEqual(['played', 'played', 'frozen', 'none', 'none', 'none', 'none']);
    expect(v.week?.findIndex((c) => c.today)).toBe(3);
    expect(v.today).toBe('Σήμερα δεν έχεις παίξει ακόμα. Μία ψήφος ή το quiz και το κρατάς.');
    expect(v.freezes).toBe('Ασφάλειες: 1 από 2');
    expect(v.frozenKey).toBe('Κύκλος με ✓: μέρα που την κάλυψε Ασφάλεια.');
    // 12 → 14 is the next 7th day: a free Ασφάλεια (one slot is free)
    expect(v.next).toBe('Στις 14 μέρες: μία Ασφάλεια');
  });

  it('played today, σερί 0, no covered day, no week from the server', () => {
    expect(streakSheetView(game({ played_today: true }), week, null, t).today).toBe('Σήμερα το κράτησες. Τα λέμε αύριο.');
    expect(streakSheetView(game({ streak: 0 }), null, null, t).today).toBe('Μία ψήφος ή το quiz σήμερα και ξεκινάς σερί.');
    expect(streakSheetView(game({ streak: 1 }), null, null, t).title).toBe('1 μέρα στη σειρά');
    const plain = streakSheetView(game(), { ...week, days: week.days.slice(0, 2) }, null, t);
    expect(plain.frozenKey).toBeNull();
    expect(streakSheetView(game(), null, null, t).week).toBeNull();
    expect(weekCells({ ...week, on: false }, t)).toBeNull();
  });

  it('the next prize: the Frame not owned yet and the free Ασφάλεια, from the core rule', () => {
    expect(nextPrize(6, 1, new Set(), t)?.line).toBe('Στις 7 μέρες: Frame «Επτά» και μία Ασφάλεια');
    expect(nextPrize(6, 2, new Set(), t)?.line).toBe('Στις 7 μέρες: Frame «Επτά»');
    // owned «Επτά» and both slots full: on to «Δέκα»
    expect(nextPrize(6, 2, new Set(['frame_seven']), t)?.line).toBe('Στις 10 μέρες: Frame «Δέκα»');
    expect(nextPrize(1, 0, new Set(), t)?.line).toBe('Στις 3 μέρες: μία Ασφάλεια');
    expect(nextPrize(20, 2, new Set(), t)?.line).toBe('Στις 30 μέρες: Frame «Μήνας»');
    expect(nextPrize(99, 2, new Set(), t)?.line).toBe('Στις 100 μέρες: Frame «Εκατό»');
    expect(nextPrize(100, 2, new Set(), t)).toBeNull();
    // ownership unknown (the look not loaded): no Frame promised
    expect(nextPrize(6, 2, null, t)).toBeNull();
    expect(nextPrize(6, 1, null, en)?.line).toBe('At 7 days: a Streak Freeze');
  });

  it('the sample week keeps the five days before today, the third by an Ασφάλεια', () => {
    const w = mockStreakWeek(new Date('2026-11-22T10:00:00Z'));
    expect(w).toMatchObject({ on: true, today: '2026-11-22', monday: '2026-11-16' });
    expect(w.days).toEqual([
      { day: '2026-11-17', kind: 'played' },
      { day: '2026-11-18', kind: 'played' },
      { day: '2026-11-19', kind: 'frozen' },
      { day: '2026-11-20', kind: 'played' },
      { day: '2026-11-21', kind: 'played' },
    ]);
  });
});

describe('the «+1» after the first play of the day', () => {
  it('plays when today turns played, with the server’s new σερί', () => {
    expect(plusOneMoment(game(), game({ played_today: true, streak: 13 }))).toEqual({ streak: 13 });
    // the σερί broke overnight: the server says 1
    expect(plusOneMoment(game({ streak: 0 }), game({ played_today: true, streak: 1 }))).toEqual({ streak: 1 });
  });

  it('not twice a day, not while off, not without a before', () => {
    expect(plusOneMoment(game({ played_today: true }), game({ played_today: true, streak: 13 }))).toBeNull();
    expect(plusOneMoment(game({ daily_streak: false }), game({ played_today: true }))).toBeNull();
    expect(plusOneMoment(null, game({ played_today: true }))).toBeNull();
  });

  it('a milestone day plays its full-screen moment instead, by the same rule as core dayStreakMoment', () => {
    // check the prediction against the core rule on the same days
    for (const [before, best, held] of [
      [6, 6, 1],
      [6, 23, 2],
      [6, 23, 1],
      [29, 40, 2],
      [12, 23, 1],
      [2, 2, 0],
    ] as const) {
      const state = { ...initialDailyStreak(), current: before, best, lastPlayed: '2026-11-18', through: '2026-11-18', freezes: Array(held).fill('free'), recordRun: best === before };
      const ev = recordDayPlayed(state, '2026-11-19').events.find((e) => e.kind === 'played')!;
      const core = dayStreakMoment(ev);
      const mine = plusOneMoment(
        game({ streak: before, streak_best: best, freezes: { free: held, paid: 0, max: 2 } }),
        game({ played_today: true, streak: before + 1, streak_best: Math.max(best, before + 1) }),
      );
      expect(mine === null).toBe(core?.type === 'milestone');
    }
  });
});

describe('a result card with the daily σερί on', () => {
  const card = (over: Partial<FeedResultCard['payload']>): FeedResultCard => ({
    kind: 'result',
    id: 'r1',
    created_at: '2026-11-19T18:00:00Z',
    payload: {
      match_id: 'm1',
      vote_id: 'v1',
      outcome: 'correct',
      points: 15,
      upset: false,
      streak: 12,
      freeze_used: false,
      winner_side: 1,
      score: null,
      sets: [{ w: 6, l: 3 }],
      ...over,
    },
  });

  it('a correct call: «3 σωστές στη σειρά · +15», the σερί untouched', () => {
    const c = fromResultCard(card({ streak_event: { kind: 'idle', calls: 3 } }), t);
    expect(c).toMatchObject({ daily: true, frozen: false, streakBefore: 12, streak: 12, pill: '3 σωστές στη σειρά · +15' });
  });

  it('the first correct call is just the points; a wrong one says nothing, never «κράτησες το σερί»', () => {
    expect(fromResultCard(card({ points: 10, streak_event: { kind: 'idle', calls: 1 } }), t).pill).toBe('+10');
    // the server's shape for a wrong call with a σερί: frozen, kept, no freeze spent
    const wrong = fromResultCard(card({ outcome: 'wrong', points: 0, freeze_used: true, streak_event: { kind: 'frozen', freezeUsed: null, kept: true, calls: 0 } }), t);
    expect(wrong).toMatchObject({ daily: true, frozen: false, pill: null, streakBefore: 12 });
  });

  it('a card from before the switch keeps its old words', () => {
    const c = fromResultCard(card({ streak: 4, streak_event: { kind: 'advanced' } }), t);
    expect(c).toMatchObject({ daily: false, streakBefore: 3, pill: '+15 · σερί 4' });
    expect(callsChip(true, 15, undefined, t)).toBeUndefined();
    expect(callsChip(true, 15, 3, en)).toBe('3 correct in a row · +15');
  });

  it('the header keeps get_me’s σερί under it, and «Πάρε τους πόντους» flies no «+1»', () => {
    const c = fromResultCard(card({ streak_event: { kind: 'idle', calls: 3 } }), t);
    expect(streakAtHead([c], new Set())).toBeNull();
    const taken = takeAll(c, [c], false);
    expect(taken).toEqual({ points: 30, streak: null, allRight: false });
    expect(takenToast(taken, t)).toBe('+30 πόντοι');
    expect(takenToast({ points: 0, streak: null }, t)).toBe('Τα είδες όλα');
    expect(takenToast({ points: 30, streak: 4 }, t)).toBe('+30 πόντοι · σερί 4');
  });
});

describe('the day milestones', () => {
  const day = (n: number, reward: StreakCelebration['payload']['reward']): StreakCelebration => ({
    id: `d${n}`,
    created_at: '2026-11-19T10:00:00Z',
    payload: { type: 'streak_milestone', streak: n, unit: 'days', day: '2026-11-19', freeze: false, reward } as StreakCelebration['payload'],
  });

  it('the board’s titles, and the Frame on the Baller', () => {
    const v = celebrationView(day(7, { freeze: false, frame: 'frame_seven', frame_key: 'frame_seven', gear: null }), t);
    expect(v).toMatchObject({ label: 'ΣΕΡΙ', streak: 7, title: 'Επτά μέρες στη σειρά!', reward: 'Πήρες το Frame «Επτά».', frame: 'frame_seven' });
    expect(celebrationView(day(3, { freeze: true, frame: null, frame_key: null, gear: null }), t)).toMatchObject({ title: 'Τρεις μέρες στη σειρά!', frame: null });
    expect(dayCelebrationWords(day(10, { freeze: false, frame: 'frame_ten', frame_key: 'frame_ten' }), t).title).toBe('Δέκα μέρες. Το δέκα το καλό!');
    expect(dayCelebrationWords(day(30, { freeze: false, frame: null, frame_key: 'frame_month' }), t)).toEqual({ title: 'Ένας μήνας στη σειρά!', reward: 'Πήρες το Frame «Μήνας».' });
    expect(dayCelebrationWords(day(50, { freeze: false, frame: null, frame_key: null }), t)).toEqual({ title: 'Πενήντα μέρες!', reward: 'Συνέχισε έτσι' });
    expect(dayCelebrationWords(day(100, { freeze: false, frame: null, frame_key: 'frame_hundred' }), t).title).toBe('Εκατό μέρες στη σειρά!');
    expect(dayMilestoneFrame(day(100, undefined))).toBe('frame_hundred');
    expect(dayMilestoneFrame(day(50, undefined))).toBeNull();
  });

  it('names only what was given: a Frame owned already is not «Πήρες», day 7 with an Ασφάλεια names both', () => {
    expect(dayCelebrationWords(day(7, { freeze: true, frame: 'frame_seven', frame_key: 'frame_seven' }), t).reward).toBe('Πήρες το Frame «Επτά» και μία Ασφάλεια.');
    expect(dayCelebrationWords(day(7, { freeze: true, frame: null, frame_key: null }), t).reward).toBe('Πάρε και μια Ασφάλεια για τις δύσκολες μέρες');
    expect(dayCelebrationWords(day(7, { freeze: false, frame: null, frame_key: null }), t).reward).toBe('Συνέχισε έτσι');
  });

  it('never shares a moment with a correct-calls milestone queued before the switch', () => {
    const calls: StreakCelebration = { id: 'c5', created_at: '2026-11-18T10:00:00Z', payload: { type: 'streak_milestone', streak: 5, match_id: 'm', reward: { freeze: false, frame: null, gear: 'gear_headband' } } };
    const d7 = day(7, { freeze: false, frame: 'frame_seven', frame_key: 'frame_seven' });
    expect(nextGroup([calls, d7]).map((c) => c.id)).toEqual(['d7']);
    expect(groupView(nextGroup([calls]), t).title).toBe('Πέντε στη σειρά!');
  });
});

describe('Εγώ and the vote path', () => {
  it('the freeze line in days, the best correct calls', () => {
    expect(freezeLine(game({ days_to_next_free_freeze: 1 }), t)).toBe('Δωρεάν Ασφάλεια με μία μέρα ακόμα');
    expect(freezeLine(game({ freezes: { free: 2, paid: 0, max: 2 } }), t)).toBe('Έχεις όσες Ασφάλειες χωράνε');
    expect(freezeLine(game({ daily_streak: false, votes_to_next_free_freeze: 4 }), t)).toBe('Δωρεάν Ασφάλεια σε 4 ψήφους');
    expect(bestCalls(game({ calls_best: 1 }), t)).toEqual({ label: 'Η καλύτερη σειρά σου:', value: '1 σωστή' });
    expect(bestCalls(game({ daily_streak: false }), t)).toBeNull();
    expect(daysInRow(12, en)).toBe('12 days in a row');
  });

  it('a vote that made the day can have queued a day milestone, so the celebrations are read again', () => {
    const snap = { quests: { daily: [], weekly: [] }, badges: { badges: [] }, unlocks: [], points: 340 } as never as Parameters<typeof mayHaveCelebrated>[0];
    expect(mayHaveCelebrated({ ...snap, playedToday: false }, { ...snap, playedToday: true })).toBe(true);
    expect(mayHaveCelebrated({ ...snap, playedToday: true }, { ...snap, playedToday: true })).toBe(false);
  });
});
