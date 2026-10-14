import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetQuizResult, QuizCard } from '@netprophet/db';
import { cardView, firstUnanswered, noBreak, stripView, verdict, withAnswer, withoutAnswer } from './quiz';

const el = getCopy('el');
const nikos = { id: 'p1', first_name: 'Νίκος', surname: 'Ροδίτης', gender: 'm' as const };
const ioanna = { id: 'p2', first_name: 'Ιωάννα', surname: 'Τσάκου', gender: 'f' as const };
const anna = { id: 'p3', first_name: 'Άννα', surname: 'Μάνου', gender: 'f' as const };

const vote = (id: string, over: Partial<QuizCard> = {}): QuizCard => ({
  id,
  position: 1,
  family: 's',
  content: { tag: 'Σενάριο', q: '{p1.o} προηγείται 5-2. Μπορεί {p2.o} να το γυρίσει;', options: [{ label: 'Ναι' }, { label: 'Όχι, το έχει {p1.o_first}' }], players: [nikos, ioanna] },
  my_option: null,
  split: null,
  ...over,
});
const who = (id: string, over: Partial<QuizCard> = {}): QuizCard => ({
  id,
  position: 2,
  family: 'q',
  content: { tag: 'Ποια είναι;', q: 'Τρία στοιχεία, μία παίκτρια.', clues: ['Βούλα', 'Level 5'], options: [{ label: '{p1}' }, { label: '{p2}' }, { label: '{p3}' }], right: 1, players: [anna, ioanna, nikos] },
  my_option: null,
  split: null,
  ...over,
});
const quiz = (cards: QuizCard[], over: Partial<GetQuizResult> = {}): GetQuizResult => ({
  quiz_day: '2026-10-13',
  required: 6,
  pro: false,
  awarded: false,
  next_at: '2026-10-14T06:00:00Z',
  answered: 0,
  cards,
  ...over,
});

describe('cardView', () => {
  it('fills the names and capitalises the question', () => {
    const v = cardView(vote('a'));
    expect(v.question).toBe('Ο Νίκος Ροδίτης προηγείται 5-⁠2. Μπορεί η Ιωάννα Τσάκου να το γυρίσει;');
    expect(v.options).toEqual(['Ναι', 'Όχι, το έχει ο Νίκος']);
  });
  it('hides the split until the player has answered, and when the server sent none', () => {
    expect(cardView(vote('a', { split: [60, 40] })).split).toBeNull();
    expect(cardView(vote('a', { my_option: 2, split: null })).split).toBeNull();
    expect(cardView(vote('a', { my_option: 2, split: [60, 40] })).split).toEqual([60, 40]);
    expect(cardView(vote('a', { my_option: 2, split: [60, 40] })).mine).toBe(1);
  });
  it('knows the right option only on a «Ποιος είναι;» card', () => {
    expect(cardView(who('w')).right).toBe(1);
    expect(cardView(vote('a')).right).toBeNull();
  });
});

describe('verdict', () => {
  it('asks before answering, by family', () => {
    expect(verdict(vote('a'), el)).toBe('Πάτα ένα.');
    expect(verdict(who('w'), el)).toBe('Εδώ υπάρχει σωστή απάντηση.');
    expect(verdict(vote('o', { family: 'o' }), el)).toBe('Εδώ δεν υπάρχει σωστό και λάθος.');
  });
  it('judges a «Θυμάσαι;» card (dynamic, with a right answer) like «Ποιος είναι;»; a dynamic vote has no verdict', () => {
    const recall = vote('r', { family: 'd', my_option: 2, content: { ...vote('r').content, tag: 'Θυμάσαι;', right: 1 } });
    expect(cardView(recall).right).toBe(1);
    expect(verdict(recall, el)).toMatch(/Ιωάννα/);
    expect(verdict(vote('d', { family: 'd', my_option: 1 }), el)).toBe('');
  });

  it('judges «Ποιος είναι;» and names the right player', () => {
    expect(verdict(who('w', { my_option: 2 }), el)).toBe('Σωστά. Η Ιωάννα Τσάκου.');
    expect(verdict(who('w', { my_option: 1 }), el)).toBe('Όχι αυτή τη φορά. Η Ιωάννα Τσάκου.');
  });
  it('counts a scenario and says nothing on an opinion', () => {
    expect(verdict(vote('a', { my_option: 1 }), el)).toBe('Μέτρησε. Δες τι είπαν οι άλλοι.');
    expect(verdict(vote('o', { family: 'o', my_option: 1 }), el)).toBe('');
  });
  it('asks on a dynamic card and then says nothing, with «αυτή τη βδομάδα» only on the weekly', () => {
    expect(verdict(vote('d', { family: 'd' }), el)).toBe('Πάτα ένα.');
    expect(verdict(vote('d', { family: 'd', my_option: 1 }), el)).toBe('');
    const weekly = vote('w', { family: 'd' });
    expect(cardView({ ...weekly, content: { ...weekly.content, week: true } }).week).toBe(true);
    expect(cardView(vote('a')).week).toBe(false);
  });
});

describe('stripView', () => {
  const cards = (n: number, done: number) => Array.from({ length: n }, (_, i) => vote(`c${i}`, { my_option: i < done ? 1 : null }));
  it('starts with the sub line and «Παίξε ›»', () => {
    const v = stripView(quiz(cards(6, 0)), el);
    expect(v.head).toBe('Οι 6 της ημέρας');
    expect(v.sub).toBe('Έξι γρήγορες ερωτήσεις για παίκτες που ξέρεις.');
    expect(v.cta).toBe('Παίξε ›');
    expect(v.badge).toBe(true);
    expect(v.segs).toHaveLength(6);
  });
  it('counts progress and offers «Συνέχισε ›»', () => {
    const v = stripView(quiz(cards(6, 2)), el);
    expect(v.sub).toBe('2 από 6');
    expect(v.cta).toBe('Συνέχισε ›');
    expect(v.segs.filter(Boolean)).toHaveLength(2);
  });
  it('is done when every card is played; the badge goes once paid', () => {
    const v = stripView(quiz(cards(6, 6), { awarded: true }), el);
    expect(v.allDone).toBe(true);
    expect(v.sub).toBe('✓ Τις έπαιξες σήμερα.');
    expect(v.cta).toBeNull();
    expect(v.badge).toBe(false);
  });
  it('speaks of twelve for Pro', () => {
    const v = stripView(quiz(cards(12, 0), { pro: true }), el);
    expect(v.head).toBe('Οι 12 της ημέρας');
    expect(v.sub).toBe('Δώδεκα γρήγορες ερωτήσεις για παίκτες που ξέρεις.');
  });
});

describe('answers', () => {
  it('opens at the first unanswered card, else the first', () => {
    expect(firstUnanswered([vote('a', { my_option: 1 }), vote('b'), vote('c')])).toBe(1);
    expect(firstUnanswered([vote('a', { my_option: 1 })])).toBe(0);
  });
  it('shows the pick at once and takes it back', () => {
    const q = quiz([vote('a'), vote('b')]);
    const picked = withAnswer(q, 'a', 2);
    expect(picked.cards[0]!.my_option).toBe(2);
    expect(picked.answered).toBe(1);
    expect(picked.awarded).toBe(false);
    const back = withoutAnswer(picked, 'a');
    expect(back.cards[0]!.my_option).toBeNull();
    expect(back.answered).toBe(0);
  });
  it('takes the split, the right answer and the +30 from the server reply', () => {
    const q = quiz([who('w', { content: { ...who('w').content, right: undefined } })], { answered: 5 });
    const done = withAnswer(q, 'w', 3, { option: 3, right: 1, split: null, answered: 6, awarded: 30 });
    expect(done.answered).toBe(6);
    expect(done.awarded).toBe(true);
    expect(done.cards[0]!.content.right).toBe(1);
  });
  it('keeps hyphens in scores together', () => {
    expect(noBreak('6-6 και 5-2, όχι Ν-Β')).toBe('6-⁠6 και 5-⁠2, όχι Ν-Β');
  });
});
