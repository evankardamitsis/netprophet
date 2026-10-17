import { describe, expect, it } from 'vitest';
import { nameKey, parseCategory, parseCsv, parseScore, parseSheetSide, sheetTime, tabDay, toDbSets } from './index';

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
