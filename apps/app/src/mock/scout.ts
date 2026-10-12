import type { Scout } from '@netprophet/db';

/** Sample scouting for the dev guest: your next match against Γιάννης Πράτσας (mock players). */
export function mockScout(matchId: string, now: Date = new Date()): Scout {
  const ref = (id: string, first: string, surname: string) => ({ id, first_name: first, surname, gender: 'm' as const, name_forms: {} });
  return {
    match_id: matchId,
    starts_at: new Date(now.getTime() + 3 * 3_600_000).toISOString(),
    format: 'singles',
    partner: [],
    opponents: [
      {
        ...ref('pra', 'Γιάννης', 'Πράτσας'),
        area_id: 'glyfada',
        level_tier: 5,
        level_direction: 'up',
        is_followed: false,
        relation: null,
        form: ['W', 'W', 'L', 'W', 'W'],
        hand: 'L',
        year: { w: 11, l: 4 },
        deciding: { w: 5, l: 1 },
        tiebreaks: { w: 7, l: 3 },
        h2h: { w: 1, l: 2, last: { won: false, score: '1-2', starts_at: new Date(now.getTime() - 40 * 86_400_000).toISOString() } },
        common: [
          { ...ref('nik', 'Νίκος', 'Ροδίτης'), me: { w: 2, l: 1 }, them: { w: 0, l: 2 } },
          { ...ref('ste', 'Δημήτρης', 'Γκότσης'), me: { w: 0, l: 1 }, them: { w: 1, l: 0 } },
        ],
        known: { w: 6, l: 3 },
      },
    ],
  };
}
