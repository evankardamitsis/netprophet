import type { FeedPlayer, ResultRow, SetScore, Side } from '@netprophet/db';

/** Sample Αποτελέσματα for mock mode and the dev guest, from the prototype's own data (V2.dc.html). */

const P = (id: string, first: string, surname: string): FeedPlayer => ({
  id,
  first_name: first,
  surname,
  photo_path: null,
  area_id: null,
  level_tier: null,
  level_direction: null,
});

const kat = P('kat', 'Κατερίνα', 'Λαζάρου');
const ann = P('ann', 'Άννα', 'Μάνου');
const pav = P('pav', 'Ηλίας', 'Μέμμος');
const ale = P('ale', 'Γιάννης', 'Πράτσας');
const nik = P('nik', 'Νίκος', 'Ροδίτης');
const dim = P('dim', 'Αντρέι', 'Ντίρζου');
const ste = P('ste', 'Δημήτρης', 'Γκότσης');
const kos = P('kos', 'Μιχάλης', 'Ορφανίδης');
const gio = P('gio', 'Γιώργος', 'Δεσύπρης');
const tas = P('tas', 'Γιώργος', 'Μέμμος');
const lef = P('lef', 'Γιώργος', 'Χαμάμης');
const man = P('man', 'Μάνος', 'Γκίκας');
const tho = P('tho', 'Θοδωρής', 'Νάκος');

const S = (w: number, l: number, extra: Partial<SetScore> = {}): SetScore => ({ w, l, ...extra });

interface Seed {
  id: string;
  daysAgo: number;
  hour: number;
  tournament?: string;
  round?: string;
  w: FeedPlayer[];
  l: FeedPlayer[];
  sets: SetScore[];
  /** votes for the winner, for the loser */
  votes: [number, number];
  upset?: boolean;
  called?: number;
}

const SEEDS: Seed[] = [
  { id: 'r0', daysAgo: 0, hour: 19, w: [kat], l: [ann], sets: [S(6, 3), S(6, 4)], votes: [11, 9] },
  { id: 'r1', daysAgo: 1, hour: 20, tournament: 'Open Γλυφάδας', round: 'quarter', w: [pav], l: [ale], sets: [S(4, 6), S(6, 3), S(7, 5)], votes: [9, 20], upset: true, called: 30 },
  { id: 'r2', daysAgo: 1, hour: 19, tournament: 'Open Γλυφάδας', round: 'quarter', w: [nik], l: [dim], sets: [S(6, 2), S(6, 4)], votes: [20, 7], called: 10 },
  { id: 'r3', daysAgo: 1, hour: 18, tournament: 'Open Γλυφάδας', round: 'quarter', w: [ste], l: [kos], sets: [S(6, 4), S(6, 7, { tb: [5, 7] }), S(10, 8, { stb: true })], votes: [22, 5] },
  { id: 'r5', daysAgo: 1, hour: 17, w: [gio, pav], l: [tas, lef], sets: [S(6, 3), S(4, 6), S(6, 2)], votes: [7, 5] },
  { id: 'r4', daysAgo: 2, hour: 19, w: [gio], l: [tas], sets: [S(6, 1), S(6, 3)], votes: [10, 6] },
  { id: 'r6', daysAgo: 2, hour: 18, w: [man], l: [tho], sets: [S(7, 5), S(6, 4)], votes: [8, 5] },
];

export function mockResults(now: Date): ResultRow[] {
  return SEEDS.map((s) => {
    const at = new Date(now);
    at.setDate(at.getDate() - s.daysAgo);
    at.setHours(s.hour, 0, 0, 0);
    const winner: Side = 1;
    return {
      match_id: s.id,
      sport_id: 'tennis',
      format: s.w.length > 1 ? 'doubles' : 'singles',
      starts_at: at.toISOString(),
      round: s.round ?? null,
      venue: null,
      area_id: null,
      tournament: s.tournament ?? null,
      sides: [
        { side: 1, players: s.w },
        { side: 2, players: s.l },
      ],
      winner_side: winner,
      sets: s.sets,
      retired: false,
      walkover: false,
      split: { side1: s.votes[0], side2: s.votes[1], total: s.votes[0] + s.votes[1] },
      upset: s.upset ?? false,
      my: s.called ? { pick: winner, outcome: 'correct', points: s.called } : null,
    };
  });
}
