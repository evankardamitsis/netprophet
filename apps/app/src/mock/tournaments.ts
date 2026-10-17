import { addDays, dayKey, localParts, toInstant } from '@netprophet/core';
import type { DrawMatchRow, TournamentDraw, FeedPlayer, SetScore, GetTournamentResult, GetTournamentsResult, TournamentMatch, UpcomingTournament, UpcomingTournamentsResult } from '@netprophet/db';

/**
 * Sample tournaments for mock mode and the dev guest: one on now (you are in it), one coming, one just finished.
 * Dates are relative to today so the screen always has a «Σήμερα».
 */
const P = (id: string, first: string, surname: string): FeedPlayer => ({
  id, first_name: first, surname, photo_path: null, area_id: 'glyfada', level_tier: 4, level_direction: 'same',
});
const ME = P('me', 'Βαγγέλης', 'Καρδαμίτσης');
const NIK = P('nik', 'Νίκος', 'Ροδίτης');
const GIO = P('gio', 'Γιώργος', 'Δεσύπρης');
const ALE = P('ale', 'Γιάννης', 'Πράτσας');
const PAV = P('pav', 'Ηλίας', 'Μέμμος');
const STE = P('ste', 'Δημήτρης', 'Γκότσης');

/** an Athens day at a given clock time, as an instant (Athens is UTC+3 in summer, UTC+2 in winter) */
function at(day: string, hour: number, minute: number): string {
  const [y, m, d] = day.split('-').map(Number);
  for (const off of [3, 2]) {
    const iso = toInstant(Date.UTC(y!, m! - 1, d!, hour - off, minute));
    if (localParts(iso).hour === hour) return iso;
  }
  return toInstant(Date.UTC(y!, m! - 1, d!, hour - 2, minute));
}

function match(id: string, day: string, hour: number, minute: number, a: FeedPlayer, b: FeedPlayer, win: 1 | 2 | null, sets: SetScore[], level = 'Μ 40+'): TournamentMatch {
  return {
    match_id: id, starts_at: at(day, hour, minute), format: 'singles', status: win ? 'finished' : 'scheduled',
    level, discipline: 'MS', round: null,
    sides: [{ side: 1, players: [a] }, { side: 2, players: [b] }],
    winner_side: win, sets: win ? sets : null, retired: false, walkover: false,
    club: 'Γήπεδα Γλυφάδας', court: hour < 15 ? 'Γήπεδο 1' : 'Γήπεδο 2', surface: 'clay',
  };
}

export function mockTournaments(pro: boolean, now: Date = new Date()): GetTournamentsResult {
  const today = dayKey(now.toISOString());
  const mine = [
    { ...match('tm-1', today, 18, 30, ME, NIK, null, []), tournament_id: 'tour-open', tournament: 'Open Γλυφάδας' },
    { ...match('tm-2', addDays(today, 2), 10, 0, ME, GIO, null, [], 'Μ 40+'), tournament_id: 'tour-open', tournament: 'Open Γλυφάδας' },
  ];
  return {
    pro,
    items: [
      {
        id: 'tour-open', name: 'Open Γλυφάδας', venue: 'Γήπεδα Γλυφάδας', area_id: 'glyfada', surface: 'hard',
        starts_on: addDays(today, -2), ends_on: addDays(today, 3), entry_deadline: null, level_min: 3, level_max: 6,
        state: 'ongoing', draws: 2, matches: 14, today: 3, in_it: true,
      },
      {
        id: 'tour-voula', name: 'Κύπελλο Βούλας', venue: 'Ο.Α. Βούλας', area_id: 'voula', surface: 'clay',
        starts_on: addDays(today, 5), ends_on: addDays(today, 7), entry_deadline: addDays(today, 3), level_min: 2, level_max: 5,
        state: 'upcoming', draws: 1, matches: 0, today: 0, in_it: false,
      },
      {
        id: 'tour-vari', name: 'Φθινοπωρινό Βάρης', venue: 'Γήπεδα Βάρης', area_id: 'vari', surface: 'clay',
        starts_on: addDays(today, -9), ends_on: addDays(today, -4), entry_deadline: null, level_min: 3, level_max: 6,
        state: 'done', draws: 2, matches: 20, today: 0, in_it: false,
      },
    ],
    mine: pro ? mine : null,
  };
}

const bm = (round: number, slot: number, side1: string | null, side2: string | null, extra: Partial<DrawMatchRow> = {}): DrawMatchRow => ({
  round, slot, side1, side2, winner: null, bye: false, scoreRaw: '', walkover: false, retired: false, when: '', deadline: null, ...extra,
});


const SCORES = ['64 63', '62 61', '67(4) 64 10-8', '75 46 10-6', '63 64', '61 60', '76(3) 62', '64 75'];

/**
 * A knockout draw for the mock: `names` fill round one in order, `played[r]` is how many matches of round r are
 * decided (the first ones), side 1 wins unless the name is in `lose`. Later rounds fill from the winners.
 */
function knockout(tab: string, names: string[], played: number[], today: string, lose: string[] = [], seeds: Record<string, number> = {}): TournamentDraw {
  const size = names.length;
  const rounds: DrawMatchRow[][] = [];
  let field: (string | null)[] = names;
  let r = 1;
  while (field.length >= 2) {
    const row: DrawMatchRow[] = [];
    const next: (string | null)[] = [];
    for (let i = 0; i < field.length; i += 2) {
      const a = field[i] ?? null;
      const b = field[i + 1] ?? null;
      const done = i / 2 < (played[r - 1] ?? 0) && a !== null && b !== null;
      const winner: 1 | 2 | null = done ? (lose.includes(a!) ? 2 : 1) : null;
      row.push(bm(r, i / 2 + 1, a, b, done ? { winner, scoreRaw: SCORES[(i / 2 + r) % SCORES.length]! } : a !== null && b !== null ? { when: i === 0 ? 'ΣΑΒ 18.30' : '', deadline: addDays(today, r) } : { deadline: addDays(today, r + 1) }));
      next.push(winner === 1 ? a : winner === 2 ? b : null);
    }
    rounds.push(row);
    field = next;
    r += 1;
  }
  return {
    tab, title: `${tab} MAIN DRAW (${size})`, discipline: 'MS', level: tab, format: 'knockout', size, updated_at: new Date().toISOString(),
    entrants: names.map((raw, k) => ({ pos: k + 1, raw, seed: seeds[raw] ?? null, bye: false, players: [{ raw, player_id: raw.startsWith('ΚΑΡΔΑΜΙΤΣΗΣ') ? 'me' : null }] })),
    rounds,
  };
}

const SIXTEEN = [
  'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', 'ΠΑΠΑΔΟΠΟΥΛΟΣ ΑΝΤΩΝΗΣ', 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', 'ΛΑΜΠΡΙΝΟΣ ΣΤΑΘΗΣ', 'ΜΕΜΜΟΣ ΗΛΙΑΣ', 'ΓΚΟΤΣΗΣ ΔΗΜΗΤΡΗΣ', 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', 'ΒΑΣΙΛΕΙΟΥ ΠΕΤΡΟΣ',
  'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', 'ΤΣΙΑΜΗΣ ΚΩΣΤΑΣ', 'ΑΝΑΓΝΩΣΤΟΥ ΜΑΝΩΛΗΣ', 'ΚΟΝΤΟΣ ΘΑΝΟΣ', 'ΜΙΧΑΛΟΠΟΥΛΟΣ ΧΡΗΣΤΟΣ', 'ΒΛΑΧΟΣ ΣΩΤΗΡΗΣ', 'ΞΕΝΟΣ ΑΛΕΞΗΣ', 'ΖΑΧΑΡΙΟΥ ΛΕΩΝΙΔΑΣ',
];

const MD_TEAMS = [
  'ΡΟΔΙΤΗΣ ΝΙΚΟΣ / ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ / ΜΕΜΜΟΣ ΗΛΙΑΣ', 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ / ΓΚΟΤΣΗΣ ΔΗΜΗΤΡΗΣ', 'ΤΣΙΑΜΗΣ ΚΩΣΤΑΣ / ΚΟΝΤΟΣ ΘΑΝΟΣ',
  'ΛΑΜΠΡΙΝΟΣ ΣΤΑΘΗΣ / ΒΑΣΙΛΕΙΟΥ ΠΕΤΡΟΣ', 'ΞΕΝΟΣ ΑΛΕΞΗΣ / ΒΛΑΧΟΣ ΣΩΤΗΡΗΣ', 'ΑΝΑΓΝΩΣΤΟΥ ΜΑΝΩΛΗΣ / ΖΑΧΑΡΙΟΥ ΛΕΩΝΙΔΑΣ',
];

/** a group match: team a first, `winner` 1 = a */
const gm = (a: number, b: number, winner: 1 | 2, games: [number, number][]) => ({
  a, b, scoreRaw: games.map((g) => `${g[0]}${g[1]}`).join(' '), sets: games.map((g) => ({ g, tb: false })), winner, walkover: false,
});

export function mockTournament(id: string, now: Date = new Date()): GetTournamentResult | null {
  const item = mockTournaments(false, now).items.find((i) => i.id === id);
  if (!item) return null;
  const today = dayKey(now.toISOString());
  const ent = (pos: number, raw: string, seed: number | null, pid: string | null) => ({
    pos, raw, seed, bye: raw === 'ΒΥΕ', players: raw === 'ΒΥΕ' ? [] : [{ raw, player_id: pid }],
  });
  const days = id === 'tour-open'
    ? [
        {
          date: today,
          matches: [
            match('tm-0', today, 10, 0, GIO, ALE, 1, [{ w: 6, l: 4 }, { w: 6, l: 3 }]),
            match('tm-0b', today, 11, 30, PAV, STE, 2, [{ w: 6, l: 7, tb: [7, 4] }, { w: 6, l: 2 }, { w: 10, l: 8, stb: true }]),
            match('tm-1', today, 18, 30, ME, NIK, null, []),
          ],
        },
        {
          date: addDays(today, 2),
          matches: [
            { ...match('tm-2', addDays(today, 2), 10, 0, ME, GIO, null, []), moved_from: at(addDays(today, -1), 18, 30) },
            { ...match('tm-3', addDays(today, 2), 12, 0, ALE, PAV, null, []), starts_at: null, postponed: true },
          ],
        },
      ]
    : [];
  return {
    id: item.id, name: item.name, venue: item.venue, area_id: item.area_id, surface: item.surface,
    starts_on: item.starts_on, ends_on: item.ends_on, entry_deadline: item.entry_deadline, state: item.state, me: 'me',
    draws: id === 'tour-open'
      ? [
          {
            tab: 'Μ 40+', title: 'Μ 40+ MAIN DRAW (8)', discipline: 'MS', level: 'Μ 40+', format: 'knockout', size: 8, updated_at: now.toISOString(),
            entrants: [
              ent(1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', 1, 'nik'), ent(2, 'ΒΥΕ', null, null), ent(3, 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', null, 'ale'), ent(4, 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', null, 'gio'),
              ent(5, 'ΜΕΜΜΟΣ ΗΛΙΑΣ', null, 'pav'), ent(6, 'ΓΚΟΤΣΗΣ ΔΗΜΗΤΡΗΣ', 2, 'ste'), ent(7, 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', null, 'me'), ent(8, 'ΑΓΝΩΣΤΟΣ ΠΑΙΚΤΗΣ', null, null),
            ],
            rounds: [
              [
                bm(1, 1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', 'ΒΥΕ', { bye: true }),
                bm(1, 2, 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', { winner: 2, scoreRaw: '64 63' }),
                bm(1, 3, 'ΜΕΜΜΟΣ ΗΛΙΑΣ', 'ΓΚΟΤΣΗΣ ΔΗΜΗΤΡΗΣ', { winner: 1, scoreRaw: '67(4) 62 10-8' }),
                bm(1, 4, 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', 'ΑΓΝΩΣΤΟΣ ΠΑΙΚΤΗΣ', { winner: 1, scoreRaw: '61 60' }),
              ],
              [
                bm(2, 1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', { when: 'ΣΑΒ 18.30', deadline: addDays(today, 1) }),
                bm(2, 2, 'ΜΕΜΜΟΣ ΗΛΙΑΣ', 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', { deadline: addDays(today, 1) }),
              ],
              [bm(3, 1, null, null, { deadline: addDays(today, 3) })],
            ],
          },
          knockout('Μ 50+', SIXTEEN, [8, 3, 0, 0], today, ['ΠΑΠΑΔΟΠΟΥΛΟΣ ΑΝΤΩΝΗΣ', 'ΛΑΜΠΡΙΝΟΣ ΣΤΑΘΗΣ', 'ΓΚΟΤΣΗΣ ΔΗΜΗΤΡΗΣ', 'ΒΑΣΙΛΕΙΟΥ ΠΕΤΡΟΣ', 'ΤΣΙΑΜΗΣ ΚΩΣΤΑΣ'], { 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ': 1, 'ΜΕΜΜΟΣ ΗΛΙΑΣ': 2 }),
          {
            tab: 'MD MASTER', title: 'MD MASTER ROUND ROBIN', discipline: 'MD', level: 'MASTER', format: 'round_robin', size: 4, updated_at: now.toISOString(),
            entrants: MD_TEAMS.map((raw, k) => ({ pos: k + 1, raw, seed: null, bye: false, players: raw.split(' / ').map((p) => ({ raw: p, player_id: p.startsWith('ΚΑΡΔΑΜΙΤΣΗΣ') ? 'me' : null })) })),
            rounds: [],
            groups: [
              {
                name: 'Όμιλος 1',
                teams: MD_TEAMS.slice(0, 4).map((raw, k) => ({ pos: k + 1, raw, people: [] })),
                matches: [
                  gm(1, 2, 1, [[6, 3], [6, 4]]),
                  gm(3, 1, 2, [[4, 6], [6, 7]]),
                  gm(2, 4, 1, [[6, 2], [6, 1]]),
                  gm(3, 4, 1, [[7, 5], [6, 4]]),
                ],
                standings: [{ pos: 1, won: 2, played: 2 }, { pos: 2, won: 1, played: 2 }, { pos: 3, won: 1, played: 2 }, { pos: 4, won: 0, played: 2 }],
              },
              {
                name: 'Όμιλος 2',
                teams: MD_TEAMS.slice(4, 7).map((raw, k) => ({ pos: k + 1, raw, people: [] })),
                matches: [gm(1, 2, 1, [[6, 4], [3, 6], [10, 7]]), gm(1, 3, 1, [[6, 1], [6, 2]]), gm(2, 3, 2, [[2, 6], [4, 6]])],
                standings: [{ pos: 1, won: 2, played: 2 }, { pos: 2, won: 0, played: 2 }, { pos: 3, won: 1, played: 2 }],
              },
            ],
          },
        ]
      : id === 'tour-vari'
        ? [knockout('Μ 40+', SIXTEEN.slice(0, 8), [4, 2, 1], today, ['ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ'], { 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ': 1 })]
        : [],
    masked: [],
    days,
  };
}

/** «Το επόμενο τουρνουά για σένα» for mock mode: the same split the server makes (free: the first and a count) */
export function mockUpcoming(pro: boolean, now: Date = new Date()): UpcomingTournamentsResult {
  const today = dayKey(now.toISOString());
  const all: UpcomingTournament[] = [
    {
      id: 'tour-voula', name: 'Κύπελλο Βούλας', venue: 'Ο.Α. Βούλας', area_id: 'voula', area: 'Βούλα', surface: 'clay',
      starts_on: addDays(today, 5), ends_on: addDays(today, 7), entry_deadline: addDays(today, 3), entry_open: true,
      entry_link: 'https://example.org/voula', categories: ['Μ 40+', 'MEDIUM'], played_before: true, near: true,
    },
    {
      id: 'tour-glyfada-winter', name: 'Χειμερινό Γλυφάδας', venue: 'Γήπεδα Γλυφάδας', area_id: 'glyfada', area: 'Γλυφάδα', surface: 'hard',
      starts_on: addDays(today, 16), ends_on: addDays(today, 18), entry_deadline: addDays(today, 11), entry_open: true,
      entry_link: null, categories: ['Μ 40+', '-40'], played_before: false, near: true,
    },
    {
      id: 'tour-kifisia', name: 'Open Κηφισιάς', venue: 'Ο.Α. Κηφισιάς', area_id: 'kifisia', area: 'Κηφισιά', surface: 'clay',
      starts_on: addDays(today, 24), ends_on: addDays(today, 26), entry_deadline: addDays(today, 19), entry_open: true,
      entry_link: 'https://example.org/kifisia', categories: ['MEDIUM'], played_before: false, near: false,
    },
  ];
  return pro ? { pro, items: all, more: 0 } : { pro, items: all.slice(0, 1), more: all.length - 1 };
}
