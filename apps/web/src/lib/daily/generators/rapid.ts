// lib/daily/generators/rapid.ts
//
// The rapid round is not a card — it is a whole second run mode with its own
// clock, so it has its own shape and stays out of the GENERATORS registry.
// It unlocks after the daily run, once a streak is long enough to have earned it.

import { RAPID_QUESTIONS } from '../providers/mock';

export interface RapidQuestion {
    question: string;
    /** index into ['Λάθος', 'Σωστό'] */
    correctIndex: number;
}

export interface RapidRound {
    label: string;
    /** the full purse; a partial score takes a proportional slice */
    points: number;
    seconds: number;
    options: string[];
    questions: RapidQuestion[];
}

/** The streak that earns the round. */
export const RAPID_STREAK = 5;

export function buildRapidRound(): RapidRound {
    return {
        label: 'ΓΡΗΓΟΡΟΣ ΓΥΡΟΣ',
        points: 25,
        seconds: 18,
        options: ['Λάθος', 'Σωστό'],
        questions: RAPID_QUESTIONS,
    };
}

/** Answering three of five is worth three fifths of the purse. */
export function rapidAward(round: RapidRound, correct: number): number {
    return Math.round(round.points * (correct / round.questions.length));
}
