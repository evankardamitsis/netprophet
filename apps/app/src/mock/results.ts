import type { FeedPlayer, Reactions, ResultRow, SetScore, Side } from '@netprophet/db';

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
/** the guest's own player (as in mock/me), so a sample win can have its card */
export const MOCK_ME_PLAYER = 'me';
const me = P(MOCK_ME_PLAYER, 'Βαγγέλης', 'Καρδαμίτσης');

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
  /** the prototype's reaction counts: [first chip, second chip] */
  r?: [number, number];
  /** «Πες κάτι στον …» */
  thank?: FeedPlayer;
}

/** the chip pairs by the database's rule (core.reaction_pair): 2-0 Πάμε / Περίπατος, else Τι ματς / Κρίμα */
const PAIRS = {
  close: [{ key: 'what_a_match', label: 'Τι ματς' }, { key: 'pity', label: 'Κρίμα' }],
  clean: [{ key: 'lets_go', label: 'Πάμε' }, { key: 'stroll', label: 'Περίπατος' }],
};

function reactions(s: Seed): Reactions {
  const options = s.sets.some((x) => x.l > x.w) ? PAIRS.close : PAIRS.clean;
  const [a, b] = s.r ?? [0, 0];
  const counts: Record<string, number> = {};
  if (a) counts[options[0]!.key] = a;
  if (b) counts[options[1]!.key] = b;
  return { options, counts, mine: null };
}

const SEEDS: Seed[] = [
  { id: 'r0', daysAgo: 0, hour: 19, w: [kat], l: [ann], sets: [S(6, 3), S(6, 4)], votes: [11, 9], r: [5, 2], thank: kat },
  { id: 'r1', daysAgo: 1, hour: 20, tournament: 'Open Γλυφάδας', round: 'quarter', w: [pav], l: [ale], sets: [S(4, 6), S(6, 3), S(7, 5)], votes: [9, 20], upset: true, called: 30, r: [6, 3], thank: pav },
  { id: 'r2', daysAgo: 1, hour: 19, tournament: 'Open Γλυφάδας', round: 'quarter', w: [nik], l: [dim], sets: [S(6, 2), S(6, 4)], votes: [20, 7], called: 10, r: [3, 2] },
  { id: 'r3', daysAgo: 1, hour: 18, tournament: 'Open Γλυφάδας', round: 'quarter', w: [ste], l: [kos], sets: [S(6, 4), S(6, 7, { tb: [5, 7] }), S(10, 8, { stb: true })], votes: [22, 5] },
  { id: 'r5', daysAgo: 1, hour: 17, w: [gio, pav], l: [tas, lef], sets: [S(6, 3), S(4, 6), S(6, 2)], votes: [7, 5] },
  { id: 'r4', daysAgo: 2, hour: 19, w: [gio], l: [tas], sets: [S(6, 1), S(6, 3)], votes: [10, 6] },
  { id: 'r6', daysAgo: 2, hour: 18, w: [man], l: [tho], sets: [S(7, 5), S(6, 4)], votes: [8, 5] },
  { id: 'mock-win', daysAgo: 3, hour: 19, tournament: 'Open Γλυφάδας', round: 'round16', w: [me], l: [ale], sets: [S(7, 6, { tb: [7, 4] }), S(6, 2)], votes: [6, 9] },
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
      reactions: reactions(s),
      kudo_to: s.thank ? { player_id: s.thank.id, first_name: s.thank.first_name, gender: null } : null,
    };
  });
}
