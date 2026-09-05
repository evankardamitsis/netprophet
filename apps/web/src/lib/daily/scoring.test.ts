import { describe, expect, it } from 'vitest';
import {
    award, bankVote, comboMultiplier, halfAndShield, halfOf, keep,
    resolveAnswer, resolveDouble, type Score,
} from './scoring';

const fresh = (over: Partial<Score> = {}): Score => ({
    points: 0, pending: 0, combo: 0, shield: false, ...over,
});

describe('comboMultiplier', () => {
    it('starts flat and steps up with the streak', () => {
        expect(comboMultiplier(0)).toBe(1);
        expect(comboMultiplier(1)).toBe(1.25);
        expect(comboMultiplier(2)).toBe(1.5);
        expect(comboMultiplier(3)).toBe(1.75);
        expect(comboMultiplier(4)).toBe(2);
    });

    it('caps at x2 however long the streak runs', () => {
        expect(comboMultiplier(9)).toBe(2);
        expect(comboMultiplier(100)).toBe(2);
    });
});

describe('award', () => {
    it('rounds rather than truncates', () => {
        expect(award(10, 0)).toBe(10);
        expect(award(15, 1)).toBe(19);   // 18.75
        expect(award(15, 2)).toBe(23);   // 22.5
        expect(award(20, 4)).toBe(40);
    });
});

describe('halfOf', () => {
    it('rounds down', () => {
        expect(halfOf(20)).toBe(10);
        expect(halfOf(19)).toBe(9);
    });

    it('never returns nothing', () => {
        expect(halfOf(1)).toBe(1);
        expect(halfOf(0)).toBe(1);
    });
});

describe('resolveAnswer', () => {
    it('puts a correct answer on the table without banking it', () => {
        const s = resolveAnswer(fresh({ points: 50 }), 10, true);
        expect(s.pending).toBe(10);
        expect(s.points).toBe(50);
        expect(s.combo).toBe(1);
    });

    it('applies the multiplier the player already had', () => {
        expect(resolveAnswer(fresh({ combo: 2 }), 10, true).pending).toBe(15);
    });

    it('breaks the combo on a wrong answer', () => {
        const s = resolveAnswer(fresh({ combo: 3, pending: 20 }), 10, false);
        expect(s.combo).toBe(0);
        expect(s.pending).toBe(0);
    });

    it('spends the shield instead of the combo', () => {
        const s = resolveAnswer(fresh({ combo: 3, shield: true }), 10, false);
        expect(s.combo).toBe(3);
        expect(s.shield).toBe(false);
    });

    it('spends the shield only once', () => {
        const once = resolveAnswer(fresh({ combo: 3, shield: true }), 10, false);
        const twice = resolveAnswer(once, 10, false);
        expect(twice.combo).toBe(0);
        expect(twice.shield).toBe(false);
    });

    it('never costs both the shield and the combo', () => {
        const s = resolveAnswer(fresh({ combo: 2, shield: true }), 10, false);
        expect(s.shield === false && s.combo === 2).toBe(true);
    });
});

describe('keep / halfAndShield', () => {
    it('keep banks the whole table', () => {
        const s = keep(fresh({ points: 30, pending: 20 }));
        expect(s).toMatchObject({ points: 50, pending: 0, shield: false });
    });

    it('half banks half and buys a shield', () => {
        const s = halfAndShield(fresh({ points: 30, pending: 21 }));
        expect(s).toMatchObject({ points: 40, pending: 0, shield: true });
    });

    it('half leaves the combo alone', () => {
        expect(halfAndShield(fresh({ combo: 3, pending: 10 })).combo).toBe(3);
    });
});

describe('resolveDouble', () => {
    it('banks twice the table on a win', () => {
        const s = resolveDouble(fresh({ points: 10, pending: 20, combo: 1 }), true);
        expect(s).toMatchObject({ points: 50, pending: 0, combo: 2 });
    });

    it('costs the whole table on a loss', () => {
        const s = resolveDouble(fresh({ points: 10, pending: 20, combo: 3 }), false);
        expect(s).toMatchObject({ points: 10, pending: 0, combo: 0 });
    });

    it('lets the shield absorb the loss', () => {
        const s = resolveDouble(
            fresh({ points: 10, pending: 20, combo: 3, shield: true }), false,
        );
        expect(s).toMatchObject({ points: 10, pending: 0, combo: 3, shield: false });
    });
});

describe('bankVote', () => {
    it('pays flat and leaves the streak untouched', () => {
        const s = bankVote(fresh({ points: 10, combo: 2 }), 5);
        expect(s).toMatchObject({ points: 15, combo: 2, pending: 0 });
    });
});

describe('a whole run', () => {
    it('two correct, a vote, then double up and win', () => {
        let s = fresh();
        s = keep(resolveAnswer(s, 10, true));           // 10, combo 1
        s = keep(resolveAnswer(s, 20, true));           // +25 -> 35, combo 2
        s = bankVote(s, 5);                             // 40
        s = resolveAnswer(s, 15, true);                 // pending 23, combo 3
        s = resolveDouble(s, true);                     // +46 -> 86, combo 4
        expect(s).toMatchObject({ points: 86, pending: 0, combo: 4 });
    });

    it('half buys a shield that saves the next mistake', () => {
        let s = fresh();
        s = resolveAnswer(s, 20, true);                 // pending 20, combo 1
        s = halfAndShield(s);                           // 10 banked, shield on
        s = resolveAnswer(s, 10, false);                // shield absorbs
        expect(s).toMatchObject({ points: 10, combo: 1, shield: false });
    });
});
