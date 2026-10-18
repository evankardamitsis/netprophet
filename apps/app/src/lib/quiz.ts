import { capitalizeFirst, renderQuizQuestion, renderQuizText, type Copy } from '@netprophet/copy';
import type { AnswerCardResult, GetQuizResult, QuizCard } from '@netprophet/db';
import { fmt } from './votes';

/**
 * «Οι ερωτήσεις της ημέρας» view logic. The server decides what counts; this only turns its cards into text for the screens.
 */

/** a hyphen inside a score never breaks the line («6-6», «5-2») */
export function noBreak(text: string): string {
  return text.replace(/(\d)-(?=\d)/g, '$1-⁠');
}

export interface QuizCardView {
  id: string;
  family: QuizCard['family'];
  tag: string;
  question: string;
  /** the option names with the players filled in */
  options: string[];
  clues: string[];
  /** a dynamic card about this week */
  week: boolean;
  /** 0-based right option: a «Ποιος είναι;» card, or a dynamic card that has one («Θυμάσαι;») */
  right: number | null;
  mine: number | null;
  /** percent per option, only once answered and only when the server has enough answers */
  split: number[] | null;
}

export function cardView(card: QuizCard): QuizCardView {
  const players = card.content.players;
  return {
    id: card.id,
    family: card.family,
    tag: card.content.tag,
    question: noBreak(renderQuizQuestion(card.content.q, players)),
    options: card.content.options.map((o) => noBreak(renderQuizText(o.label, players))),
    clues: card.content.clues ?? [],
    week: card.content.week === true,
    right: card.family === 'q' || card.family === 'd' ? card.content.right ?? null : null,
    mine: card.my_option === null ? null : card.my_option - 1,
    split: card.my_option !== null && card.split && card.split.length === card.content.options.length ? card.split : null,
  };
}

/** the line under the options */
export function verdict(card: QuizCard, t: Copy): string {
  const q = t.quiz;
  if (card.my_option === null) return card.family === 'q' ? q.pickWho : card.family === 'o' ? q.pickOpinion : q.pick;
  // opinions and dynamic votes have no right answer and no level line (prototype: dyn cards are not scenarios); a
  // dynamic card about a result («Θυμάσαι;», 14 Oct) has one and is judged like «Ποιος είναι;»
  if (card.family === 'o' || (card.family === 'd' && (card.content.right === undefined || card.content.right === null))) return '';
  if (card.family === 'd') {
    const r = card.content.right!;
    // a result card says what happened («Ο Νίκος κέρδισε 6-3, 6-4.»); others name the right player
    const fact = card.content.reveal ?? `{p${r + 1}.o}.`;
    return (card.my_option - 1 === r ? t.quiz.right : t.quiz.wrong) + capitalizeFirst(renderQuizText(fact, card.content.players));
  }
  if (card.family !== 'q') return q.counted;
  const right = card.content.right;
  if (right === undefined || right === null) return '';
  const fact = capitalizeFirst(renderQuizText(`{p${right + 1}.o}.`, card.content.players));
  return (card.my_option - 1 === right ? q.right : q.wrong) + fact;
}

/** where the game opens: the first card not answered yet, else the first card */
export function firstUnanswered(cards: QuizCard[]): number {
  const i = cards.findIndex((c) => c.my_option === null);
  return i < 0 ? 0 : i;
}

export interface StripView {
  head: string;
  sub: string;
  /** one per card, true = played */
  segs: boolean[];
  /** every card played today */
  allDone: boolean;
  /** the «Παίξε ›» / «Συνέχισε ›» pill; null once everything is played */
  cta: string | null;
  /** «+30» until it is paid */
  badge: boolean;
  /** played them all without Pro: «Άλλες 6 κάθε μέρα με το Pro ›» */
  more: string | null;
}

export function stripView(quiz: GetQuizResult, t: Copy): StripView {
  const total = quiz.cards.length;
  const played = quiz.cards.filter((c) => c.my_option !== null).length;
  const allDone = total > 0 && played >= total;
  return {
    head: fmt(t.quiz.head, { n: total }),
    sub: allDone
      ? t.quiz.done
      : played > 0
        ? fmt(t.quiz.progress, { n: played, total })
        : quiz.pro
          ? t.quiz.subTwelve
          : t.quiz.subSix,
    segs: quiz.cards.map((c) => c.my_option !== null),
    allDone,
    cta: allDone ? null : played > 0 ? t.quiz.resume : t.quiz.play,
    badge: !quiz.awarded,
    more: allDone && !quiz.pro ? t.quiz.more : null,
  };
}

/** the quiz with one answer applied: from the server's reply, or (no reply yet) just the pick */
export function withAnswer(quiz: GetQuizResult, cardId: string, option: number, res?: AnswerCardResult): GetQuizResult {
  const card = quiz.cards.find((c) => c.id === cardId);
  if (!card || (card.my_option !== null && !res)) return quiz;
  const first = card.my_option === null;
  return {
    ...quiz,
    answered: res ? res.answered : first ? quiz.answered + 1 : quiz.answered,
    awarded: quiz.awarded || (res?.awarded ?? 0) > 0,
    cards: quiz.cards.map((c) =>
      c.id !== cardId
        ? c
        : {
            ...c,
            my_option: option,
            split: res ? res.split : c.split,
            content: res && res.right !== null && c.content.right === undefined ? { ...c.content, right: res.right } : c.content,
          },
    ),
  };
}

/** the quiz with one pick taken back (the answer failed) */
export function withoutAnswer(quiz: GetQuizResult, cardId: string): GetQuizResult {
  const card = quiz.cards.find((c) => c.id === cardId);
  if (!card || card.my_option === null) return quiz;
  return {
    ...quiz,
    answered: Math.max(0, quiz.answered - 1),
    cards: quiz.cards.map((c) => (c.id === cardId ? { ...c, my_option: null, split: null } : c)),
  };
}
