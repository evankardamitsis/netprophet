import { describe, expect, it } from 'vitest';
import { gluedTb, nameKey, parseCategory, parseCsv, parseScore, parseSheetSide, sheetTime, tabDay, toDbSets } from './index';

describe('parseScore (parse_oop.py)', () => {
  it('sets, tie-break sets, sides', () => {
    expect(parseScore('63 76')).toMatchObject({ status: 'completed', winner: 1, won: [2, 0], sets: [{ g: [6, 3], tb: false }, { g: [7, 6], tb: false }] });
    expect(parseScore('62 36 10 6')).toMatchObject({ winner: 1, sets: [{ g: [6, 2] }, { g: [3, 6] }, { g: [10, 6], tb: true }] });
    expect(parseScore('57 64 3-10')).toMatchObject({ winner: 2, won: [1, 2] });
    expect(parseScore('57-26')).toMatchObject({ winner: 2, sets: [{ g: [5, 7] }, { g: [2, 6] }] });
    expect(parseScore('64-46 10-8')).toMatchObject({ winner: 1, sets: [{ g: [6, 4] }, { g: [4, 6] }, { g: [10, 8], tb: true }] });
  });
  it('scheduled, walkover, unfinished', () => {
    expect(parseScore('')).toMatchObject({ status: 'scheduled', winner: null });
    expect(parseScore('wo')).toMatchObject({ status: 'walkover', winner: null, flags: ['walkover_winner_unknown'] });
    expect(parseScore('44 tbc')).toMatchObject({ status: 'incomplete', winner: null, flags: ['incomplete_score'] });
  });
  // the strings below are from the live ΑΟΚ schedule sheet (10 to 24 Oct 2026), each one a result staff had to type in
  // by hand, or that never came over (founder, 25 Oct)
  it('a match tie-break written without a dash', () => {
    expect(parseScore('63 46 810')).toMatchObject({ status: 'completed', winner: 2, sets: [{ g: [6, 3] }, { g: [4, 6] }, { g: [8, 10], tb: true }] });
    expect(parseScore('57 61 107')).toMatchObject({ winner: 1, sets: [{ g: [5, 7] }, { g: [6, 1] }, { g: [10, 7], tb: true }] });
    expect(parseScore('61 26 1210')).toMatchObject({ winner: 1, sets: [{ g: [6, 1] }, { g: [2, 6] }, { g: [12, 10], tb: true }] });
    expect(parseScore('63 46 911')).toMatchObject({ winner: 2, sets: [{ g: [6, 3] }, { g: [4, 6] }, { g: [9, 11], tb: true }] });
    expect(parseScore('62 16 510')).toMatchObject({ winner: 2, sets: [{ g: [6, 2] }, { g: [1, 6] }, { g: [5, 10], tb: true }] });
    expect(parseScore('63-36 107')).toMatchObject({ winner: 1, sets: [{ g: [6, 3] }, { g: [3, 6] }, { g: [10, 7], tb: true }] });
    for (const s of ['63 46 810', '57 61 107', '61 26 1210', '63-36 107']) expect(parseScore(s).flags).toEqual([]);
  });
  it('only a cut that is a valid match tie-break, and only as the third set', () => {
    expect(gluedTb('810')).toEqual([8, 10]);
    expect(gluedTb('1210')).toEqual([12, 10]);
    expect(gluedTb('1010')).toBeNull();
    expect(gluedTb('66')).toBeNull();
    expect(parseScore('810 64').winner).toBeNull();
  });
  it('sets run together with dashes', () => {
    expect(parseScore('36-64-10-8')).toMatchObject({ winner: 1, sets: [{ g: [3, 6] }, { g: [6, 4] }, { g: [10, 8], tb: true }], flags: [] });
    expect(parseScore('63-5710-5')).toMatchObject({ winner: 1, sets: [{ g: [6, 3] }, { g: [5, 7] }, { g: [10, 5], tb: true }], flags: [] });
    expect(parseScore('64-36-64')).toMatchObject({ winner: 1, sets: [{ g: [6, 4] }, { g: [3, 6] }, { g: [6, 4], tb: false }] });
  });
  it('a retirement: the side ahead when play stopped (as staff decided all six by hand)', () => {
    expect(parseScore('46 34 ret')).toMatchObject({ status: 'completed', retired: true, winner: 2, sets: [{ g: [4, 6] }, { g: [3, 4] }] });
    expect(parseScore('26-01 RET')).toMatchObject({ retired: true, winner: 2, sets: [{ g: [2, 6] }, { g: [0, 1] }] });
    expect(parseScore('3-0 ret')).toMatchObject({ retired: true, winner: 1, sets: [{ g: [3, 0], tb: false }] });
    expect(parseScore('06 03 ret')).toMatchObject({ retired: true, winner: 2, sets: [{ g: [0, 6] }, { g: [0, 3] }] });
    expect(parseScore('46 02 ret')).toMatchObject({ retired: true, winner: 2 });
    expect(parseScore('46 01 ret')).toMatchObject({ retired: true, winner: 2 });
    expect(parseScore('26 ret')).toMatchObject({ retired: true, winner: 2, sets: [{ g: [2, 6] }] });
    expect(toDbSets(parseScore('06 03 ret').sets, 2)).toEqual([{ w: 6, l: 0 }, { w: 3, l: 0 }]);
  });
  it('a retirement with nobody ahead waits for staff', () => {
    expect(parseScore('64 46 ret')).toMatchObject({ retired: true, winner: null, flags: expect.arrayContaining(['retired_winner_unknown']) });
    expect(parseScore('64 33 ret')).toMatchObject({ retired: true, winner: 1 });
    expect(parseScore('ret')).toMatchObject({ winner: null });
  });
  it('words in the score column are not a score', () => {
    expect(parseScore('ΤΕΛΙΚΟΣ')).toMatchObject({ status: 'scheduled', winner: null, flags: [] });
    expect(parseScore('ΗΜΙΤΕΛΙΚΟΣ')).toMatchObject({ status: 'scheduled', flags: [] });
  });
  it('winner-first sets for the database', () => {
    expect(toDbSets(parseScore('75 16 14-16').sets, 2)).toEqual([{ w: 5, l: 7 }, { w: 6, l: 1 }, { w: 16, l: 14, stb: true }]);
    expect(toDbSets(parseScore('63 76').sets, 1)).toEqual([{ w: 6, l: 3 }, { w: 7, l: 6, tb: true }]);
  });
});

describe('parseCategory (parse_oop.py)', () => {
  it('discipline and level', () => {
    expect(parseCategory('M MED/ ADV')).toEqual({ discipline: 'MS', level: 'MED/ADV', flags: [] });
    expect(parseCategory('MED/ADV')).toEqual({ discipline: 'MS', level: 'MED/ADV', flags: ['gender_missing'] });
    expect(parseCategory('M ROOKIES2')).toEqual({ discipline: 'MS', level: 'ROOKIES 2', flags: [] });
    expect(parseCategory('Μ 40-49')).toEqual({ discipline: 'MS', level: '40-49', flags: ['greek_mu_in_category'] });
    expect(parseCategory('MIXED')).toEqual({ discipline: 'XD', level: 'OPEN', flags: [] });
  });
});

describe('tabs, times, people', () => {
  it('tab day and weekday', () => {
    expect(tabDay('ΣΑΒ 26/09', 2026)).toEqual({ weekday: 'ΣΑΒ', date: '2026-09-26', dow: 5 });
    expect(tabDay('ΚΥΡ 4 /10', 2026)?.date).toBe('2026-10-04');
    expect(tabDay('ΣΑΒ 17/04', 2026)?.date).toBe('2027-04-17');
    expect(tabDay('Πρόγραμμα', 2026)).toBeNull();
  });
  it('times', () => {
    expect(sheetTime('΄20:30')).toBe('20:30');
    expect(sheetTime('21.00')).toBe('21:00');
    expect(sheetTime('')).toBeNull();
  });
  it('people, surname first', () => {
    expect(parseSheetSide('ΠΑΠΑΖΟΓΛΟΥ/ΖΑΡΕΙΦΟΠΟΥΛΟΣ')).toMatchObject({ pair: true, flags: ['first_name_missing'] });
    expect(parseSheetSide('ΓΕΡΟΥ ΑΝΤΩΝΗΣ').people).toEqual([{ surname: 'ΓΕΡΟΥ', first: 'ΑΝΤΩΝΗΣ', key: 'γερου αντωνησ' }]);
    expect(parseSheetSide('PAVEN FLORIAN').flags).toEqual(['latin_name']);
  });
  it('a doubles side of two words with no «/» is two players (ΑΟΚ, 17 Oct)', () => {
    const s = parseSheetSide('ΓΕΜΙΔΟΠΟΥΛΟΥ ΦΕΛΕΜΕΓΚΑΣ', true);
    expect(s.pair).toBe(true);
    expect(s.people.map((p) => p.surname)).toEqual(['ΓΕΜΙΔΟΠΟΥΛΟΥ', 'ΦΕΛΕΜΕΓΚΑΣ']);
    expect(s.flags).toContain('pair_by_space');
    // singles keeps surname and first name
    expect(parseSheetSide('ΓΕΜΙΔΟΠΟΥΛΟΥ ΦΕΛΕΜΕΓΚΑΣ').people).toHaveLength(1);
    // three words stay as written: it could be a double surname
    expect(parseSheetSide('ΠΑΠΑ ΓΙΑΝΝΗΣ ΚΩΣΤΑΣ', true).people).toHaveLength(1);
  });
  it('matching keys ignore order and formal first names', () => {
    expect(nameKey('ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ')).toBe(nameKey('Βαγγέλης Καρδαμίτσης'));
    expect(nameKey('ΕΜΜΑΝΟΥΗΛ ΟΡΕΣΤΗΣ')).toBe(nameKey('ΟΡΕΣΤΗΣ ΕΜΜΑΝΟΥΗΛ'));
  });
});

describe('parseCsv', () => {
  it('Greek Excel «;», quotes and CRLF', () => {
    expect(parseCsv('ΩΡΑ;PLAYER 1\r\n"9.00";"ΠΑΠΑΣ; Γ."\r\n')).toEqual([
      ['ΩΡΑ', 'PLAYER 1'],
      ['9.00', 'ΠΑΠΑΣ; Γ.'],
    ]);
  });
});
