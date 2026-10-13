// packages/copy/src/quizText.ts
//
// «Οι 6 της ημέρας»: the server sends card text with player tokens and the client fills in the grammar.
//   {p1}         Νίκος Ροδίτης       full name
//   {p1.first}   Νίκος               first name
//   {p1.o}       ο Νίκος Ροδίτης     article + nominative full name
//   {p1.o_first} ο Νίκος             article + first name
//   {p1.ton}     τον Νίκο Ροδίτη     article + accusative full name
//   {p1.ston}    στον Νίκο Ροδίτη    «στον» / «στην» + accusative full name
// pN refers to players[N - 1]. A player without a gender falls back to nameGender(first_name).

import { accusativeName, displayName, nameGender, type NameGender } from './greek';

export interface QuizTextPlayer {
    first_name: string;
    surname: string;
    gender?: NameGender | null;
}

const TOKEN = /\{p(\d+)(?:\.(first|o|o_first|ton|ston))?\}/g;

function fullName(p: QuizTextPlayer): string {
    return [p.first_name, p.surname].filter(Boolean).join(' ');
}

function renderToken(p: QuizTextPlayer, kind: string | undefined, locale: 'el' | 'en'): string {
    const g = nameGender(p.first_name, p.gender);
    if (locale === 'en') {
        // English has no articles or cases: just the name, in Latin script
        return displayName(kind === 'first' || kind === 'o_first' ? p.first_name : fullName(p), 'en');
    }
    const article = g === 'f' ? 'η' : 'ο';
    switch (kind) {
        case 'first': return p.first_name;
        case 'o': return `${article} ${fullName(p)}`;
        case 'o_first': return `${article} ${p.first_name}`;
        case 'ton': return `${g === 'f' ? 'την' : 'τον'} ${accusativeName(p.first_name, p.surname, g)}`;
        case 'ston': return `${g === 'f' ? 'στην' : 'στον'} ${accusativeName(p.first_name, p.surname, g)}`;
        default: return fullName(p);
    }
}

/** Fill the player tokens of one piece of card text. A token for a missing player is left as it is. */
export function renderQuizText(text: string, players: readonly QuizTextPlayer[], locale: 'el' | 'en' = 'el'): string {
    return text.replace(TOKEN, (whole, n: string, kind: string | undefined) => {
        const p = players[Number(n) - 1];
        return p ? renderToken(p, kind, locale) : whole;
    });
}

/** Upper-case the first letter, keeping its accent: «ο Νίκος προηγείται» -> «Ο Νίκος προηγείται». */
export function capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A card question: tokens filled, and capitalised because it can start with an article («Ο Νίκος Ροδίτης προηγείται…»). */
export function renderQuizQuestion(text: string, players: readonly QuizTextPlayer[], locale: 'el' | 'en' = 'el'): string {
    return capitalizeFirst(renderQuizText(text, players, locale));
}
