import { formatWinnerSets, localParts } from '@netprophet/core';
import { accusativeName, levelNumber, nameGender } from '@netprophet/copy';
import type { Copy } from '@netprophet/copy';
import type { MatchStatsPart, PlayerRef, ScoutPlayer, SetScore, StatsPerson, WinLoss } from '@netprophet/db';
import { categoryLabel } from './category';
import { roundLabel } from './feed';
import { statBlocks, pctText, type StatBlock, type StatsFormat } from './matchStats';
import type { FormDot } from './players';
import { dayLabel } from './results';
import { fmt } from './votes';
import { PLAYER_LEVEL_SHOWN } from './levelShown';

/**
 * «Ο αντίπαλος πριν το ματς» (Pro): the other side of your own next match, turned into lines.
 * Founder, 22 Oct 2026: as much as we know, never less than the free player card. So on top of μεταξύ σας, the
 * pressure numbers and the common opponents: the last ten, every meeting, singles and doubles in the blocks of
 * «Τα στατιστικά σου» (said about them), this tournament so far, how they play, and every match.
 * Records read «3-1»; an empty one reads «Τίποτα ακόμα».
 */

/** a match line: ✓ when won (by whoever the line is about), who, the score from that side, a quiet meta line */
export interface ScoutLine {
  key: string;
  won: boolean;
  score: string;
  against: string;
  partner: string | null;
  meta: string;
}

export interface ScoutFormat {
  format: StatsFormat;
  played: number;
  /** «Μονά · 12» */
  label: string;
  record: string;
  pct: string;
  runs: { current: number; best: number } | null;
  blocks: StatBlock[];
}

export interface ScoutView {
  id: string;
  first: string;
  surname: string;
  /** «level 5 · Γλυφάδα · δεξί χέρι» */
  sub: string;
  /** the last ten, oldest first */
  form: FormDot[];
  year: string;
  h2h: { record: string | null; line: string; count: string | null; meetings: ScoutLine[] };
  deciding: string;
  tiebreaks: string;
  known: string;
  common: { id: string; name: string; me: string; them: string }[];
  /** singles and doubles, the one they play most first; a format with no match is left out */
  formats: ScoutFormat[];
  /** this tournament so far (the screen shows it only for a tournament match) */
  path: ScoutLine[];
  traits: { id: string; label: string; count: number }[];
  history: ScoutLine[];
  /** «Τα 60 πιο πρόσφατα από 75.» when the list is cut */
  historyCap: string | null;
}

export function record(r: WinLoss, t: Copy): string {
  return r.w + r.l === 0 ? t.scout.none : `${r.w}-${r.l}`;
}

const fullName = (p: Pick<PlayerRef, 'first_name' | 'surname'>) => `${p.first_name} ${p.surname}`.trim();
const plural = (forms: { one: string; many: string }, n: number) => (n === 1 ? forms.one : fmt(forms.many, { n }));

function flip(s: SetScore): SetScore {
  const out: SetScore = { w: s.l, l: s.w };
  if (s.tb) out.tb = [s.tb[1], s.tb[0]];
  if (s.stb) out.stb = true;
  return out;
}

/** a stored result (winner first) from one side: «6-4, 3-6, 10-8» for the winner, «4-6, 6-3, 8-10» for the loser */
export function sideScore(m: { sets: SetScore[]; score: string | null; retired: boolean; walkover: boolean }, won: boolean, t: Copy): string {
  if (m.walkover) return t.results.walkover;
  if (m.sets.length > 0) return formatWinnerSets(won ? m.sets : m.sets.map(flip), { retired: m.retired }, t.results);
  if (!m.score) return '';
  const text = won ? m.score : m.score.split('-').reverse().join('-');
  return m.retired ? `${text} ${t.results.retired}` : text;
}

/** «12/10», «Χθες», «1/6/25» for another year: the day only, never a time */
function day(startsAt: string | null, now: Date, t: Copy): string | null {
  if (!startsAt) return null;
  const label = dayLabel(startsAt, now, t);
  return /^\d+\/\d+$/.test(label) && localParts(startsAt).year !== localParts(now.toISOString()).year
    ? `${label}/${String(localParts(startsAt).year).slice(-2)}`
    : label;
}

const people = (list: StatsPerson[]) => list.map(fullName).join(' & ');
const partnerLine = (list: StatsPerson[], t: Copy) =>
  list.length > 0 ? fmt(t.scout.withPartner, { names: list.map((p) => accusativeName(p.first_name, p.surname, p.gender)).join(' & ') }) : null;

/** «Τα στατιστικά σου» blocks, said about them: the same numbers, the words in the third person */
export function scoutVoice(t: Copy): Copy {
  const v = t.scout.voice;
  const m = t.matchStats;
  return {
    ...t,
    matchStats: {
      ...m,
      sections: { ...m.sections, ...v.sections },
      notes: { ...m.notes, ...v.notes },
      rows: { ...m.rows, ...v.rows },
      tour: { ...m.tour, champion: v.champion },
    },
  };
}

function formatView(part: MatchStatsPart, format: StatsFormat, t: Copy, voiced: Copy): ScoutFormat {
  const more = part.more;
  return {
    format,
    played: part.played,
    label: fmt(t.matchStats.formatCount, { label: t.matchStats.formats[format], n: part.played }),
    record: `${part.won}-${part.lost}`,
    pct: pctText(part.win_pct, t),
    runs: more ? { current: more.runs.current, best: more.runs.best } : null,
    blocks: more ? statBlocks(more, format, voiced) : [],
  };
}

export function toScoutView(p: ScoutPlayer, areas: Record<string, string>, t: Copy, now: Date = new Date()): ScoutView {
  const s = t.scout;
  const met = p.h2h.w + p.h2h.l > 0;
  const meetings = p.h2h.meetings ?? [];
  const lastMeeting = meetings[0] ?? null;
  const last = p.h2h.last;
  const voiced = scoutVoice(t);
  const formats = (['singles', 'doubles'] as const)
    .map((f) => (p[f] ? formatView(p[f], f, t, voiced) : null))
    .filter((x): x is ScoutFormat => x !== null && x.played > 0)
    .sort((a, b) => b.played - a.played);
  const history = p.history ?? [];
  const count = p.history_count ?? history.length;
  return {
    id: p.id,
    first: p.first_name,
    surname: p.surname,
    sub: [
      PLAYER_LEVEL_SHOWN && p.level_tier != null ? `${t.level.label} ${levelNumber(p.level_tier)}` : null,
      p.area_id ? areas[p.area_id] ?? null : null,
      p.hand ? s.hands[p.hand] : null,
    ]
      .filter(Boolean)
      .join(' · '),
    form: p.form10 && p.form10.length > 0 ? p.form10 : p.form,
    year: fmt(s.year, { w: p.year.w, l: p.year.l }),
    h2h: {
      record: met ? `${p.h2h.w}-${p.h2h.l}` : null,
      // the last meeting from my side, with the games when they are known
      line: !met
        ? s.h2hNone
        : lastMeeting
          ? fmt(lastMeeting.won ? s.lastWon : s.lastLost, { score: sideScore(lastMeeting, lastMeeting.won, t) }).replace(' .', '.')
          : last
            ? fmt(last.won ? s.lastWon : s.lastLost, { score: last.score ?? '' }).replace(' .', '.')
            : s.h2hNone,
      count: meetings.length > 1 ? plural(s.meetings, meetings.length) : null,
      meetings: meetings.map((m) => ({
        key: m.match_id,
        won: m.won,
        score: sideScore(m, m.won, t),
        against: '',
        partner: null,
        meta: [day(m.starts_at, now, t), m.tournament, roundLabel(m.round, t)].filter(Boolean).join(' · '),
      })),
    },
    deciding: record(p.deciding, t),
    tiebreaks: record(p.tiebreaks, t),
    known: record(p.known, t),
    common: p.common.map((c) => ({ id: c.id, name: fullName(c), me: record(c.me, t), them: record(c.them, t) })),
    formats,
    path: (p.path ?? []).map((m) => ({
      key: m.match_id,
      won: m.won,
      score: sideScore(m, m.won, t),
      against: people(m.opponents),
      partner: null,
      meta: [roundLabel(m.round, t), day(m.starts_at, now, t)].filter(Boolean).join(' · '),
    })),
    traits: (p.traits ?? []).map((x) => ({ id: x.id, label: x.label_el[nameGender(p.first_name, p.gender)], count: x.count })),
    history: history.map((m) => ({
      key: m.match_id,
      won: m.won,
      score: sideScore(m, m.won, t),
      against: people(m.opponents),
      partner: partnerLine(m.partner, t),
      meta: [day(m.starts_at, now, t), m.tournament, categoryLabel(m.level, m.discipline, t), roundLabel(m.round, t)].filter(Boolean).join(' · '),
    })),
    historyCap: count > history.length ? fmt(s.historyCap, { shown: history.length, n: count }) : null,
  };
}
