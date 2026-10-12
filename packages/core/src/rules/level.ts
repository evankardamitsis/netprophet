/**
 * Level algorithm v1 (docs/v2/level-algorithm.md): a full recompute from the start values and the counting matches,
 * oldest first. Elo-style moves with a K that falls over a player's first matches; the crowd's accuracy-weighted vote
 * split counts as a softer second result. Pure and deterministic; core.level_compute (SQL) runs the same vectors.
 */

export interface LevelConfig {
  /** start value without an initial level */
  defaultLevel: number;
  min: number;
  max: number;
  /** rating gap that gives e:1 odds: half a level at 0.6 wins about 70% */
  scale: number;
  kStart: number;
  kEnd: number;
  /** matches over which K falls from kStart to kEnd */
  kMatches: number;
  /** a 2-1 (or retired) win scores this, a 2-0 scores 1 */
  twoOneScore: number;
  crowdWeight: number;
  crowdMinVotes: number;
  pendingMatches: number;
  pendingVotes: number;
}

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  defaultLevel: 3,
  min: 1,
  max: 7,
  scale: 0.6,
  kStart: 0.4,
  kEnd: 0.1,
  kMatches: 10,
  twoOneScore: 0.85,
  crowdWeight: 0.25,
  crowdMinVotes: 10,
  pendingMatches: 3,
  pendingVotes: 10,
};

export interface LevelMatch {
  id: string;
  /** side 1's player ids, side 2's */
  sides: [string[], string[]];
  winner: 1 | 2;
  /** sets the winner lost (0 for 2-0) */
  setsLost: number;
  retired?: boolean;
  /** votes cast, and each side's accuracy-weighted total; null when nobody voted */
  crowd: { votes: number; w1: number; w2: number } | null;
}

export interface LevelInput {
  config?: Partial<LevelConfig>;
  players: { id: string; initial: number | null }[];
  /** counting matches only (confirmed, counts_for_levels, not walkovers), oldest first */
  matches: LevelMatch[];
}

export interface LevelResult {
  id: string;
  /** 4 decimals */
  value: number;
  /** the shown whole number; null while pending */
  tier: number | null;
  status: 'pending' | 'active';
  matches: number;
  votes: number;
  /** % of wins where the crowd (enough votes) picked the other side; null without such wins */
  upsetIndex: number | null;
}

/** a voter's weight: right calls over resolved votes, pulled towards 50% (Laplace) */
export const voterAccuracy = (right: number, resolved: number): number => (right + 1) / (resolved + 2);

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function recomputeLevels(input: LevelInput): LevelResult[] {
  const c: LevelConfig = { ...DEFAULT_LEVEL_CONFIG, ...input.config };
  const st = new Map<string, { r: number; init: boolean; n: number; votes: number; crowdWins: number; underdogWins: number }>();
  const get = (id: string) => {
    let s = st.get(id);
    if (!s) {
      s = { r: c.defaultLevel, init: false, n: 0, votes: 0, crowdWins: 0, underdogWins: 0 };
      st.set(id, s);
    }
    return s;
  };
  for (const p of input.players) {
    const s = get(p.id);
    if (p.initial !== null && p.initial !== undefined) {
      s.r = p.initial;
      s.init = true;
    }
  }
  const k = (n: number) => c.kEnd + (c.kStart - c.kEnd) * Math.max(0, 1 - n / c.kMatches);
  const clamp = (x: number) => Math.min(c.max, Math.max(c.min, x));

  for (const m of input.matches) {
    const side = (i: 0 | 1) => m.sides[i].map(get);
    const s1 = side(0);
    const s2 = side(1);
    const avg = (xs: { r: number }[]) => xs.reduce((a, x) => a + x.r, 0) / xs.length;
    const e1 = 1 / (1 + Math.exp(-(avg(s1) - avg(s2)) / c.scale));
    const win = m.setsLost === 0 && !m.retired ? 1 : c.twoOneScore;
    const score1 = m.winner === 1 ? win : 1 - win;
    const crowd = m.crowd && m.crowd.votes >= c.crowdMinVotes && m.crowd.w1 + m.crowd.w2 > 0 ? m.crowd.w1 / (m.crowd.w1 + m.crowd.w2) : null;

    // all moves from the ratings before this match
    const moves: [typeof s1[number], number][] = [];
    for (const [i, players] of [s1, s2].entries()) {
      const e = i === 0 ? e1 : 1 - e1;
      const s = i === 0 ? score1 : 1 - score1;
      const cr = crowd === null ? null : i === 0 ? crowd : 1 - crowd;
      for (const p of players) {
        const kk = k(p.n);
        moves.push([p, kk * (s - e) + (cr === null ? 0 : c.crowdWeight * kk * (cr - e))]);
      }
    }
    for (const [p, d] of moves) p.r = clamp(p.r + d);
    for (const [i, players] of [s1, s2].entries()) {
      const won = m.winner === i + 1;
      const share = crowd === null ? null : i === 0 ? crowd : 1 - crowd;
      for (const p of players) {
        p.n += 1;
        p.votes += m.crowd?.votes ?? 0;
        if (won && share !== null) {
          p.crowdWins += 1;
          if (share < 0.5) p.underdogWins += 1;
        }
      }
    }
  }

  return [...st.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, s]) => {
      const active = s.init || s.n >= c.pendingMatches || s.votes >= c.pendingVotes;
      const value = round4(s.r);
      return {
        id,
        value,
        tier: active ? Math.min(c.max, Math.max(c.min, Math.round(value))) : null,
        status: active ? 'active' : 'pending',
        matches: s.n,
        votes: s.votes,
        upsetIndex: s.crowdWins > 0 ? Math.round((10000 * s.underdogWins) / s.crowdWins) / 100 : null,
      };
    });
}

/** ↑ = ↓ against the value a week ago; no history yet is = */
export function levelDirection(now: number, weekAgo: number | null, threshold = 0.1): 'up' | 'same' | 'down' {
  if (weekAgo === null) return 'same';
  const d = round4(now - weekAgo);
  return d >= threshold ? 'up' : d <= -threshold ? 'down' : 'same';
}
