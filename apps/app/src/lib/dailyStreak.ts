import { DAY_MILESTONES, DAY_MILESTONE_FRAMES, MAX_FREEZES, addDays, earnsDayFreeze, type DayMilestone } from '@netprophet/core';
import type { Copy } from '@netprophet/copy';
import type { MeResult, StreakCelebration, StreakWeek } from '@netprophet/db';
import { fmt } from './votes';

/**
 * The daily σερί in the app (founder's board, 18 Nov 2026): the σερί is days in a row played (one match vote or the
 * day's quiz finished), and the correct calls in a row live on apart (the +5 chain, «Η καλύτερη σειρά σου»). The
 * server decides everything; this only words what get_me, get_streak_week and the inbox say. The rule itself is
 * packages/core rules/dailyStreak.ts: nothing here re-counts days.
 *
 * The switch (core.game_settings.daily_streak) goes on with app 1.0.1, so the app reads it: get_me's
 * `game.daily_streak` for the screens, and each inbox item's own shape (a result's `streak_event.calls`, a
 * celebration's `unit: 'days'`) for what was queued, since items from before the switch keep the old shape.
 */

type Game = Pick<MeResult['game'], 'streak' | 'streak_best' | 'freezes'> &
  Partial<Pick<MeResult['game'], 'daily_streak' | 'played_today' | 'days_to_next_free_freeze' | 'calls_best'>>;

/** the σερί counts days (the switch is on); a server from before 18 Nov says nothing and is off */
export function isDailyStreak(game: Pick<Game, 'daily_streak'> | null | undefined): boolean {
  return game?.daily_streak === true;
}

const plural = (n: number, forms: { one: string; many: string }) => (n === 1 ? forms.one.replace('{n}', '1') : fmt(forms.many, { n }));

/** «12 μέρες στη σειρά», «1 μέρα στη σειρά» */
export function daysInRow(n: number, t: Copy): string {
  return plural(n, t.streak.days);
}

/** freezes held, never more than the slots */
export function freezesHeld(game: Pick<Game, 'freezes'>): number {
  const { free, paid, max } = game.freezes;
  return Math.min(free + paid, max);
}

export type WeekCell = { letter: string; state: 'played' | 'frozen' | 'none'; today: boolean };

/** Monday to Sunday of this Athens week, each day played, covered by an Ασφάλεια (✓ in place of its letter) or not */
export function weekCells(week: StreakWeek | null, t: Copy): WeekCell[] | null {
  if (!week || !week.on) return null;
  const kinds = new Map(week.days.map((d) => [d.day, d.kind] as const));
  return t.streak.sheet.week.map((letter, i) => {
    const day = addDays(week.monday, i);
    const kind = kinds.get(day);
    return { letter: kind === 'frozen' ? '✓' : letter, state: kind ?? 'none', today: day === week.today };
  });
}

/**
 * The next thing a day of play gives: the nearest day in a row with a Frame not owned yet (core DAY_MILESTONE_FRAMES)
 * or a free Ασφάλεια (day 3 and every 7th, core earnsDayFreeze, only while a slot is free). Null when nothing is near.
 * `prize` is what it gives («Frame «Επτά» και μία Ασφάλεια»), shown under «Μέρα 7» on the sheet.
 */
export function nextPrize(
  streak: number,
  held: number,
  owned: ReadonlySet<string> | null,
  t: Copy,
): { day: number; prize: string } | null {
  const s = t.streak.sheet;
  const top = DAY_MILESTONES[DAY_MILESTONES.length - 1]!;
  for (let day = streak + 1; day <= Math.max(top, streak + 7); day += 1) {
    const frame = DAY_MILESTONE_FRAMES[day] ?? null;
    const frameNew = frame !== null && owned !== null && !owned.has(frame);
    const freeze = earnsDayFreeze(day) && held < MAX_FREEZES;
    if (!frameNew && !freeze) continue;
    const prizes = [
      ...(frameNew ? [fmt(s.prizeFrame, { name: t.celebrate.frames[frame!] ?? frame! })] : []),
      ...(freeze ? [s.prizeFreeze] : []),
    ];
    return { day, prize: prizes.join(s.prizeJoin) };
  }
  return null;
}

/** a tile on the sheet: a big value over a short label («1/2» over «Ασφάλειες») */
export type SheetTile = { value: string; label: string };

export interface StreakSheetView {
  /** the big number, the days in a row */
  count: number;
  /** under it: «μέρες στη σειρά», «μέρα στη σειρά» */
  unit: string;
  week: WeekCell[] | null;
  /** today, in one short line: kept, to do, or how to start */
  today: string;
  /** whether today is played (the line is lime then) */
  todayDone: boolean;
  /** «1/2» over «Ασφάλειες» */
  freezes: SheetTile;
  /** «Μέρα 14» over «παίρνεις μία Ασφάλεια»; null when nothing is near */
  next: SheetTile | null;
}

export function streakSheetView(game: Game, week: StreakWeek | null, owned: ReadonlySet<string> | null, t: Copy): StreakSheetView {
  const s = t.streak.sheet;
  const held = freezesHeld(game);
  const prize = nextPrize(game.streak, held, owned, t);
  return {
    count: game.streak,
    unit: game.streak === 1 ? s.unit.one : s.unit.many,
    week: weekCells(week, t),
    today: game.played_today ? s.done : game.streak > 0 ? s.todo : s.start,
    todayDone: game.played_today === true,
    freezes: { value: `${held}/${game.freezes.max}`, label: s.freezes },
    next: prize ? { value: fmt(s.nextDay, { n: prize.day }), label: fmt(s.nextGets, { prize: prize.prize }) } : null,
  };
}

/**
 * The small «+1» after the first play of the day: `before` is the get_me shown before, `after` the new one. It plays
 * when today went from not played to played (the server's own word, so a σερί that broke overnight says «1 μέρα»),
 * and not when this day is a milestone that gets its full-screen moment (core dayStreakMoment: the first time it is
 * reached, or when it gives a free Ασφάλεια).
 */
export function plusOneMoment(before: Game | null | undefined, after: Game | null | undefined): { streak: number } | null {
  if (!before || !after || !isDailyStreak(before) || !isDailyStreak(after)) return null;
  if (before.played_today !== false || after.played_today !== true || after.streak < 1) return null;
  const n = after.streak;
  const milestone = (DAY_MILESTONES as readonly number[]).includes(n);
  const newBest = n > before.streak_best;
  const freeze = earnsDayFreeze(n) && freezesHeld(before) < before.freezes.max;
  if (milestone && (newBest || freeze)) return null;
  return { streak: n };
}

/** a daily σερί celebration (milestone or «Νέο ρεκόρ»), as opposed to the correct calls' ones from before the switch */
export function isDayCelebration(c: { payload: { unit?: string } }): boolean {
  return c.payload.unit === 'days';
}

/** the Frame a day milestone stands for (core DAY_MILESTONE_FRAMES), shown on the Baller in its moment */
export function dayMilestoneFrame(c: StreakCelebration): string | null {
  return DAY_MILESTONE_FRAMES[c.payload.streak as DayMilestone] ?? null;
}

/**
 * A day milestone's title and line: «Επτά μέρες στη σειρά!», «Πήρες το Frame «Επτά».». Only what was really given is
 * named: `reward.frame_key` is null when the Frame was owned already, `reward.freeze` false when both slots were full.
 */
export function dayCelebrationWords(c: StreakCelebration, t: Copy): { title: string; reward: string } {
  const n = c.payload.streak;
  const r = c.payload.reward;
  const key = r?.frame_key ?? null;
  const name = key ? t.celebrate.frames[key] ?? key : null;
  const freeze = r?.freeze === true;
  const w = t.celebrate.rewards;
  const reward = name && freeze ? fmt(w.frameAndFreezeGot, { name }) : name ? fmt(w.frameGot, { name }) : freeze ? w.freeze : w.none;
  return { title: t.celebrate.dayTitles[n] ?? daysInRow(n, t), reward };
}

/**
 * A result's chip with the daily σερί on: the correct calls in a row and the points, «3 σωστές στη σειρά · +15»; one
 * correct call alone is just «+10» (the +5 chain starts at the second, core points.ts); a wrong call says nothing
 * (it never touches the σερί now). Null when the card is from before the switch (no `calls`).
 */
export function callsChip(ok: boolean, points: number, calls: number | undefined, t: Copy): string | null | undefined {
  if (calls === undefined) return undefined;
  if (!ok) return null;
  return calls >= 2 ? fmt(t.result.calls, { n: calls, points }) : fmt(t.result.pointsOnly, { points });
}

/** «Η καλύτερη σειρά σου: 7 σωστές», the correct calls at best, for the stats on Εγώ (daily σερί only) */
export function bestCalls(game: Game, t: Copy): { label: string; value: string } | null {
  if (!isDailyStreak(game) || game.calls_best === undefined) return null;
  const b = t.me.bestCalls;
  return { label: b.label, value: plural(game.calls_best, b) };
}

/** what Εγώ says under the Ασφάλειες: days to the next free one with the daily σερί, votes before it */
export function freezeLine(game: Game & Pick<MeResult['game'], 'votes_to_next_free_freeze'>, t: Copy): string {
  const m = t.me;
  if (freezesHeld(game) >= game.freezes.max) return m.freezesFull;
  if (isDailyStreak(game)) return plural(game.days_to_next_free_freeze ?? game.votes_to_next_free_freeze, m.nextFreezeDays);
  return plural(game.votes_to_next_free_freeze, m.nextFreeze);
}
