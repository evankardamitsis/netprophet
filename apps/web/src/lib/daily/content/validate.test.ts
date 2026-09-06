import { describe, expect, it } from 'vitest';
import { isExpired, textsOf, validateCard } from './validate';
import type { GameCard } from '../types';

const base = {
    id: 'x', kicker: 'Προημιτελικός', question: 'Ποιος κέρδισε;',
    points: 10, reveal: 'instant' as const, explanation: 'Κάτι έγινε.', scoring: true,
};

// `Extract<GameCard, { kind: 'score' }>` resolves to never — the union member is
// `kind: 'score' | 'guess'`, which is not assignable to `{ kind: 'score' }`.
const score = (over: Record<string, unknown> = {}): GameCard => ({
    ...base, kind: 'score', options: ['2-0 σε δύο σετ', '2-1 στο σούπερ τάι μπρέικ'],
    correctIndex: 1, ...over,
} as unknown as GameCard);

const rules = (card: GameCard, locale: 'el' | 'en' = 'el') =>
    validateCard(card, locale).issues.map((i) => i.rule);

describe('banned vocabulary', () => {
    it('matches Greek regardless of accent', () => {
        // \b does not work in Greek, and the accent moves — both are covered
        expect(rules(score({ explanation: 'Τα κερδη σου.' })))
            .toContain('banned-vocabulary');
        expect(rules(score({ explanation: 'Τα κέρδη σου.' })))
            .toContain('banned-vocabulary');
    });

    it('blocks Greek gambling words', () => {
        expect(rules(score({ explanation: 'Τα κέρδη σου είναι 40.' })))
            .toContain('banned-vocabulary');
        expect(rules(score({ question: 'Δες το δελτίο σου.' })))
            .toContain('banned-vocabulary');
    });

    it('blocks the English equivalents too — the pivot applies in both', () => {
        const card = score({
            question: 'Place your bet', explanation: 'Check the odds.',
            options: ['one', 'two'],
        });
        expect(rules(card, 'en')).toContain('banned-vocabulary');
    });

    it('leaves "απόδοση" alone when it means performance', () => {
        expect(rules(score({ kicker: 'Η απόδοσή του στο χώμα' })))
            .not.toContain('banned-vocabulary');
    });
});

describe('copy regressions', () => {
    it('catches the fixes that must stay fixed', () => {
        expect(rules(score({ explanation: 'Η ασφάλεια σεριού σε έσωσε.' })))
            .toContain('copy-regression');
        expect(rules(score({ question: 'Διάλεξε το δίδυμό σου.' })))
            .toContain('copy-regression');
    });

    it('catches an accented variant — declension moves the accent', () => {
        // δίδυμο -> δίδυμό σου; a literal pattern would miss this
        expect(rules(score({ explanation: 'Το δίδυμό σου βγήκε.' })))
            .toContain('copy-regression');
        expect(rules(score({ explanation: 'Χάθηκε η ασφάλεια σεριού.' })))
            .toContain('copy-regression');
    });
});

describe('same-day framing', () => {
    it('rejects "χθες" — results can be five days old', () => {
        expect(rules(score({ question: 'Ποιος κέρδισε χθες;' })))
            .toContain('same-day-framing');
    });

    it('rejects "yesterday" as well', () => {
        expect(rules(score({ question: 'Who won yesterday?', options: ['a', 'b'] }), 'en'))
            .toContain('same-day-framing');
    });
});

describe('distractors', () => {
    it('rejects two options that mean the same thing', () => {
        expect(rules(score({ options: ['2-0 σε δύο σετ', '2-0 σε δύο σετ'] })))
            .toContain('duplicate-options');
    });

    it('rejects an option conspicuously longer than the rest', () => {
        expect(rules(score({
            options: ['2-0', '2-1 στο σούπερ τάι μπρέικ μετά από δύο ώρες και δεκατέσσερα λεπτά'],
        }))).toContain('option-length-tell');
    });

    it('passes a well-formed set', () => {
        expect(validateCard(score(), 'el').ok).toBe(true);
    });
});

describe('answers have to be on the card', () => {
    it('rejects a correctIndex past the end', () => {
        expect(rules(score({ correctIndex: 5 }))).toContain('answer-out-of-range');
    });

    it('indexes rows, not options, for an upset', () => {
        const upset = {
            ...base, kind: 'upset',
            rows: [{ label: 'Α – Β', right: '6-2 6-1' }, { label: 'Γ – Δ', right: '7-6 6-4' }],
            correctIndex: 1,
        } as GameCard;
        expect(validateCard(upset, 'el').ok).toBe(true);
    });

    it('rejects a result whose winner is neither side', () => {
        const player = {
            id: 'p1', name: 'Α', club: 'Κ', ntrp: '4.0', rating: 1, streak: 0,
            clay: 0, hard: 0, form: [] as ('w' | 'l')[],
        };
        const card = {
            ...base, kind: 'result',
            a: { id: 'p1', players: [player] },
            b: { id: 'p2', players: [{ ...player, id: 'p2' }] },
            correctId: 'p9', crowdSplit: [50, 50],
        } as GameCard;
        expect(rules(card)).toContain('answer-not-on-card');
    });

    it('rejects a combo with no choice left to make', () => {
        const card = {
            ...base, kind: 'combo', scoring: false,
            rows: [{ label: 'a', right: '1' }, { label: 'b', right: '2' }],
            pickCount: 2,
        } as GameCard;
        expect(rules(card)).toContain('no-choice');
    });
});

describe('textsOf', () => {
    it('reaches every player-visible string', () => {
        const texts = textsOf(score({ lede: 'Μια σκέψη' }));
        expect(texts).toContain('Μια σκέψη');
        expect(texts).toContain('2-1 στο σούπερ τάι μπρέικ');
    });
});

describe('isExpired', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    it('never expires a finished result', () => {
        expect(isExpired(null, now)).toBe(false);
    });
    it('expires a stale standings card', () => {
        expect(isExpired('2026-09-01T00:00:00Z', now)).toBe(true);
        expect(isExpired('2026-09-20T00:00:00Z', now)).toBe(false);
    });
});
