import type { MySeason, WinCard } from '@netprophet/db';

/** Sample «Η σεζόν σου» and win cards for mock mode and the dev guest. */

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** the sample win that is the month's free card (also a row on the sample Αποτελέσματα) */
export const MOCK_FREE_WIN = 'mock-win';

export function mockSeason(now: Date, pro: boolean, month: string | null): MySeason {
  const m = month ?? keyOf(now);
  const first = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1);
  const prev = keyOf(new Date(first.getFullYear(), first.getMonth() - 1, 1));
  const base = { played: 7, won: 5, lost: 2, points: 340 };
  return {
    month: m,
    prev_month: prev,
    pro,
    has_player: true,
    now: pro
      ? {
          ...base,
          sets_won: 11,
          sets_lost: 6,
          win_run: 3,
          deciding: { w: 2, l: 1 },
          tiebreaks: { w: 3, l: 1 },
          tournaments: 2,
          best_streak: 6,
          best_win: {
            match_id: MOCK_FREE_WIN,
            starts_at: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
            sets: [{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 2 }],
            score_summary: '2-0',
            opponents: [{ first_name: 'Γιάννης', surname: 'Πράτσας', gender: 'm' }],
            tournament: 'Open Γλυφάδας',
          },
          ladder: { tier: 'silver', position: 4, size: 20, closed: false },
        }
      : base,
    prev: pro
      ? { played: 5, won: 2, lost: 3, points: 260, sets_won: 6, sets_lost: 7, win_run: 1, deciding: { w: 0, l: 2 }, tiebreaks: { w: 1, l: 2 }, tournaments: 1, best_streak: 7, best_win: null, ladder: null }
      : null,
    free_card: MOCK_FREE_WIN,
  };
}

export function mockWinCard(matchId: string, now: Date, pro: boolean): WinCard | null {
  if (!pro && matchId !== MOCK_FREE_WIN) return null;
  return {
    match_id: matchId,
    starts_at: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
    format: 'singles',
    tournament: 'Open Γλυφάδας',
    category: 'Ανδρών',
    round: 'round16',
    sets: [{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 2 }],
    score_summary: '2-0',
    retired: false,
    me: [{ first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης', gender: 'm' }],
    opponents: [{ first_name: 'Γιάννης', surname: 'Πράτσας', gender: 'm' }],
    pro,
    free: matchId === MOCK_FREE_WIN,
  };
}
