import type { BadgeRow, GetBadgesResult } from '@netprophet/db';

/** [key, counter, tier, thresholds, on_card], in the server's order (mirrors supabase-v2 m3_badges) */
const ROWS: [string, number, 0 | 1 | 2 | 3, [number, number, number], boolean][] = [
  ['first_serve', 19, 2, [1, 5, 25], true],
  ['nice_player', 6, 2, [1, 5, 20], false],
  ['gentleman', 7, 1, [3, 15, 50], true],
  ['beloved', 9, 1, [3, 15, 50], false],
  ['club_oracle', 21, 1, [5, 25, 100], false],
  ['upset', 2, 1, [1, 5, 15], false],
  ['in_a_row', 9, 2, [5, 7, 10], true],
  ['influencer', 0, 0, [1, 3, 10], false],
  ['whole_week', 2, 1, [1, 4, 12], false],
  ['doubles_player', 6, 2, [1, 5, 15], false],
  ['variety', 12, 1, [5, 15, 40], true],
  ['steady', 3, 0, [4, 12, 26], false],
  ['many_votes', 140, 2, [25, 100, 500], false],
  ['generous', 0, 0, [1, 5, 15], false],
  ['season_veteran', 0, 0, [1, 2, 4], false],
  ['month_top', 0, 0, [1, 3, 10], false],
];

/** what a returning player sees (mock mode and the dev guest) */
export function mockBadges(): GetBadgesResult {
  const badges: BadgeRow[] = ROWS.map(([key, counter, tier, thresholds, on_card]) => ({ key, counter, tier, thresholds, on_card }));
  return { badges, worn: 'in_a_row' };
}
