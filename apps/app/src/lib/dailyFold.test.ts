import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetQuizResult, QuizCard } from '@netprophet/db';
import { dailyFold } from './dailyFold';
import { QUIZ_FLIGHT_MS, quizFlightStuck, quizNeedsRead, quizStaleIn } from './quiz';

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
    expect(dailyFold(null, 0, el)).toEqual({ show: false, count: 0, preview: '', action: 'Δες' });
    expect(dailyFold(quiz(0, 0), 0, el).show).toBe(false);
  });
  it('the game not played counts one', () => {
    expect(dailyFold(quiz(0), 0, el)).toEqual({ show: true, count: 1, preview: 'Οι ερωτήσεις της ημέρας', action: 'Παίξε' });
    expect(dailyFold(quiz(3), 0, el).count).toBe(1);
  });
  it('every match to confirm counts', () => {
    expect(dailyFold(quiz(0), 1, el)).toEqual({ show: true, count: 2, preview: 'Οι ερωτήσεις της ημέρας · Ένα ματς να επιβεβαιώσεις', action: 'Παίξε' });
    expect(dailyFold(null, 3, el)).toEqual({ show: true, count: 3, preview: '3 ματς να επιβεβαιώσεις', action: 'Δες' });
    expect(dailyFold(null, 2, en).preview).toBe('2 matches to confirm');
  });
  it('once nothing waits, the row goes', () => {
    expect(dailyFold(quiz(6), 0, el).show).toBe(false);
    expect(dailyFold(null, 0, el).show).toBe(false);
    expect(dailyFold(quiz(6), 1, el)).toEqual({ show: true, count: 1, preview: 'Ένα ματς να επιβεβαιώσεις', action: 'Δες' });
  });
});

describe('a phone left on Σήμερα overnight (founder, 21 Oct)', () => {
  // yesterday's 12 cards, all played; today's 12, none played (what get_quiz returned for the founder)
  const yesterday: GetQuizResult = { ...quiz(12, 12), quiz_day: '2026-10-20', pro: true, next_at: '2026-10-21T06:00:00Z' };
  const today: GetQuizResult = { ...quiz(0, 12), quiz_day: '2026-10-21', pro: true, next_at: '2026-10-22T06:00:00Z' };
  const morning = new Date('2026-10-21T07:30:00Z');

  it('the held set from yesterday is finished, so «Για σένα» hides: that was the bug', () => {
    expect(dailyFold(yesterday, 0, el).show).toBe(false);
  });

  it('it is stale once the day turns, and Σήμερα knows when, with no focus event', () => {
    expect(quizNeedsRead({ quiz: yesterday, error: false }, false, morning)).toBe(true);
    expect(quizStaleIn(yesterday, new Date('2026-10-21T05:00:00Z'))).toBe(60 * 60 * 1000);
    expect(quizStaleIn(yesterday, morning)).toBe(0);
    expect(quizStaleIn(null, morning)).toBeNull();
  });

  it('read again, the new set shows with «Παίξε»', () => {
    expect(dailyFold(today, 0, el)).toMatchObject({ show: true, count: 1, action: 'Παίξε' });
  });

  it('a read stuck in a frozen socket stops blocking new ones', () => {
    expect(quizFlightStuck(0, QUIZ_FLIGHT_MS - 1)).toBe(false);
    expect(quizFlightStuck(0, QUIZ_FLIGHT_MS)).toBe(true);
  });
});
