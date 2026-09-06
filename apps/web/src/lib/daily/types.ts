// lib/daily/types.ts
export type CardKind =
    | 'result' | 'score' | 'poll' | 'upset'
    | 'order' | 'guess' | 'thisThat' | 'award' | 'combo';

export type RevealStyle = 'instant' | 'scratch';

interface CardBase {
    id: string;              // stable, used for the seen-set
    kind: CardKind;
    kicker: string;          // e.g. 'Προημιτελικός · 2 ώρες 14 λεπτά'
    question: string;
    lede?: string;
    points: number;
    reveal: RevealStyle;
    explanation: string;     // shown after answering, may contain <b>
    scoring: boolean;        // false for poll/award/thisThat
}

export interface PlayerRef {
    id: string; name: string; club: string; ntrp: string;
    /**
     * Win rate, 0–100.
     *
     * The prototype called this `rating` and showed an ELO-like 1842. That
     * number belongs to the *game's* players — a user's standing on the
     * leaderboard — not to the tennis player a card is about. A tennis player's
     * standing here is NTRP, which has its own field, and their headline number
     * is how often they win.
     */
    winRate: number;
    streak: number; clay: number; hard: number;
    form: ('w' | 'l')[];
}

/**
 * One side of a match: a single player, or a doubles pair.
 *
 * Deviates from the port spec, which pinned `result` to `a: PlayerRef;
 * b: PlayerRef`. The measurement in the content spec §2.2 is the reason —
 * 42% of the real match pool is doubles, and excluding it drops the daily run
 * from eight cards to five. It is also exactly the shape padel needs.
 */
export interface SideRef {
    /** stable within a card; the joined player ids */
    id: string;
    /** one for singles, two for doubles */
    players: PlayerRef[];
}

export type GameCard =
    | (CardBase & {
        kind: 'result'; a: SideRef; b: SideRef;
        correctId: string; crowdSplit: [number, number]
    })
    | (CardBase & {
        kind: 'score' | 'guess'; options: string[];
        correctIndex: number; clues?: string[]
    })
    | (CardBase & { kind: 'poll' | 'award'; options: string[]; crowdSplit: number[] })
    | (CardBase & {
        kind: 'thisThat';
        options: { title: string; sub: string; gradient: string }[];
        crowdSplit: [number, number]
    })
    | (CardBase & {
        kind: 'upset'; rows: { label: string; right: string }[];
        correctIndex: number
    })
    | (CardBase & { kind: 'order'; items: PlayerRef[]; correctOrder: string[] })
    | (CardBase & {
        kind: 'combo'; rows: { label: string; right: string }[];
        pickCount: number
    });

export interface RunState {
    cards: GameCard[];
    index: number;
    points: number;      // banked this run
    pending: number;     // on the table, not yet banked
    combo: number;       // consecutive correct, drives multiplier
    shield: boolean;
    answers: Record<string, unknown>;
}
