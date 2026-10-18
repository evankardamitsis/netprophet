import type { MatchStatsMore, MatchStatsPeriod, MyMatchStats } from '@netprophet/db';

/** Sample «Τα στατιστικά σου» for mock mode and the dev guest: your matches, never votes. */

const pad = (n: number) => String(n).padStart(2, '0');

function months(now: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}

const person = (id: string, first_name: string, surname: string, gender: 'm' | 'f' = 'm') => ({ player_id: id, first_name, surname, gender });

function singlesMore(now: Date): MatchStatsMore {
  const ms = months(now, 6);
  return {
    walkovers: { won: 1, lost: 0 },
    retired: { won: 1, lost: 0 },
    runs: { current: 2, best: 4 },
    sets: { won: 31, lost: 18, pct: 63 },
    games: { won: 228, lost: 181, pct: 56, matches: 19 },
    tiebreaks: { played: 7, won: 5 },
    super_tiebreaks: { played: 2, won: 1 },
    deciding: { played: 6, won: 4 },
    best_of: 3,
    first_set_lost: { played: 7, won: 3 },
    first_set_won: { played: 15, won: 13 },
    straight: { won: 10, lost: 3 },
    kinds: { tournament: { won: 11, lost: 5 }, friendly: { won: 5, lost: 1 } },
    by_surface: [
      { key: 'clay', won: 9, lost: 3 },
      { key: 'hard', won: 2, lost: 2 },
    ],
    by_category: [{ key: 'Ανδρών Β', won: 8, lost: 4 }],
    by_round: [
      { key: 'round16', won: 4, lost: 1 },
      { key: 'quarter', won: 3, lost: 2 },
      { key: 'semi', won: 2, lost: 1 },
      { key: 'final', won: 1, lost: 1 },
    ],
    by_month: ms.map((m, i) => ({ month: m, won: [2, 3, 1, 4, 3, 3][i]!, lost: [1, 0, 2, 1, 1, 1][i]! })),
    opponents: [
      { ...person('mock-o1', 'Γιάννης', 'Πράτσας'), played: 4, won: 3, lost: 1 },
      { ...person('mock-o2', 'Νίκος', 'Ροδίτης'), played: 3, won: 1, lost: 2 },
      { ...person('mock-o3', 'Άρης', 'Μελάς'), played: 2, won: 2, lost: 0 },
    ],
    partners: null,
    best_wins: [
      {
        match_id: 'mock-win',
        starts_at: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
        sets: [{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 2 }],
        score_summary: '2-0',
        retired: false,
        round: 'final',
        opponents: [person('mock-o2', 'Νίκος', 'Ροδίτης')],
        partners: [],
        tournament: 'Open Γλυφάδας',
      },
    ],
    tournaments: {
      count: 3,
      list: [
        { tournament_id: 'mock-t1', name: 'Open Γλυφάδας', starts_on: `${now.getFullYear()}-09-20`, played: 5, won: 5, lost: 0, last_round: 'final', last_won: true },
        { tournament_id: 'mock-t2', name: 'Κύπελλο Φθινοπώρου', starts_on: `${now.getFullYear()}-08-02`, played: 4, won: 3, lost: 1, last_round: 'semi', last_won: false },
        { tournament_id: 'mock-t3', name: 'Ανοιξιάτικο', starts_on: `${now.getFullYear()}-04-11`, played: 2, won: 1, lost: 1, last_round: 'round16', last_won: false },
      ],
    },
  };
}

function doublesMore(): MatchStatsMore {
  return {
    walkovers: { won: 0, lost: 0 },
    retired: { won: 0, lost: 0 },
    runs: { current: 1, best: 2 },
    sets: { won: 9, lost: 7, pct: 56 },
    games: null,
    tiebreaks: null,
    super_tiebreaks: null,
    deciding: { played: 3, won: 2 },
    best_of: 3,
    first_set_lost: null,
    first_set_won: null,
    straight: { won: 2, lost: 1 },
    kinds: { tournament: { won: 1, lost: 1 }, friendly: { won: 3, lost: 1 } },
    by_surface: [],
    by_category: [],
    by_round: [],
    by_month: [],
    opponents: [{ ...person('mock-o4', 'Κώστας', 'Λιάπης'), played: 2, won: 1, lost: 1 }],
    partners: [{ ...person('mock-p1', 'Πέτρος', 'Δρόσος'), played: 4, won: 3, lost: 1 }],
    best_wins: [],
    tournaments: { count: 0, list: [] },
  };
}

export function mockMatchStats(now: Date, pro: boolean, period: MatchStatsPeriod): MyMatchStats {
  return {
    period,
    from: null,
    pro,
    has_player: true,
    sport: 'tennis',
    total: { played: 28, won: 20, lost: 8, win_pct: 71 },
    singles: { played: 22, won: 16, lost: 6, win_pct: 73, more: pro ? singlesMore(now) : null },
    doubles: { played: 6, won: 4, lost: 2, win_pct: 67, more: pro ? doublesMore() : null },
  };
}
