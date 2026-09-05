// lib/daily/generators/index.ts
//
// Card kind -> generator. Every generator returns finished `GameCard`s built
// from the mock provider; the session picks from whatever is registered here.

import type { CardKind, GameCard } from '../types';
import { generateAwardCards } from './award';
import { generateComboCards } from './combo';
import { generateGuessCards } from './guess';
import { generateOrderCards } from './order';
import { generatePollCards } from './poll';
import { generateResultCards } from './result';
import { generateScoreCards } from './score';
import { generateThisThatCards } from './thisThat';
import { generateUpsetCards } from './upset';

export type Generator = () => GameCard[];

export const GENERATORS: Record<CardKind, Generator> = {
    result: generateResultCards,
    score: generateScoreCards,
    poll: generatePollCards,
    upset: generateUpsetCards,
    order: generateOrderCards,
    guess: generateGuessCards,
    thisThat: generateThisThatCards,
    award: generateAwardCards,
    combo: generateComboCards,
};

/** Every card the registered generators can currently produce. */
export function allCards(): GameCard[] {
    return Object.values(GENERATORS).flatMap((generate) => generate());
}
