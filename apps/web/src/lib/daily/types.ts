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
    rating: number; streak: number; clay: number; hard: number;
    form: ('w' | 'l')[];
}

export type GameCard =
    | (CardBase & {
        kind: 'result'; a: PlayerRef; b: PlayerRef;
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
