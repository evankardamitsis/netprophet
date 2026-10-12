import { levelNumber } from '@netprophet/copy';
import type { Copy } from '@netprophet/copy';
import type { PlayerRef, ScoutPlayer, WinLoss } from '@netprophet/db';
import type { FormDot } from './players';
import { fmt } from './votes';

/**
 * «Ο αντίπαλος πριν το ματς» (Pro): the other side of your own next match, turned into lines.
 * Records read «3-1»; an empty one reads «Τίποτα ακόμα».
 */
export interface ScoutView {
  id: string;
  first: string;
  surname: string;
  /** «level 5 · Γλυφάδα · δεξί χέρι» */
  sub: string;
  form: FormDot[];
  year: string;
  h2h: { record: string | null; line: string };
  deciding: string;
  tiebreaks: string;
  known: string;
  common: { id: string; name: string; me: string; them: string }[];
}

export function record(r: WinLoss, t: Copy): string {
  return r.w + r.l === 0 ? t.scout.none : `${r.w}-${r.l}`;
}

const fullName = (p: Pick<PlayerRef, 'first_name' | 'surname'>) => `${p.first_name} ${p.surname}`.trim();

export function toScoutView(p: ScoutPlayer, areas: Record<string, string>, t: Copy): ScoutView {
  const s = t.scout;
  const met = p.h2h.w + p.h2h.l > 0;
  const last = p.h2h.last;
  return {
    id: p.id,
    first: p.first_name,
    surname: p.surname,
    sub: [
      p.level_tier != null ? `${t.level.label} ${levelNumber(p.level_tier)}` : null,
      p.area_id ? areas[p.area_id] ?? null : null,
      p.hand ? s.hands[p.hand] : null,
    ]
      .filter(Boolean)
      .join(' · '),
    form: p.form,
    year: fmt(s.year, { w: p.year.w, l: p.year.l }),
    h2h: {
      record: met ? `${p.h2h.w}-${p.h2h.l}` : null,
      line: !met || !last ? s.h2hNone : fmt(last.won ? s.lastWon : s.lastLost, { score: last.score ?? '' }).replace(' .', '.'),
    },
    deciding: record(p.deciding, t),
    tiebreaks: record(p.tiebreaks, t),
    known: record(p.known, t),
    common: p.common.map((c) => ({ id: c.id, name: fullName(c), me: record(c.me, t), them: record(c.them, t) })),
  };
}
