import { greekCaps, type Copy } from '@netprophet/copy';
import type { Celebration } from '@netprophet/db';
import { fmt } from './votes';

/**
 * What a σερί milestone celebration says (prototype msL): «ΣΕΡΙ», the number in the pill, the title, and a reward
 * line that names only what this milestone actually gave (a frame is given once, the σερί 3 freeze only the first
 * time).
 */
export interface CelebrationView {
  label: string;
  streak: number;
  title: string;
  reward: string;
}

export function celebrationView(c: Celebration, t: Copy): CelebrationView {
  const n = c.payload.streak;
  const r = c.payload.reward ?? { freeze: false, frame: null };
  const frame = r.frame ? t.celebrate.frames[r.frame] ?? r.frame : null;
  const reward = r.freeze && frame ? t.celebrate.rewards.both : r.freeze ? t.celebrate.rewards.freeze : frame ? fmt(t.celebrate.rewards.frame, { name: frame }) : t.celebrate.rewards.none;
  return { label: greekCaps(t.celebrate.label), streak: n, title: t.celebrate.titles[n] ?? `${n}`, reward };
}
