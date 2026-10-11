import type { PlayerCard, PlayerProfile, PlayerRef, PlayersHome } from '@netprophet/db';

/** Sample Παίκτες for mock mode and the dev guest, from the prototype's own data (V2.dc.html). */

type Form = ('W' | 'L')[];
const form = (s: string): Form => s.split('').map((c) => (c === 'Ν' ? 'W' : 'L'));

interface Seed {
  id: string;
  first: string;
  surname: string;
  gender: 'm' | 'f';
  area: string;
  level: number;
  dir: 'up' | 'same' | 'down';
  form: string;
  record: [number, number];
  friend?: boolean;
}

const SEEDS: Seed[] = [
  { id: 'nik', first: 'Νίκος', surname: 'Ροδίτης', gender: 'm', area: 'glyfada', level: 5, dir: 'up', form: 'ΝΝΗΝΝ', record: [14, 6], friend: true },
  { id: 'gio', first: 'Γιώργος', surname: 'Δεσύπρης', gender: 'm', area: 'voula', level: 4, dir: 'same', form: 'ΗΝΝΗΝ', record: [9, 7], friend: true },
  { id: 'kat', first: 'Κατερίνα', surname: 'Λαζάρου', gender: 'f', area: 'kifisia', level: 4, dir: 'same', form: 'ΝΗΝΝΗ', record: [11, 8] },
  { id: 'ste', first: 'Δημήτρης', surname: 'Γκότσης', gender: 'm', area: 'glyfada', level: 5, dir: 'up', form: 'ΝΝΝΗΝ', record: [16, 5] },
  { id: 'ale', first: 'Γιάννης', surname: 'Πράτσας', gender: 'm', area: 'glyfada', level: 4, dir: 'down', form: 'ΗΗΝΗΝ', record: [8, 10] },
  { id: 'pav', first: 'Ηλίας', surname: 'Μέμμος', gender: 'm', area: 'vari', level: 3, dir: 'up', form: 'ΝΗΝΝΝ', record: [7, 4] },
];

export const MOCK_AREAS: Record<string, string> = { glyfada: 'Γλυφάδα', voula: 'Βούλα', kifisia: 'Κηφισιά', vari: 'Βάρη' };

const card = (s: Seed): PlayerCard => ({
  id: s.id,
  first_name: s.first,
  surname: s.surname,
  gender: s.gender,
  name_forms: {},
  area_id: s.area,
  level_tier: s.level,
  level_direction: s.dir,
  is_followed: !!s.friend,
  relation: s.friend ? 'friend' : null,
  form: form(s.form),
});

const ref = (id: string): PlayerRef => {
  const s = SEEDS.find((x) => x.id === id)!;
  return { id, first_name: s.first, surname: s.surname, gender: s.gender, name_forms: {} };
};

export function mockPlayersHome(): PlayersHome {
  return { total_players: 1632, players: SEEDS.map(card) };
}

export function mockFindPlayers(query: string): PlayerCard[] {
  const q = query.trim().toLowerCase();
  return SEEDS.filter((s) => `${s.first} ${s.surname}`.toLowerCase().includes(q)).map(card);
}

export function mockPlayer(id: string, now: Date): PlayerProfile | null {
  const s = SEEDS.find((x) => x.id === id);
  if (!s) return null;
  const others = SEEDS.filter((x) => x.id !== id);
  const day = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  return {
    ...card(s),
    is_me: false,
    record_year: { w: s.record[0], l: s.record[1] },
    last_matches: [1, 2, 4].map((ago, i) => ({
      match_id: `${id}-m${i}`,
      starts_at: day(ago),
      format: 'singles',
      won: s.form[s.form.length - 1 - i] === 'Ν',
      score: i === 1 ? '2-1' : '2-0',
      retired: false,
      walkover: false,
      partner: [],
      opponents: [ref(others[i % others.length]!.id)],
    })),
    next_match: {
      match_id: `${id}-next`,
      starts_at: new Date(now.getTime() + 3 * 3_600_000).toISOString(),
      format: 'singles',
      partner: [],
      opponents: [ref(others[3 % others.length]!.id)],
    },
  };
}
