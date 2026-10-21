import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { DrawMatchRow, GetTournamentResult, TournamentDraw, TournamentMatch } from '@netprophet/db';
import { entriesOf, entryOfMatch, identityOf, ifWinsLine, matchesOfEntry, pickEntry, runOf, summaryOf, titleOf } from './playerRun';

/**
 * Test vectors in the shape api.get_tournament returns on the live project (read 21 Oct 2026, names invented): sheet
 * names in capitals with cut first names, pairs joined by «/», a bye as a row with `bye: true` and `side2: null`, the
 * winner's games first in `scoreRaw`, and the same person under one roster id on the schedule and another (or none)
 * in the draw entrants.
 */
const t = getCopy('el');
const now = new Date('2026-10-21T10:00:00Z');

const person = (id: string, surname: string, first: string) => ({ id, first_name: first, surname, photo_path: null, area_id: null, level_tier: null, level_direction: null });
const ME = person('me', 'Καρδαμίτσης', 'Βαγγέλης');
// the schedule's id for the partner; the draw has him as `lam-sheet`
const LAM = person('lam', 'Λάμδας', 'Χάρης');
const HTA = person('hta', 'Ήτας', 'Ανδρέας');
const THE = person('the', 'Θήτας', 'Αλέξανδρος');
const DES = person('des', 'Δεσύπρης', 'Γιώργος');
const ROD = person('rod', 'Ροδίτης', 'Νίκος');

const sched = (id: string, at: string, a: ReturnType<typeof person>[], b: ReturnType<typeof person>[], over: Partial<TournamentMatch> = {}): TournamentMatch => ({
  match_id: id, starts_at: at, format: a.length > 1 ? 'doubles' : 'singles', status: 'confirmed', level: '-40', discipline: a.length > 1 ? 'MD' : 'MS', round: null,
  sides: [{ side: 1, players: a }, { side: 2, players: b }],
  winner_side: null, sets: null, retired: false, walkover: false, club: null, court: null, ...over,
});

const row = (round: number, slot: number, side1: string | null, side2: string | null, over: Partial<DrawMatchRow> = {}): DrawMatchRow => ({
  round, slot, side1, side2, winner: null, bye: false, scoreRaw: '', walkover: false, retired: false, when: '', deadline: null, ...over,
});
const ent = (pos: number, raw: string, ids: (string | null)[], seed: number | null = null) => ({
  pos, raw, seed, bye: raw === '', players: raw === '' ? [] : raw.split('/').map((r, i) => ({ raw: r, player_id: ids[i] ?? null })),
});

const PAIR = 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓ/ΛΑΜΔΑΣ ΧΑΡ';
const md: TournamentDraw = {
  tab: 'MD -40', title: 'MD -40', discipline: 'MD', level: '-40', format: 'knockout', size: 8, updated_at: '2026-10-21T05:00:00Z',
  entrants: [
    ent(1, 'ΑΛΦΑΣ ΚΩΣΤ/ΒΗΤΑΣ ΠΑΝΟΣ', ['a1', 'b1'], 1), ent(2, '', []), ent(3, 'ΓΑΜΑΣ ΒΑΣΙΛ/ΔΕΛΤΑΣ ΧΡ', ['g1', 'd1']), ent(4, 'ΕΨΙΛΟΣ ΓΙΩΡΓΟΣ/ΖΗΤΑΣ ΒΑΣΙΛΗΣ', ['e1', null]),
    // the same two people as the schedule's «Ήτας Ανδρέας & Θήτας Αλέξανδρος», under other roster ids
    ent(5, 'ΗΤΑΣ ΑΝΔ/ΘΗΤΑΣ ΑΛΕΞ', ['hta-sheet', 'the-sheet']), ent(6, 'ΙΩΤΑΣ ΘΑΝ/ΚΑΠΑΣ ΣΩΤ', ['i1', 'k1']), ent(7, '', []), ent(8, PAIR, ['me', 'lam-sheet'], 8),
  ],
  rounds: [
    [
      row(1, 1, 'ΑΛΦΑΣ ΚΩΣΤ/ΒΗΤΑΣ ΠΑΝΟΣ', null, { bye: true, winner: 1 }),
      row(1, 2, 'ΓΑΜΑΣ ΒΑΣΙΛ/ΔΕΛΤΑΣ ΧΡ', 'ΕΨΙΛΟΣ ΓΙΩΡΓΟΣ/ΖΗΤΑΣ ΒΑΣΙΛΗΣ', { winner: 2, scoreRaw: '61 64' }),
      row(1, 3, 'ΗΤΑΣ ΑΝΔ/ΘΗΤΑΣ ΑΛΕΞ', 'ΙΩΤΑΣ ΘΑΝ/ΚΑΠΑΣ ΣΩΤ', { winner: 1, scoreRaw: '64 75' }),
      row(1, 4, PAIR, null, { bye: true, winner: 1 }),
    ],
    [
      row(2, 1, 'ΑΛΦΑΣ ΚΩΣΤ/ΒΗΤΑΣ ΠΑΝΟΣ', 'ΕΨΙΛΟΣ ΓΙΩΡΓΟΣ/ΖΗΤΑΣ ΒΑΣΙΛΗΣ', { when: 'ΤΕΤ 17.45' }),
      row(2, 2, 'ΗΤΑΣ ΑΝΔ/ΘΗΤΑΣ ΑΛΕΞ', PAIR, { winner: 2, scoreRaw: '63 64' }),
    ],
    [row(3, 1, null, PAIR)],
  ],
};

const ms: TournamentDraw = {
  tab: 'Μ 40+', title: 'Μ 40+', discipline: 'MS', level: '40+', format: 'knockout', size: 8, updated_at: '2026-10-21T05:00:00Z',
  entrants: [ent(1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', ['rod']), ent(2, 'KAKKABHΣ ΚΩΝ', [null]), ent(3, 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', ['me']), ent(4, 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', ['des'])],
  rounds: [
    [row(1, 1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', 'KAKKABHΣ ΚΩΝ', { winner: 1, scoreRaw: '62 63' }), row(1, 2, 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', { when: 'ΣΑΒ 18.30' })],
    [row(2, 1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', null)],
    [row(3, 1, null, null)],
  ].slice(0, 2),
};
// eight players in the real sheet; four here, so the final is round 2 (add a round to see «later»)
const ms8: TournamentDraw = { ...ms, rounds: [...ms.rounds, [row(3, 1, null, null)]] };

const master: TournamentDraw = {
  tab: 'MD MASTER', title: 'MD MASTER', discipline: 'MD', level: 'MASTER', format: 'round_robin', size: 3, updated_at: '2026-10-21T05:00:00Z',
  entrants: [ent(1, 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓ/ΝΙΚΑΣ ΝΙΚΟΣ', ['me', null]), ent(2, '#1/ΟΜΙΚΡΟΣ ΤΑΚΗΣ', [null, null]), ent(3, 'ΠΙΣ ΠΕΤΡΟΣ/ΡΟΣ ΡΕΝΟΣ', [null, null])],
  rounds: [],
  groups: [
    {
      name: 'Όμιλος 1',
      teams: [{ pos: 1, raw: 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓ/ΝΙΚΑΣ ΝΙΚΟΣ', people: [] }, { pos: 2, raw: '#1/ΟΜΙΚΡΟΣ ΤΑΚΗΣ', people: [] }, { pos: 3, raw: 'ΠΙΣ ΠΕΤΡΟΣ/ΡΟΣ ΡΕΝΟΣ', people: [] }],
      matches: [
        { a: 1, b: 2, scoreRaw: '63 64', sets: [{ g: [6, 3], tb: false }, { g: [6, 4], tb: false }], winner: 1, walkover: false },
        { a: 3, b: 1, scoreRaw: '', sets: [], winner: null, walkover: false },
      ],
      standings: [],
    },
  ],
};

const days: GetTournamentResult['days'] = [
  { date: '2026-10-17', matches: [sched('md-r2', '2026-10-17T16:30:00Z', [HTA, THE], [ME, LAM], { winner_side: 2, sets: [{ w: 6, l: 3 }, { w: 6, l: 4 }], status: 'finished' })] },
  { date: '2026-10-24', matches: [sched('ms-r1', '2026-10-24T15:30:00Z', [ME], [DES], { level: '40+' }), sched('ms-x', '2026-10-24T14:00:00Z', [ROD], [person('kak', 'KAKKABHΣ', 'Κωνσταντίνος')], { level: '40+' })] },
];

const tour = (draws: TournamentDraw[] = [ms, md, master], over: Partial<GetTournamentResult> = {}): GetTournamentResult => ({
  id: 't', name: 'Open', venue: null, area_id: null, surface: null, starts_on: null, ends_on: null, entry_deadline: null, state: 'ongoing', me: 'me',
  draws, masked: ['#1'], days, ...over,
});

describe('who the held name is, under two ids', () => {
  it('a partner the draws know under another id is found by name (build 12: nothing lit up)', () => {
    const d = tour();
    const lam = identityOf(d, 'lam')!;
    const entries = entriesOf(d, lam, t);
    expect(entries.map((e) => e.label)).toEqual(['MD -40 · με Καρδαμίτση']);
    expect(titleOf(lam, entries[0]!, t)).toBe('Λάμδας Χάρης & Καρδαμίτσης Βαγγέλης');
  });
  it('held on the draw (the sheet id): the roster name from the schedule', () => {
    const d = tour();
    const lam = identityOf(d, 'lam-sheet')!;
    expect(lam).toMatchObject({ surname: 'Λάμδας', first: 'Χάρης' });
    expect(matchesOfEntry(d, lam, entriesOf(d, lam, t), entriesOf(d, lam, t)[0]!).map((m) => m.match_id)).toEqual(['md-r2']);
  });
  it('one entry per category, a pill each: singles alone, doubles with the partner', () => {
    const d = tour();
    expect(entriesOf(d, identityOf(d, 'me')!, t).map((e) => e.label)).toEqual(['Μ 40+', 'MD -40 · με Λάμδα', 'MD MASTER · με Νικα']);
  });
  it('a schedule match belongs to the entry of its category and partner', () => {
    const d = tour();
    const me = identityOf(d, 'me')!;
    const entries = entriesOf(d, me, t);
    expect(entryOfMatch(d.days[0]!.matches[0]!, me, entries)!.tab).toBe('MD -40');
    expect(entryOfMatch(d.days[1]!.matches[0]!, me, entries)!.tab).toBe('Μ 40+');
  });
  it('nowhere in it: no identity', () => expect(identityOf(tour(), 'zzz')).toBeNull());
});

describe('the path, R1 to the final', () => {
  it('a bye, a win with their games first, then the match to play against whoever comes through', () => {
    const d = tour();
    const me = identityOf(d, 'me')!;
    const entries = entriesOf(d, me, t);
    const entry = pickEntry(d, me, entries, { match: 'md-r2' }, t)!;
    expect(entry.tab).toBe('MD -40');
    const run = runOf(d, entry, t, { match: 'md-r2' });
    expect(run.focusKey).toBe('2-2');
    expect(run.steps.map((s) => [s.key, s.state])).toEqual([['1-4', 'bye'], ['2-2', 'won'], ['3-1', 'open']]);
    expect(run.steps[1]).toMatchObject({ against: 'Ήτας & Θήτας', score: '6-3, 6-4' });
    expect(run.steps[2]!.against).toBe('Αλφας & Βητας ή Εψιλος & Ζητας');
    expect(ifWinsLine(run, t)).toEqual({ line: 'Επόμενος: Αλφας & Βητας ή Εψιλος & Ζητας', when: null });
  });
  it('a match to play, the slot it leads to (known), and the rounds after', () => {
    const d = tour([ms8]);
    const me = identityOf(d, 'me')!;
    const run = runOf(d, entriesOf(d, me, t)[0]!, t, null);
    expect(run.steps).toEqual([
      { key: '1-2', round: 'Προημιτελικά', state: 'open', against: 'Δεσύπρης Γιώργος', score: null, when: 'ΣΑΒ 18.30' },
      { key: '2-1', round: 'Ημιτελικά', state: 'next', against: 'Ροδίτης Νίκος', score: null, when: null },
      { key: '3-1', round: 'Τελικός', state: 'later', against: null, score: null, when: null },
    ]);
    expect(ifWinsLine(run, t)!.line).toBe('Αν κερδίσει: Ροδίτης Νίκος');
  });
  it('held on the match itself: «Αν κερδίσει αυτό το ματς»', () => {
    const d = tour([ms8]);
    const me = identityOf(d, 'me')!;
    const run = runOf(d, entriesOf(d, me, t)[0]!, t, { match: 'ms-r1' });
    expect(run.focusKey).toBe('1-2');
    expect(ifWinsLine(run, t)!.line).toMatch(/^Αν κερδίσει αυτό το ματς \(.+\): Ροδίτης Νίκος$/);
  });
  it('a Latin lookalike on the sheet is the roster name («KAKKABHΣ»)', () => {
    const d = tour([ms8]);
    const kak = identityOf(d, 'kak')!;
    const run = runOf(d, entriesOf(d, kak, t)[0]!, t, { match: 'ms-x' });
    expect(run.steps.map((s) => s.state)).toEqual(['lost']);
    expect(run.focusKey).toBe('1-1');
    expect(ifWinsLine(run, t)!.line).toBe('Έφυγε στα προημιτελικά');
  });
  it('the title, and out in the final', () => {
    const won: TournamentDraw = { ...ms, rounds: [ms.rounds[0]!.map((r) => (r.slot === 2 ? { ...r, winner: 1 as const, scoreRaw: '64 64', when: '' } : r)), [row(2, 1, 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', 'ΚΑΡΔΑΜΙΤΣΗΣ ΒΑΓΓΕΛΗΣ', { winner: 2, scoreRaw: '76 64' })]] };
    const d = tour([won]);
    const run = runOf(d, entriesOf(d, identityOf(d, 'me')!, t)[0]!, t);
    expect(run.champion).toBe(true);
    expect(ifWinsLine(run, t)!.line).toBe('Πήρε τον τίτλο');
    const rod = runOf(d, entriesOf(d, identityOf(d, 'rod')!, t)[0]!, t);
    expect(ifWinsLine(rod, t)!.line).toBe('Έχασε στον τελικό');
  });
  it('a round robin: the group\'s matches, hidden players as «–»', () => {
    const d = tour();
    const me = identityOf(d, 'me')!;
    const entry = entriesOf(d, me, t).find((e) => e.tab === 'MD MASTER')!;
    const run = runOf(d, entry, t);
    expect(run.steps.map((s) => [s.state, s.against, s.score])).toEqual([
      ['won', '– & Ομικρος', '6-3, 6-4'],
      ['open', 'Πις & Ρος', null],
    ]);
    expect(ifWinsLine(run, t)).toBeNull();
  });
});

describe('the summary of one entry', () => {
  it('only the pair\'s matches, with ✓ and the score; the next from the path when the schedule has none', () => {
    const d = tour();
    const me = identityOf(d, 'me')!;
    const entries = entriesOf(d, me, t);
    const entry = entries.find((e) => e.tab === 'MD -40')!;
    const s = summaryOf(me, matchesOfEntry(d, me, entries, entry), runOf(d, entry, t), now, t);
    expect(s.previous).toEqual([{ matchId: 'md-r2', day: 'Σαβ 17/10', meta: null, against: 'με Ήτα & Θήτα', score: '6-3, 6-4', won: true }]);
    expect(s.next).toMatchObject({ matchId: null, against: 'με Αλφας & Βητας ή Εψιλος & Ζητας' });
  });
  it('singles: the next match from the schedule', () => {
    const d = tour();
    const me = identityOf(d, 'me')!;
    const entries = entriesOf(d, me, t);
    const entry = entries.find((e) => e.tab === 'Μ 40+')!;
    const s = summaryOf(me, matchesOfEntry(d, me, entries, entry), runOf(d, entry, t), now, t);
    expect(s.previous).toEqual([]);
    expect(s.next).toMatchObject({ matchId: 'ms-r1', against: 'με Δεσύπρη', now: false });
  });
});
