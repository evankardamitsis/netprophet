import { motion } from '@netprophet/tokens';

/**
 * The timing of Baller's level-up move (founder, 18 Oct: "the level up should have a different baller animation"),
 * from the motion tokens: a crouch, the rise (grows a quarter, two turns, the lime ring opens), the fall, then the
 * victory hop. In the celebration it starts once the drop has landed and is over before «Συνέχεια» comes in.
 */
export const LEVEL_UP = (() => {
  const crouch = Math.round(motion.revealDur * 0.4);
  const rise = Math.round(motion.revealDur * 1.3);
  const fall = Math.round(motion.revealDur * 0.5);
  const land = crouch + rise + fall;
  const hopAt = land + Math.round(motion.revealDur * 0.6);
  return { crouch, rise, fall, land, hopAt, total: hopAt + Math.round(motion.revealDur * 0.6) };
})();

/** when the celebration starts the move: the drop has landed and waved */
export const LEVEL_UP_AT = Math.round(motion.revealDur * 1.4);
