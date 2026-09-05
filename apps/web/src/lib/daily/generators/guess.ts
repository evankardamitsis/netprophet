// lib/daily/generators/guess.ts
//
// `guess` shares its shape with `score` — options, one correct, plus the
// optional clue stack that `OptionList` renders above them.
//
// The prototype ships no card of this kind, and inventing the copy for one is
// not this branch's call to make. Registered and returning nothing until real
// copy exists; a card dropped in here needs no component work.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

export function generateGuessCards(_locale: Locale): GameCard[] {
    return [];
}
