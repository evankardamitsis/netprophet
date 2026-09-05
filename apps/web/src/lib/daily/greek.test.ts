import { describe, expect, it } from 'vitest';
import {
    displayName, greekCaps, matchesLoosely, stripAccents, transliterate,
} from './greek';

describe('greekCaps', () => {
    it('drops accents, which toUpperCase does not', () => {
        expect(greekCaps('Σάββατο')).toBe('ΣΑΒΒΑΤΟ');
        expect('Σάββατο'.toUpperCase()).toBe('ΣΆΒΒΑΤΟ');
    });

    it('handles a whole date', () => {
        expect(greekCaps('Σάββατο 5 Σεπτεμβρίου')).toBe('ΣΑΒΒΑΤΟ 5 ΣΕΠΤΕΜΒΡΙΟΥ');
    });

    it('leaves Latin alone', () => {
        expect(greekCaps('Athens LTC')).toBe('ATHENS LTC');
    });
});

describe('stripAccents', () => {
    it('keeps the letters', () => {
        expect(stripAccents('Γεωργίου')).toBe('Γεωργιου');
        expect(stripAccents('ΐ')).toBe('ι');
    });
});

describe('matchesLoosely', () => {
    it('ignores accents and case', () => {
        expect(matchesLoosely('Α. Παππάς', 'παππας')).toBe(true);
        expect(matchesLoosely('Δ. Γεωργίου', 'ΓΕΩΡΓΙΟΥ')).toBe(true);
    });

    it('still says no when it should', () => {
        expect(matchesLoosely('Α. Παππάς', 'σταυρου')).toBe(false);
    });
});

describe('transliterate', () => {
    it('handles the roster', () => {
        expect(transliterate('Καραμάνος')).toBe('Karamanos');
        expect(transliterate('Γεωργίου')).toBe('Georgiou');
        expect(transliterate('Παππάς')).toBe('Pappas');
        expect(transliterate('Ιωάννου')).toBe('Ioannou');
    });

    it('resolves αυ by what follows it', () => {
        // before ρ, a voiced sound -> "av"
        expect(transliterate('Σταύρου')).toBe('Stavrou');
        // before τ, voiceless -> "af"
        expect(transliterate('ναύτης')).toBe('naftis');
    });

    it('keeps initials and separators', () => {
        expect(transliterate('Ν. Καραμάνος')).toBe('N. Karamanos');
        expect(transliterate('ΑΟ Κηφισιάς')).toBe('AO Kifisias');
    });

    it('title-cases an initial that expands to a digraph', () => {
        // Θ is a single letter, so it is an initial, not an acronym.
        expect(transliterate('Θ. Ιωάννου')).toBe('Th. Ioannou');
        expect(transliterate('Χ. Παππάς')).toBe('Ch. Pappas');
    });

    it('still upper-cases real acronyms', () => {
        expect(transliterate('ΟΑ Μαρουσιού')).toBe('OA Marousiou');
        expect(transliterate('ΤΚ Γλυφάδας')).toBe('TK Glyfadas');
    });

    it('leaves Latin text untouched', () => {
        expect(transliterate('Athens LTC')).toBe('Athens LTC');
    });
});

describe('displayName', () => {
    it('only transliterates for English', () => {
        expect(displayName('Δ. Γεωργίου', 'el')).toBe('Δ. Γεωργίου');
        expect(displayName('Δ. Γεωργίου', 'en')).toBe('D. Georgiou');
    });
});
