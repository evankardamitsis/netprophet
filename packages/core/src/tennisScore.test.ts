import { describe, expect, it } from 'vitest';
import { formatSets, formatWinnerSets, parseTennisScore, toWinnerFirst } from './sports/tennisScore';

const ok = (raw: string) => {
  const r = parseTennisScore(raw);
  if (r.status !== 'ok') throw new Error(`${raw}: ${r.status} ${'reason' in r ? r.reason : ''}`);
  return r;
};

describe('parseTennisScore: the formats in the match data brief', () => {
  it('«63 76»: two sets, side 1 wins', () => {
    const r = ok('63 76');
    expect(r.sets).toEqual([{ a: 6, b: 3 }, { a: 7, b: 6 }]);
    expect(r.winner).toBe(1);
  });
  it('«62 36 10 6»: 1-1 then a match tie-break', () => {
    const r = ok('62 36 10 6');
    expect(r.sets).toEqual([{ a: 6, b: 2 }, { a: 3, b: 6 }, { a: 10, b: 6, stb: true }]);
    expect(r.winner).toBe(1);
  });
  it('«75 16 14-16»: a long match tie-break won by side 2', () => {
    const r = ok('75 16 14-16');
    expect(r.sets[2]).toEqual({ a: 14, b: 16, stb: true });
    expect(r.winner).toBe(2);
  });
  it('«57-26»: sets joined by a dash', () => {
    const r = ok('57-26');
    expect(r.sets).toEqual([{ a: 5, b: 7 }, { a: 2, b: 6 }]);
    expect(r.winner).toBe(2);
  });
  it('«64-46 10-8»', () => {
    const r = ok('64-46 10-8');
    expect(r.sets).toEqual([{ a: 6, b: 4 }, { a: 4, b: 6 }, { a: 10, b: 8, stb: true }]);
    expect(r.winner).toBe(1);
  });
  it('«wo» and «tbc» publish as text and settle nothing', () => {
    expect(parseTennisScore('wo')).toEqual({ status: 'wo', raw: 'wo' });
    expect(parseTennisScore('W/O').status).toBe('wo');
    expect(parseTennisScore('tbc')).toEqual({ status: 'tbc', raw: 'tbc' });
  });
});

describe('parseTennisScore: what admins type', () => {
  it('«6-3 7-5» and «6/3, 7/5»', () => {
    expect(ok('6-3 7-5').sets).toEqual([{ a: 6, b: 3 }, { a: 7, b: 5 }]);
    expect(ok('6/3, 7/5').winner).toBe(1);
  });
  it('set tie-breaks in brackets hold the loser’s points', () => {
    expect(ok('7-6(5) 6-4').sets[0]).toEqual({ a: 7, b: 6, tb: [7, 5] });
    expect(ok('76(10) 46 10-8').sets[0]).toEqual({ a: 7, b: 6, tb: [12, 10] });
    expect(ok('6-7(4) 6-3 10-7').sets[0]).toEqual({ a: 6, b: 7, tb: [4, 7] });
  });
  it('a third full set is a set, not a tie-break', () => {
    const r = ok('6-4 3-6 7-5');
    expect(r.sets[2]).toEqual({ a: 7, b: 5 });
  });
  it('retired: the unfinished set is kept and the side ahead is the winner', () => {
    const r = ok('6-3 2-1 ret');
    expect(r.retired).toBe(true);
    expect(r.winner).toBe(1);
    expect(r.sets).toEqual([{ a: 6, b: 3 }, { a: 2, b: 1 }]);
  });
  it('refuses what is not a score', () => {
    expect(parseTennisScore('6-3').status).toBe('invalid');
    expect(parseTennisScore('6-3 6-4 6-2').status).toBe('invalid');
    expect(parseTennisScore('9-3 6-4').status).toBe('invalid');
    expect(parseTennisScore('6-3 5').status).toBe('invalid');
  });
});

describe('toWinnerFirst / formatSets', () => {
  it('flips the sets when side 2 won, tie-breaks included', () => {
    const r = ok('6-7(4) 3-6');
    expect(toWinnerFirst(r.sets, r.winner)).toEqual([{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 3 }]);
  });
  it('keeps the match tie-break flag', () => {
    const r = ok('62 36 10 6');
    expect(toWinnerFirst(r.sets, r.winner)[2]).toEqual({ w: 10, l: 6, stb: true });
  });
  it('formats for a preview', () => {
    expect(formatSets(ok('7-6(5) 6-4').sets)).toBe('7-6(5), 6-4');
  });
});

describe('formatWinnerSets', () => {
  const words = { retired: 'ret.', walkover: 'w/o' };
  it('writes winner-first sets with the loser\'s tie-break points', () => {
    expect(formatWinnerSets([{ w: 6, l: 4 }, { w: 6, l: 7, tb: [5, 7] }, { w: 10, l: 8, stb: true }], {}, words)).toBe(
      '6-4, 6-7(5), 10-8',
    );
  });
  it('marks a retirement and a walkover', () => {
    expect(formatWinnerSets([{ w: 6, l: 3 }, { w: 2, l: 1 }], { retired: true }, words)).toBe('6-3, 2-1 ret.');
    expect(formatWinnerSets([], { walkover: true }, words)).toBe('w/o');
  });
});
