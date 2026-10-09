import { describe, expect, it } from 'vitest';
import { el } from './el';
import { en } from './en';

// The hero counts what the run will deal, so the singular has to be right in
// both languages — "1 παιχνίδια σε περιμένουν" is the kind of thing a Greek
// tester notices immediately and an English-speaking reviewer never would.
describe('hub hero count', () => {
    it('agrees in number, in Greek', () => {
        expect(el.hub.today.heroOpen(1)).toBe('Ένα παιχνίδι σε περιμένει');
        expect(el.hub.today.heroOpen(4)).toBe('4 παιχνίδια σε περιμένουν');
    });

    it('agrees in number, in English', () => {
        expect(en.hub.today.heroOpen(1)).toBe('One game is waiting');
        expect(en.hub.today.heroOpen(4)).toBe('4 games are waiting');
    });
});
