/**
 * The game level: a user's level from the points they have collected (founder, 14 Oct 2026). Not the hidden player
 * level in level.ts. Triangular on a step: level 2 at 1 step, 3 at 3, 4 at 6, 5 at 10 (with the step 100: 100, 300,
 * 600, 1000), so each level asks one step more than the last. No cap. Pure; core.game_level (SQL) runs the same
 * vectors (test-vectors/game-level.json).
 */

/** points of the first step; sports.config -> rules -> game_level_step overrides it per sport */
export const GAME_LEVEL_STEP = 100;

/** the total points where `level` starts (level 1 starts at 0) */
export function gameLevelStart(level: number, step = GAME_LEVEL_STEP): number {
  return (step * level * (level - 1)) / 2;
}

export interface GameLevel {
  level: number;
  /** points collected inside this level */
  into: number;
  /** points this level spans, start to the next */
  span: number;
  /** points still missing for the next level */
  next: number;
}

export function gameLevel(points: number, step = GAME_LEVEL_STEP): GameLevel {
  const p = Math.max(0, Math.floor(points));
  // closed form, then nudged for floating point at the exact step edges
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * p) / step)) / 2));
  while (gameLevelStart(level + 1, step) <= p) level += 1;
  while (level > 1 && gameLevelStart(level, step) > p) level -= 1;
  const start = gameLevelStart(level, step);
  const end = gameLevelStart(level + 1, step);
  return { level, into: p - start, span: end - start, next: end - p };
}
