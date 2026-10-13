import { addDays, dayKey, localParts, toInstant } from '@netprophet/core';
import type { DrawMatchRow, FeedPlayer, SetScore, GetTournamentResult, GetTournamentsResult, TournamentMatch } from '@netprophet/db';

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
        { date: addDays(today, 2), matches: [match('tm-2', addDays(today, 2), 10, 0, ME, GIO, null, [])] },
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
          {
            tab: 'MD MASTER', title: 'MD MASTER ROUND ROBIN', discipline: 'MD', level: 'MASTER', format: 'round_robin', size: 4, updated_at: now.toISOString(),
            entrants: [], rounds: [],
          },
        ]
      : [],
    masked: [],
    days,
  };
}
