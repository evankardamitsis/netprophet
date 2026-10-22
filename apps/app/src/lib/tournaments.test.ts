import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { DrawMatchRow, GetTournamentResult, TournamentDraw, TournamentItem, TournamentMatch } from '@netprophet/db';
import { allPairs, blocksOf, boldLine, bracketRounds, groupFinished, groupViews, orderStandings, chipOf, dayChips, defaultDay, defaultSegment, mineHeadline, mineRows, openCount, roundName, scheduleRows, sectionsOf, subLine } from './tournaments';

const t = getCopy('el');

const item = (over: Partial<TournamentItem>): TournamentItem => ({
  id: 'a', name: 'Open Γλυφάδας', venue: 'Γήπεδα Γλυφάδας', area_id: null, surface: null, starts_on: '2026-10-17', ends_on: '2026-10-18',
  entry_deadline: null, level_min: null, level_max: null, state: 'upcoming', draws: 0, matches: 0, today: 0, in_it: false, ...over,
});

const player = (id: string, surname: string, first: string) => ({ id, first_name: first, surname, photo_path: null, area_id: null, level_tier: null, level_direction: null });
const match = (over: Partial<TournamentMatch>): TournamentMatch => ({
  match_id: 'm', starts_at: '2026-10-17T07:00:00Z', format: 'singles', status: 'scheduled', level: 'Μ 40+', discipline: 'MS', round: null,
  sides: [{ side: 1, players: [player('p1', 'Ροδίτης', 'Νίκος')] }, { side: 2, players: [player('p2', 'Δεσύπρης', 'Γιώργος')] }],
  winner_side: null, sets: null, retired: false, walkover: false, ...over,
});

describe('list', () => {
  it('chip: in it is lime, else by state', () => {
    expect(chipOf(item({ in_it: true }), '2026-10-13', t)).toEqual({ text: 'παίζεις', hot: true });
    expect(chipOf(item({ state: 'ongoing' }), '2026-10-13', t).text).toBe('σε εξέλιξη');
    expect(chipOf(item({ state: 'done' }), '2026-10-13', t).text).toBe('τελείωσε');
    expect(chipOf(item({}), '2026-10-13', t).text).toBe('σε 4 μέρες');
    expect(chipOf(item({}), '2026-10-16', t).text).toBe('αύριο');
  });
  it('chip: followed says «ακολουθείς», never lime; playing in it wins', () => {
    expect(chipOf(item({ followed: true, state: 'ongoing' }), '2026-10-13', t)).toEqual({ text: 'ακολουθείς', hot: false });
    expect(chipOf(item({ followed: true, in_it: true }), '2026-10-13', t)).toEqual({ text: 'παίζεις', hot: true });
  });
  it('followed ones go at the top with «Τα δικά σου» while live; a finished one stays in «Τελείωσαν»', () => {
    const items = [
      item({ id: 'on', state: 'ongoing' }),
      item({ id: 'onFollowed', state: 'ongoing', followed: true }),
      item({ id: 'soonMine', state: 'upcoming', in_it: true }),
      item({ id: 'soonFollowed', state: 'upcoming', followed: true }),
      item({ id: 'doneFollowed', state: 'done', followed: true }),
    ];
    expect(sectionsOf(items, t).map((x) => [x.title, x.items.map((i) => i.id)])).toEqual([
      ['Τα δικά σου', ['onFollowed', 'soonMine', 'soonFollowed']],
      ['Τώρα', ['on']],
      ['Τελείωσαν', ['doneFollowed']],
    ]);
  });
  it('sub and bold lines leave out what is missing', () => {
    expect(subLine(item({}), t)).toBe('Γήπεδα Γλυφάδας · 17/10 έως 18/10');
    expect(subLine(item({ venue: null, starts_on: null, ends_on: null }), t)).toBe('');
    expect(boldLine(item({ draws: 3, today: 12 }), t)).toBe('3 ταμπλό · 12 ματς σήμερα');
    expect(boldLine(item({ draws: 2 }), t)).toBe('2 ταμπλό');
    expect(boldLine(item({}), t)).toBeNull();
  });
  it('sections in order, only the ones with items; the count leaves out finished', () => {
    const items = [item({ id: '1', state: 'done' }), item({ id: '2', state: 'ongoing' }), item({ id: '3', state: 'upcoming' })];
    expect(sectionsOf(items, t).map((s) => s.title)).toEqual(['Τώρα', 'Έρχονται', 'Τελείωσαν']);
    expect(sectionsOf([], t)).toEqual([]);
    expect(openCount(items)).toBe(2);
    expect(openCount(null)).toBe(0);
  });
});

describe('Το πρόγραμμά σου', () => {
  const mine = [{ ...match({ starts_at: '2026-10-17T07:00:00Z' }), tournament_id: 't', tournament: 'Open Γλυφάδας' }];
  it('rows and headline from my first match', () => {
    expect(mineRows(mine, t)).toEqual([{ key: 'm', when: 'Σαβ 17/10 · 10:00', what: 'Open Γλυφάδας · Μ 40+' }]);
    expect(mineHeadline(mine, '2026-10-13', t)).toBe('Παίζεις Σάββατο 10:00');
    expect(mineHeadline(mine, '2026-10-17', t)).toBe('Παίζεις σήμερα 10:00');
    expect(mineHeadline(mine, '2026-10-16', t)).toBe('Παίζεις αύριο 10:00');
    expect(mineHeadline([], '2026-10-16', t)).toBeNull();
  });
});

describe('schedule', () => {
  const days: GetTournamentResult['days'] = [
    { date: '2026-10-12', matches: [match({})] },
    { date: '2026-10-14', matches: [match({})] },
    { date: '2026-10-20', matches: [match({})] },
  ];
  it('day chips and default day', () => {
    expect(dayChips(days, '2026-10-13', t).map((c) => c.label)).toEqual(['Δευ 12/10', 'Αύριο', 'Τρι 20/10']);
    expect(dayChips(days, '2026-10-12', t).map((c) => c.label)[0]).toBe('Σήμερα');
    expect(dayChips(days, '2026-10-12', t)[1]!.label).toBe('Τετ 14/10');
    // 12 and 14 are both one day from the 13th: the later wins
    expect(defaultDay(days, '2026-10-13')).toBe('2026-10-14');
    expect(defaultDay(days, '2026-10-20')).toBe('2026-10-20');
    expect(defaultDay([], '2026-10-13')).toBeNull();
  });
  it('segment: Πρόγραμμα when there are matches today, else Ταμπλό', () => {
    const draws = [{}] as TournamentDraw[];
    expect(defaultSegment({ days, draws }, '2026-10-12')).toBe('schedule');
    expect(defaultSegment({ days, draws }, '2026-10-13')).toBe('bracket');
    expect(defaultSegment({ days, draws: [] }, '2026-10-13')).toBe('schedule');
    expect(defaultSegment({ days: [], draws }, '2026-10-12')).toBe('bracket');
  });
  it('rows by time, mine marked, winner and score', () => {
    const rows = scheduleRows(
      [
        match({ match_id: 'late', starts_at: '2026-10-17T15:00:00Z' }),
        match({ match_id: 'early', starts_at: '2026-10-17T07:00:00Z', winner_side: 1, sets: [{ w: 6, l: 4 }, { w: 7, l: 6, tb: [7, 5] }] }),
      ],
      'p2',
      t,
    );
    expect(rows.map((r) => r.id)).toEqual(['early', 'late']);
    expect(rows[0]).toMatchObject({ time: '10:00', meta: 'Μ 40+ · Απλό', score: '6-4, 7-6(5)', mine: true });
    expect(rows[0]!.sides.map((s) => s.winner)).toEqual([true, false]);
    expect(rows[1]!.score).toBeNull();
    expect(rows[0]).toMatchObject({ postponed: false, movedFrom: null, club: null });
  });
  it('the club in the place line carries its logo', () => {
    const [row] = scheduleRows([match({ club: 'PRC (Μαρούσι)', club_logo: 'clubs/c/k1.png', court: 'Court 1' })], null, t);
    expect(row!.club).toEqual({ name: 'PRC (Μαρούσι)', logo: 'clubs/c/k1.png' });
    const [plain] = scheduleRows([match({ club: 'PRC (Μαρούσι)' })], null, t);
    expect(plain!.club).toEqual({ name: 'PRC (Μαρούσι)', logo: null });
  });
  it('a put-off match says «Αναβολή» and goes last; a moved one says where from', () => {
    const rows = scheduleRows(
      [
        match({ match_id: 'off', starts_at: null, postponed: true }),
        match({ match_id: 'moved', starts_at: '2026-10-17T15:00:00Z', moved_from: '2026-10-13T15:30:00Z' }),
      ],
      null,
      t,
    );
    expect(rows.map((r) => r.id)).toEqual(['moved', 'off']);
    expect(rows[0]).toMatchObject({ time: '18:00', postponed: false, movedFrom: 'από Τρι 13/10' });
    expect(rows[1]).toMatchObject({ time: 'Αναβολή', postponed: true, movedFrom: null });
  });
});

describe('draws', () => {
  it('names the last three rounds from the end', () => {
    expect([0, 1, 2, 3, 4].map((i) => roundName(i, 5, t))).toEqual(['1ος γύρος', '2ος γύρος', 'Προημιτελικά', 'Ημιτελικά', 'Τελικός']);
    expect([0, 1].map((i) => roundName(i, 2, t))).toEqual(['Ημιτελικά', 'Τελικός']);
  });

  const m = (over: Partial<DrawMatchRow>): DrawMatchRow => ({ round: 1, slot: 1, side1: null, side2: null, winner: null, bye: false, scoreRaw: '', walkover: false, retired: false, when: '', deadline: null, ...over });
  const draw: TournamentDraw = {
    tab: 'Μ 40+', title: '', discipline: 'MS', level: 'Μ 40+', format: 'knockout', size: 4, updated_at: '',
    entrants: [
      { pos: 1, raw: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', seed: 1, bye: false, players: [{ raw: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', player_id: 'nik' }] },
      { pos: 2, raw: 'ΒΥΕ', seed: null, bye: true, players: [] },
      { pos: 3, raw: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', seed: null, bye: false, players: [{ raw: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', player_id: 'ale' }] },
      { pos: 4, raw: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', seed: null, bye: false, players: [{ raw: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', player_id: null }] },
    ],
    rounds: [
      [m({ side1: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', side2: 'ΒΥΕ', bye: true }), m({ slot: 2, side1: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', side2: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', winner: 2, scoreRaw: '64 63' })],
      [m({ round: 2, side1: 'Ροδίτης Νίκος', side2: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', when: 'ΔΕΥ 18.30', deadline: '2026-10-14' }), m({ round: 2, slot: 2, side1: null, side2: null, deadline: '2026-10-14' })],
    ],
  };
  it('seeds, byes, winners, links and the line under a match', () => {
    const r = bracketRounds(draw, [], t);
    expect(r.map((x) => x.name)).toEqual(['Ημιτελικά', 'Τελικός']);
    const [bye, played] = r[0]!.matches;
    expect(bye!.sides[0].seed).toBe(1);
    expect(bye!.sides[0].parts).toEqual([{ text: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', playerId: 'nik' }]);
    expect(bye!.sides[1].bye).toBe(true);
    expect(bye!.advances).toBe(1);
    expect(bye!.line).toBe('');
    expect(played!.winner).toBe(2);
    expect(played!.line).toBe('64 63');
    expect(played!.sides[1].parts[0]!.playerId).toBeNull();
    const [later, empty] = r[1]!.matches;
    // names match across accents, case and the final sigma
    expect(later!.sides[0].parts[0]!.playerId).toBe('nik');
    expect(later!.line).toBe('ΔΕΥ 18.30');
    expect(empty!.sides[0].empty).toBe(true);
    expect(empty!.line).toBe('έως 14/10');
  });
  it('masked names show as a dash and do not link', () => {
    const r = bracketRounds(draw, ['ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ'], t);
    expect(r[0]!.matches[1]!.sides[0].parts).toEqual([{ text: '–', playerId: null }]);
  });
});

describe('round robin groups', () => {
  it('orders by wins, then fewer played, then place', () => {
    expect(orderStandings([{ pos: 1, won: 1, played: 2 }, { pos: 2, won: 2, played: 2 }, { pos: 3, won: 1, played: 1 }, { pos: 4, won: 1, played: 1 }]).map((x) => x.pos)).toEqual([2, 3, 4, 1]);
  });
  it('derives every pair', () => {
    expect(allPairs([3, 1, 2])).toEqual([[1, 2], [1, 3], [2, 3]]);
    expect(allPairs([1])).toEqual([]);
  });
  it('is finished only when every pair has a winner', () => {
    const teams = [{ pos: 1 }, { pos: 2 }, { pos: 3 }];
    const ms = [{ a: 1, b: 2, winner: 1 as const }, { a: 3, b: 1, winner: 2 as const }];
    expect(groupFinished(teams, ms)).toBe(false);
    expect(groupFinished(teams, [...ms, { a: 2, b: 3, winner: null }])).toBe(false);
    expect(groupFinished(teams, [...ms, { a: 3, b: 2, winner: 1 }])).toBe(true);
    expect(groupFinished([], [])).toBe(false);
  });
  const person = (surname: string) => ({ surname, first: '', key: surname });
  const draw = {
    entrants: [
      { pos: 1, raw: 'ΑΑΑ ΝΙΚΟΣ / ΒΒΒ ΓΙΩΡΓΟΣ', seed: null, bye: false, players: [{ raw: 'ΑΑΑ ΝΙΚΟΣ', player_id: 'me' }, { raw: 'ΒΒΒ ΓΙΩΡΓΟΣ', player_id: null }] },
    ],
    groups: [
      {
        name: 'Όμιλος 1',
        teams: [
          { pos: 1, raw: 'ΑΑΑ ΝΙΚΟΣ / ΒΒΒ ΓΙΩΡΓΟΣ', people: [person('ΑΑΑ'), person('ΒΒΒ')] },
          { pos: 2, raw: 'ΓΓΓ ΠΕΤΡΟΣ / ΔΔΔ ΚΩΣΤΑΣ', people: [person('ΓΓΓ'), person('ΔΔΔ')] },
          { pos: 3, raw: 'ΕΕΕ ΑΛΕΞΗΣ / ΖΖΖ ΗΛΙΑΣ', people: [person('ΕΕΕ'), person('ΖΖΖ')] },
        ],
        matches: [
          { a: 1, b: 2, scoreRaw: '64 63', sets: [{ g: [6, 4] as [number, number], tb: false }, { g: [6, 3] as [number, number], tb: false }], winner: 1 as const, walkover: false },
          { a: 3, b: 1, scoreRaw: '', sets: [], winner: null, walkover: false },
        ],
        standings: [{ pos: 1, won: 1, played: 1 }, { pos: 2, won: 0, played: 1 }, { pos: 3, won: 0, played: 0 }],
      },
    ],
  };
  it('builds the table and every pair, mine marked, names masked', () => {
    const [g] = groupViews(draw, ['ΖΖΖ ΗΛΙΑΣ'], 'me', t);
    expect(g!.finished).toBe(false);
    expect(g!.rows.map((r) => [r.place, r.team.pos, r.record, r.champion])).toEqual([[1, 1, '1/1', false], [2, 3, '0/0', false], [3, 2, '0/1', false]]);
    expect(g!.rows[0]!.team.mine).toBe(true);
    expect(g!.rows[0]!.team.parts).toEqual([{ text: 'ΑΑΑ ΝΙΚΟΣ', playerId: 'me' }, { text: 'ΒΒΒ ΓΙΩΡΓΟΣ', playerId: null }]);
    expect(g!.rows[1]!.team.parts[1]).toEqual({ text: '–', playerId: null });
    expect(g!.matches.map((m) => [m.key, m.played, m.mine])).toEqual([['1-2', true, true], ['1-3', false, true], ['2-3', false, false]]);
    expect(g!.matches[0]!.sets).toEqual([[6, 4], [6, 3]]);
    // a match written the other way round keeps its own order, team a first
    expect(g!.matches[1]!.a.pos).toBe(3);
  });
  it('puts a lime check on the winner once every pair has played', () => {
    const done = { ...draw, groups: [{ ...draw.groups[0]!, matches: [...draw.groups[0]!.matches.map((m) => ({ ...m, winner: 1 as const })), { a: 2, b: 3, scoreRaw: '', sets: [], winner: 2 as const, walkover: true }] }] };
    const [g] = groupViews(done, [], null, t);
    expect(g!.finished).toBe(true);
    expect(g!.rows.filter((r) => r.champion).map((r) => r.team.pos)).toEqual([1]);
    expect(g!.matches[2]!.walkover).toBe(true);
    expect(g!.matches[2]!.played).toBe(true);
  });
});

describe('the Τουρνουά order (founder, 19 Oct: your own first, Pro never above it)', () => {
  const items = [
    item({ id: 'on', state: 'ongoing' }),
    item({ id: 'onMine', state: 'ongoing', in_it: true }),
    item({ id: 'soon', state: 'upcoming' }),
    item({ id: 'soonMine', state: 'upcoming', in_it: true }),
    item({ id: 'doneMine', state: 'done', in_it: true }),
    item({ id: 'done', state: 'done' }),
  ];
  const shape = (blocks: ReturnType<typeof blocksOf>) => blocks.map((b) => (b.kind === 'section' ? b.section.key : b.kind));

  it('«Τα δικά σου» first, live ones only; the others without them', () => {
    const s = sectionsOf(items, t);
    expect(s.map((x) => [x.title, x.items.map((i) => i.id)])).toEqual([
      ['Τα δικά σου', ['onMine', 'soonMine']],
      ['Τώρα', ['on']],
      ['Έρχονται', ['soon']],
      ['Τελείωσαν', ['doneMine', 'done']],
    ]);
  });
  it('free with tournaments of their own: own, the Pro line, now, next, the rest', () => {
    expect(shape(blocksOf({ sections: sectionsOf(items, t), program: false, next: true }))).toEqual(['mine', 'pro', 'ongoing', 'next', 'upcoming', 'done']);
  });
  it('Pro with matches: the program card opens the screen and there is no Pro line', () => {
    expect(shape(blocksOf({ sections: sectionsOf(items, t), program: true, next: true }))).toEqual(['program', 'mine', 'ongoing', 'next', 'upcoming', 'done']);
  });
  it('nothing of their own: now and next first, then the Pro line, never first', () => {
    const others = items.filter((i) => !i.in_it);
    expect(shape(blocksOf({ sections: sectionsOf(others, t), program: false, next: true }))).toEqual(['ongoing', 'next', 'pro', 'upcoming', 'done']);
    expect(shape(blocksOf({ sections: sectionsOf(others, t), program: false, next: false }))).toEqual(['ongoing', 'pro', 'upcoming', 'done']);
    const later = others.filter((i) => i.state !== 'ongoing');
    expect(shape(blocksOf({ sections: sectionsOf(later, t), program: false, next: false }))).toEqual(['upcoming', 'pro', 'done']);
  });
  it('a finished one you played in is not «yours» at the top', () => {
    expect(shape(blocksOf({ sections: sectionsOf([items[4]!], t), program: false, next: false }))).toEqual(['done', 'pro']);
  });
  it('nothing at all: only the Pro line', () => {
    expect(shape(blocksOf({ sections: [], program: false, next: false }))).toEqual(['pro']);
  });
});

describe('a start with no time (the import stores 00:00 Athens)', async () => {
  const { dayTimeShort, hasTime } = await import('./tournaments');
  const { whenLine } = await import('./tournamentToday');
  const { when } = await import('./feed');
  const tt = getCopy('el');
  const midnight = '2026-10-24T21:00:00Z'; // Κυρ 25/10 00:00 Athens
  it('hasTime', () => {
    expect(hasTime(midnight)).toBe(false);
    expect(hasTime('2026-10-25T07:30:00Z')).toBe(true);
    expect(hasTime(null)).toBe(false);
  });
  it('the day alone, never «00:00»', () => {
    expect(dayTimeShort(midnight, tt)).toBe('Κυρ 25/10');
    expect(whenLine(midnight, '2026-10-22', tt)).toBe('Κυρ 25/10');
    expect(whenLine('2026-10-21T21:00:00Z', '2026-10-22', tt)).toBe('Σήμερα');
    expect(when('2026-10-21T21:00:00Z', new Date('2026-10-22T09:00:00Z'), tt).label).toBe('Σήμερα');
  });
});
