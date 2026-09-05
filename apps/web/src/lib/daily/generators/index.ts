// lib/daily/generators/index.ts
//
// Card kind -> generator. Every generator returns finished `GameCard`s in the
// requested locale, built from the mock provider.
//
// Cards carry plain strings rather than localised pairs because `types.ts` is
// pinned by the port spec — and because the real generator will work the same
// way: it writes each locale's text once, at generation time, under review.

import type { Locale } from '../copy';
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

export type Generator = (locale: Locale) => GameCard[];

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
export function allCards(locale: Locale): GameCard[] {
    return Object.values(GENERATORS).flatMap((generate) => generate(locale));
}
