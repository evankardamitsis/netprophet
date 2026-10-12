import { describe, expect, it } from 'vitest';
import { dateFromTab, findColumns, nameKey, parseCsv, parseDay, parseScore, parseTime, splitSide } from './index';

/**
 * Vectors from docs/v2/match-data-automation.md. The reference parser (parse_oop.py) and the TAF RACE sheet are
 * not in the repo yet; when they arrive, the sheet becomes a fixture in tools/match-data/fixtures/ and these grow.
 */

describe('parseScore', () => {
  it('two sets, side 1 wins', () => {
    expect(parseScore('63 76')).toEqual({ kind: 'sets', winnerSide: 1, sets: [{ w: 6, l: 3 }, { w: 7, l: 6, tb: true }] });
  });
  it('a match tie-break at one set all', () => {
    expect(parseScore('62 36 10 6')).toEqual({
      kind: 'sets',
      winnerSide: 1,
      sets: [{ w: 6, l: 2 }, { w: 3, l: 6 }, { w: 10, l: 6, stb: true }],
    });
  });
  it('side 2 wins: sets turn winner-first', () => {
    expect(parseScore('75 16 14-16')).toEqual({
      kind: 'sets',
      winnerSide: 2,
      sets: [{ w: 5, l: 7 }, { w: 6, l: 1 }, { w: 16, l: 14, stb: true }],
    });
    expect(parseScore('57-26')).toEqual({ kind: 'sets', winnerSide: 2, sets: [{ w: 7, l: 5 }, { w: 6, l: 2 }] });
  });
  it('dashes between sets', () => {
    expect(parseScore('64-46 10-8')).toEqual({
      kind: 'sets',
      winnerSide: 1,
      sets: [{ w: 6, l: 4 }, { w: 4, l: 6 }, { w: 10, l: 8, stb: true }],
    });
  });
  it('wo and tbc keep their text; nonsense stays raw; blank is empty', () => {
    expect(parseScore('wo')).toEqual({ kind: 'raw', text: 'wo' });
    expect(parseScore('W.O.')).toEqual({ kind: 'raw', text: 'W.O.' });
    expect(parseScore('tbc')).toEqual({ kind: 'raw', text: 'tbc' });
    expect(parseScore('63 36')).toEqual({ kind: 'raw', text: '63 36' });
    expect(parseScore('62 10 6')).toEqual({ kind: 'raw', text: '62 10 6' });
    expect(parseScore('')).toEqual({ kind: 'empty' });
  });
});

describe('parseTime', () => {
  it('dots, colons, short hours, stray characters, inheritance', () => {
    expect(parseTime('20.30')).toBe('20:30');
    expect(parseTime('20:30')).toBe('20:30');
    expect(parseTime('9:00')).toBe('09:00');
    expect(parseTime(' 18.00μμ ')).toBe('18:00');
    expect(parseTime('', '19:00')).toBe('19:00');
    expect(parseTime('ακολουθεί', '19:00')).toBe('19:00');
  });
});

describe('dateFromTab', () => {
  it('season year from the month, weekday checked', () => {
    expect(dateFromTab('ΣΑΒ 17/10', 2026)).toEqual({ date: '2026-10-17', weekdayOk: true });
    expect(dateFromTab('ΣΑΒ 18/10', 2026)).toEqual({ date: '2026-10-18', weekdayOk: false });
    expect(dateFromTab('Κυριακή 11.1', 2026)).toEqual({ date: '2027-01-11', weekdayOk: false });
    expect(dateFromTab('ΚΥΡ 10/1', 2026)).toEqual({ date: '2027-01-10', weekdayOk: true });
    expect(dateFromTab('18-10', 2026)).toEqual({ date: '2026-10-18', weekdayOk: null });
    expect(dateFromTab('Πρόγραμμα', 2026)).toBeNull();
    expect(dateFromTab('31/2', 2026)).toBeNull();
  });
});

describe('names', () => {
  it('sheet order and formal names give the app name key', () => {
    expect(nameKey('ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ')).toBe(nameKey('Βαγγέλης Καρδαμίτσης'));
    expect(nameKey('Παπαδόπουλος Ιωάννης')).toBe('γιαννησ παπαδοπουλοσ');
  });
  it('a side with «/» is a pair', () => {
    expect(splitSide('ΠΑΠΑΣ Γ. / ΝΙΚΟΥ Κ.')).toEqual(['ΠΑΠΑΣ Γ.', 'ΝΙΚΟΥ Κ.']);
  });
});

describe('parseCsv', () => {
  it('Greek Excel «;», quotes and CRLF', () => {
    expect(parseCsv('ΩΡΑ;PLAYER 1\r\n"9.00";"ΠΑΠΑΣ; Γ."\r\n')).toEqual([
      ['ΩΡΑ', 'PLAYER 1'],
      ['9.00', 'ΠΑΠΑΣ; Γ.'],
    ]);
    expect(parseCsv('a,b\n"x ""y""",z')).toEqual([
      ['a', 'b'],
      ['x "y"', 'z'],
    ]);
  });
});

describe('parseDay', () => {
  const csv = [
    'Open Γλυφάδας;;;;',
    'ΩΡΑ;ΚΑΤΗΓΟΡΙΑ;PLAYER 1;PLAYER 2;ΑΠΟΤΕΛΕΣΜΑ',
    '18.00;Ανδρών Β;ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ;ΡΟΔΙΤΗΣ ΝΙΚΟΛΑΟΣ;63 76',
    ';Διπλό;ΠΑΠΑΣ Γ. / ΝΙΚΟΥ Κ.;ΑΛΕΞΙΟΥ Δ. / ΒΛΑΧΟΣ Σ.;',
    '19:30;Ανδρών Β;ΓΚΟΤΣΗΣ ΔΗΜΗΤΡΙΟΣ;;',
  ].join('\n');

  it('columns by header name, a title row above the header is fine', () => {
    expect(findColumns(['ΑΠΟΤΕΛΕΣΜΑ', 'PLAYER 2', 'ΩΡΑ', 'PLAYER 1'])).toEqual({ score: 0, side2: 1, time: 2, side1: 3 });
  });

  it('rows, inherited times, doubles, scores, warnings', () => {
    const day = parseDay(parseCsv(csv));
    expect(day.rows).toHaveLength(2);
    expect(day.rows[0]).toMatchObject({ row: 3, time: '18:00', categoryRaw: 'Ανδρών Β', format: 'singles', score: { kind: 'sets', winnerSide: 1 } });
    expect(day.rows[1]).toMatchObject({ row: 4, time: '18:00', format: 'doubles', side1: ['ΠΑΠΑΣ Γ.', 'ΝΙΚΟΥ Κ.'], score: { kind: 'empty' } });
    expect(day.warnings).toEqual(['row 5: one side is empty']);
  });
});
