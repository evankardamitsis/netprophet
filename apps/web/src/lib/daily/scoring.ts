// lib/daily/scoring.ts
//
// Every rule about points lives here, as pure functions over a small value
// object. No state, no DOM, no storage — so it can be reasoned about and tested
// on its own. See scoring.test.ts.
//
// The shape of a run's money:
//   points   banked, safe, yours
//   pending  on the table, won but not yet banked
//   combo    consecutive correct answers, drives the multiplier
//   shield   one free wrong answer that does not break the combo

export interface Score {
    points: number;
    pending: number;
    combo: number;
    shield: boolean;
}

/** Consecutive correct answers drive the multiplier, capped at x2. */
export function comboMultiplier(combo: number): number {
    if (combo >= 4) return 2;
    if (combo >= 3) return 1.75;
    if (combo >= 2) return 1.5;
    if (combo >= 1) return 1.25;
    return 1;
}

/** What a card is worth right now, given the streak the player is on. */
export function award(points: number, combo: number): number {
    return Math.round(points * comboMultiplier(combo));
}

/** Half the table, rounded down, but never nothing. */
export function halfOf(pending: number): number {
    return Math.max(1, Math.floor(pending / 2));
}

/**
 * A scoring card was answered. Correct puts the award on the table and extends
 * the combo — it does not bank. Wrong clears the table and costs either the
 * shield or the combo, never both.
 */
export function resolveAnswer(
    score: Score,
    cardPoints: number,
    correct: boolean,
): Score {
    if (correct) {
        return {
            ...score,
            pending: award(cardPoints, score.combo),
            combo: score.combo + 1,
        };
    }
    if (score.shield) {
        return { ...score, pending: 0, shield: false };
    }
    return { ...score, pending: 0, combo: 0 };
}

/** A poll, a vote or a taste card: always pays, never touches the combo. */
export function bankVote(score: Score, cardPoints: number): Score {
    return { ...score, points: score.points + cardPoints };
}

/** Κράτα — take what is on the table. */
export function keep(score: Score): Score {
    return { ...score, points: score.points + score.pending, pending: 0 };
}

/** Τα μισά — take half and walk away with a shield. */
export function halfAndShield(score: Score): Score {
    return {
        ...score,
        points: score.points + halfOf(score.pending),
        pending: 0,
        shield: true,
    };
}

/**
 * Διπλασίασε — the double-up question has been answered. Winning banks twice
 * the table and extends the combo; losing costs the whole table, and then the
 * shield or the combo on the same terms as a wrong card.
 */
export function resolveDouble(score: Score, correct: boolean): Score {
    if (correct) {
        return {
            ...score,
            points: score.points + score.pending * 2,
            pending: 0,
            combo: score.combo + 1,
        };
    }
    if (score.shield) {
        return { ...score, pending: 0, shield: false };
    }
    return { ...score, pending: 0, combo: 0 };
}
