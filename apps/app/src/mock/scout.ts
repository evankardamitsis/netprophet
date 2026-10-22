import type { Scout, ScoutMatch, StatsPerson } from '@netprophet/db';
import { mockMatchStats } from './matchStats';

/** «Ο αντίπαλος πριν το ματς» for the guest: Γιάννης Πράτσας, lefty, in form; every section filled. */
export function mockScout(matchId: string, now: Date = new Date()): Scout {
  const ref = (id: string, first: string, surname: string) => ({ id, first_name: first, surname, gender: 'm' as const, name_forms: {} });
  const person = (id: string, first: string, surname: string): StatsPerson => ({ player_id: id, first_name: first, surname, gender: 'm' });
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const stats = mockMatchStats(now, true, 'all');
  const match = (i: number, over: Partial<ScoutMatch>): ScoutMatch => ({
    match_id: `mock-h${i}`,
    starts_at: ago(3 + i * 6),
    format: 'singles',
    won: true,
    sets: [{ w: 6, l: 3 }, { w: 6, l: 4 }],
    score: '2-0',
    retired: false,
    walkover: false,
    tournament: 'Open Γλυφάδας',
    round: null,
    level: 'Μ 40+',
    discipline: 'MS',
    surface: 'hard',
    partner: [],
    opponents: [person('mock-o1', 'Κώστας', 'Λιάπης')],
    ...over,
  });
  return {
    match_id: matchId,
    starts_at: new Date(now.getTime() + 3 * 3_600_000).toISOString(),
    format: 'singles',
    tournament: 'Open Γλυφάδας',
    round: 'semi',
    level: 'Μ 40+',
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
        form10: ['L', 'W', 'W', 'L', 'W', 'W', 'L', 'W', 'W', 'W'],
        hand: 'L',
        year: { w: 11, l: 4 },
        deciding: { w: 5, l: 1 },
        tiebreaks: { w: 7, l: 3 },
        h2h: {
          w: 1,
          l: 2,
          last: { won: false, score: '2-1', starts_at: ago(40) },
          meetings: [
            { match_id: 'mock-m1', starts_at: ago(40), format: 'singles', won: false, sets: [{ w: 6, l: 4 }, { w: 3, l: 6 }, { w: 10, l: 7, stb: true }], score: '2-1', retired: false, walkover: false, tournament: 'Κύπελλο Βούλας', round: 'quarter' },
            { match_id: 'mock-m2', starts_at: ago(120), format: 'singles', won: true, sets: [{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 2 }], score: '2-0', retired: false, walkover: false, tournament: null, round: null },
            { match_id: 'mock-m3', starts_at: ago(400), format: 'doubles', won: false, sets: [], score: '2-0', retired: false, walkover: false, tournament: null, round: null },
          ],
        },
        common: [
          { ...ref('nik', 'Νίκος', 'Ροδίτης'), me: { w: 2, l: 1 }, them: { w: 0, l: 2 } },
          { ...ref('ste', 'Δημήτρης', 'Γκότσης'), me: { w: 0, l: 1 }, them: { w: 1, l: 0 } },
        ],
        known: { w: 6, l: 3 },
        singles: stats.singles,
        doubles: stats.doubles,
        history_count: 28,
        history: [
          match(0, { round: 'quarter' }),
          match(1, { round: 'round16', sets: [{ w: 6, l: 7, tb: [7, 5] }, { w: 6, l: 4 }, { w: 10, l: 6, stb: true }], score: '2-1' }),
          match(2, { won: false, tournament: null, level: null, discipline: null, surface: null, sets: [], score: '2-0', opponents: [person('nik', 'Νίκος', 'Ροδίτης')] }),
          match(3, { format: 'doubles', discipline: 'MD', partner: [person('mock-p1', 'Πέτρος', 'Δρόσος')], opponents: [person('mock-o2', 'Άρης', 'Μανός'), person('mock-o3', 'Λευτέρης', 'Ζήσης')] }),
        ],
        path: [
          { match_id: 'mock-h1', starts_at: ago(9), round: 'round16', won: true, sets: [{ w: 6, l: 7, tb: [7, 5] }, { w: 6, l: 4 }, { w: 10, l: 6, stb: true }], score: '2-1', retired: false, walkover: false, opponents: [person('mock-o1', 'Κώστας', 'Λιάπης')] },
          { match_id: 'mock-h0', starts_at: ago(3), round: 'quarter', won: true, sets: [{ w: 6, l: 3 }, { w: 6, l: 4 }], score: '2-0', retired: false, walkover: false, opponents: [person('mock-o1', 'Κώστας', 'Λιάπης')] },
        ],
        traits: [
          { id: 'mock-t1', label_el: { m: 'Κόβει πολύ την μπάλα', f: 'Κόβει πολύ την μπάλα' }, label_en: 'Lots of slice', count: 9 },
          { id: 'mock-t2', label_el: { m: 'Γρήγορα πόδια', f: 'Γρήγορα πόδια' }, label_en: 'Quick feet', count: 6 },
          { id: 'mock-t3', label_el: { m: 'Αργεί να ζεσταθεί', f: 'Αργεί να ζεσταθεί' }, label_en: 'Slow to warm up', count: 4 },
        ],
      },
    ],
  };
}
