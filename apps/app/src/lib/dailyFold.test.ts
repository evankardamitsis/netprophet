import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetQuizResult, QuizCard } from '@netprophet/db';
import { dailyFold } from './dailyFold';

const el = getCopy('el');
const en = getCopy('en');
const card = (id: string, played: boolean): QuizCard => ({
  id,
  position: 1,
  family: 's',
  content: { tag: 'Σενάριο', q: 'q', options: [{ label: 'a' }, { label: 'b' }], players: [] },
  my_option: played ? 0 : null,
  split: null,
});
const quiz = (played: number, total = 6): GetQuizResult => ({
  quiz_day: '2026-10-13',
  required: 6,
  pro: false,
  awarded: played >= total,
  next_at: '2026-10-14T06:00:00Z',
  answered: played,
  cards: Array.from({ length: total }, (_, i) => card(`c${i}`, i < played)),
});

describe('dailyFold', () => {
  it('nothing today: no row', () => {
    expect(dailyFold(null, 0, el)).toEqual({ show: false, count: 0, preview: '' });
    expect(dailyFold(quiz(0, 0), 0, el).show).toBe(false);
  });
  it('the game not played counts one', () => {
    expect(dailyFold(quiz(0), 0, el)).toEqual({ show: true, count: 1, preview: 'Οι ερωτήσεις της ημέρας' });
    expect(dailyFold(quiz(3), 0, el).count).toBe(1);
  });
  it('every match to confirm counts', () => {
    expect(dailyFold(quiz(0), 1, el)).toEqual({ show: true, count: 2, preview: 'Οι ερωτήσεις της ημέρας · Ένα ματς να επιβεβαιώσεις' });
    expect(dailyFold(null, 3, el)).toEqual({ show: true, count: 3, preview: '3 ματς να επιβεβαιώσεις' });
    expect(dailyFold(null, 2, en).preview).toBe('2 matches to confirm');
  });
  it('once nothing waits, the row goes', () => {
    expect(dailyFold(quiz(6), 0, el).show).toBe(false);
    expect(dailyFold(null, 0, el).show).toBe(false);
    expect(dailyFold(quiz(6), 1, el)).toEqual({ show: true, count: 1, preview: 'Ένα ματς να επιβεβαιώσεις' });
  });
});
