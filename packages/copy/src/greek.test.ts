import { describe, expect, it } from 'vitest';
import {
    accusativeName, accusativeWord, displayName, greekCaps, matchesLoosely, nameGender, stripAccents, transliterate, withArticleAccusative, levelNumber, tidyName, nameShapeOk, nameKey, sameNamedPerson } from './greek';
import nameVectors from '../../core/test-vectors/name-keys.json';

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

describe('names in a sentence', () => {
    it('guesses gender from the first name, capitals included', () => {
        expect(nameGender('Νίκος')).toBe('m');
        expect(nameGender('ΓΙΑΝΝΗΣ')).toBe('m');
        expect(nameGender('Μαρία')).toBe('f');
        expect(nameGender('ΕΛΕΝΗ')).toBe('f');
        expect(nameGender('Αντρέι')).toBe('m');
        expect(nameGender('Μαρία', 'm')).toBe('m');
    });
    it('puts masculine names in the accusative and leaves the rest', () => {
        expect(accusativeWord('Νίκος', 'm')).toBe('Νίκο');
        expect(accusativeWord('Ροδίτης', 'm')).toBe('Ροδίτη');
        expect(accusativeWord('Παππάς', 'm')).toBe('Παππά');
        expect(accusativeWord('ΧΟΛΕΒΑΣ', 'm')).toBe('ΧΟΛΕΒΑ');
        expect(accusativeWord('Ντίρζου', 'm')).toBe('Ντίρζου');
        expect(accusativeWord('Ostapov', 'm')).toBe('Ostapov');
        expect(accusativeWord('Καρράς', 'f')).toBe('Καρράς');
    });
    it('builds the article and the full name', () => {
        expect(withArticleAccusative('Νίκος', 'Ροδίτης')).toBe('τον Νίκο Ροδίτη');
        expect(withArticleAccusative('Αντρέι', 'Ντίρζου')).toBe('τον Αντρέι Ντίρζου');
        expect(withArticleAccusative('Μαρία', 'Καρρά')).toBe('την Μαρία Καρρά');
        expect(withArticleAccusative('ΒΑΓΓΕΛΗΣ', 'ΚΑΡΔΑΜΙΤΣΗΣ')).toBe('τον ΒΑΓΓΕΛΗ ΚΑΡΔΑΜΙΤΣΗ');
        expect(withArticleAccusative('Γιώργος', 'Δεσύπρης')).toBe('τον Γιώργο Δεσύπρη');
    });
});

describe('accusativeName', () => {
  it('drops the final -ς of masculine names, keeps feminine ones', () => {
    expect(accusativeName('Δημήτρης', 'Γκότσης')).toBe('Δημήτρη Γκότση');
    expect(accusativeName('Μαρία', 'Καρρά')).toBe('Μαρία Καρρά');
  });
});

describe('levelNumber', () => {
  it('halves with a Greek comma, never rounded up', () => {
    expect(levelNumber(4)).toBe('4');
    expect(levelNumber(4.5)).toBe('4,5');
    expect(levelNumber(4.49)).toBe('4');
    expect(levelNumber(3.99)).toBe('3,5');
    expect(levelNumber(4.5, 'en')).toBe('4.5');
  });
});

describe('tidyName and nameShapeOk (the server runs the same rule)', () => {
    it('title-cases ALL CAPS and all lower case, with a final sigma', () => {
        expect(tidyName('  ΑΛΚΙΒΙΑΔΗΣ  ')).toBe('Αλκιβιαδης');
        expect(tidyName('αλκιβιάδης')).toBe('Αλκιβιάδης');
        expect(tidyName('ΠΑΠΑΔΟΠΟΥΛΟΣ - ΓΚΙΚΑΣ')).toBe('Παπαδοπουλος-Γκικας');
        expect(tidyName("o'brien")).toBe("O'Brien");
    });

    it('keeps mixed case and collapses spaces', () => {
        expect(tidyName('McDonald')).toBe('McDonald');
        expect(tidyName('Άννα   Μαρία')).toBe('Άννα Μαρία');
    });

    it('accepts real names', () => {
        for (const n of ['Αλκιβιάδης', 'Ζωή-Ελένη', 'Chloë', 'Li', "D'Angelo", 'Άννα Μαρία']) expect(nameShapeOk(n)).toBe(true);
    });

    it('refuses initials, digits, emoji and loose separators', () => {
        for (const n of ['', 'Α', 'Α.', 'Nikos99', '-Νίκος', 'Νίκος  Π', '😀😀', 'Νίκος-']) expect(nameShapeOk(n)).toBe(false);
    });
});

describe('nameKey and sameNamedPerson (a sheet name against a roster name)', () => {
    it('folds case, accents, dots and Latin lookalikes', () => {
        expect(nameKey('Καραγιανίδης  Χάρης')).toBe('ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡΗΣ');
        expect(nameKey('ΓΙΑΝΝΟΠΟΥΛΟΣ Λ.')).toBe('ΓΙΑΝΝΟΠΟΥΛΟΣ Λ');
        expect(nameKey('KAKKABHΣ')).toBe('ΚΑΚΚΑΒΗΣ');
        expect(nameKey('Smith')).toBe('SMITH');
    });

    it('matches a cut first name, a missing one, and nothing else', () => {
        expect(sameNamedPerson('ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ', 'Καραγιανίδης', 'Χάρης')).toBe(true);
        expect(sameNamedPerson('ΑΝΑΣΤΑΣΙΟΥ', 'Αναστασίου', 'Πέτρος')).toBe(true);
        expect(sameNamedPerson('ΓΚΙΝΗ ΜΑΡΙΑ', 'Γκίνη', '')).toBe(true);
        expect(sameNamedPerson('ΚΑΚΚΑΒΗΣ ΚΩΝ', 'KAKKABHΣ', 'Κωνσταντίνος')).toBe(true);
        expect(sameNamedPerson('ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ', 'Καραγιανίδης', 'Νίκος')).toBe(false);
        expect(sameNamedPerson('ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ', 'Καραγιάννης', 'Χάρης')).toBe(false);
    });

    it('takes a doubled letter and a longer form of the first name', () => {
        expect(sameNamedPerson('ΜΠΡΙΛΛΑΚΗΣ ΒΑΣΙΛΗΣ', 'Μπριλάκης', 'Βασίλης')).toBe(true);
        expect(sameNamedPerson('ΤΖΙΩΤΖΙΟΣ ΒΑΣΙΛΗΣ', 'Τζιότζιος', 'Βασίλης')).toBe(true);
        expect(sameNamedPerson('ΜΑΝΤΖΑΒΙΝΟΣ ΔΗΜΗΤΡΗΣ', 'Ματζαβίνος', 'Δημήτρης')).toBe(true);
        expect(sameNamedPerson('ΜΠΑΡΟΥΝΑΣ ΑΝΤΩΝΙΟΣ', 'Μπαρούνας', 'Αντώνης')).toBe(true);
        expect(sameNamedPerson('ΛΑΜΠΡΟΠΟΥΛΟΣ ΝΙΚΟΛΑΟΣ', 'Λαμπρόπουλος', 'Νίκος')).toBe(true);
        expect(sameNamedPerson('ΡΟΔΙΤΗΣ ΓΙΑΝΝΗΣ', 'Ροδίτης', 'Νίκος', true)).toBe(true);
    });
});

/** the shared vectors: core.name_key and core.same_named_person run the same file (supabase-v2/tests/141_player_dedupe) */
describe('name-keys vectors (the database runs the same cases)', () => {
    const group = (fn: string) => nameVectors.groups.find((g) => g.fn === fn)?.cases ?? [];
    it.each(group('nameKey').map((c) => [c.name, c] as const))('nameKey: %s', (_n, c) => {
        expect(nameKey(c.input as string)).toBe(c.expected);
    });
    it.each(group('sameNamedPerson').map((c) => [c.name, c] as const))('sameNamedPerson: %s', (_n, c) => {
        const i = c.input as { sheet: string; surname: string; first: string; anyFirst: boolean };
        expect(sameNamedPerson(i.sheet, i.surname, i.first, i.anyFirst)).toBe(c.expected);
    });
});
