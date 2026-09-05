// lib/daily/generators/guess.ts
//
// `guess` shares its shape with `score` — options, one correct, plus the
// optional clue stack that `OptionList` renders above them.
//
// The prototype ships no card of this kind, and inventing the Greek copy for
// one is not this branch's call to make. The generator is registered and
// returns nothing until real copy exists; `OptionList` already supports clues,
// so a card dropped in here needs no component work.

import type { GameCard } from '../types';

export function generateGuessCards(): GameCard[] {
    return [];
}
