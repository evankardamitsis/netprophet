// packages/copy/src/greek.ts
//
// The Greek-specific text handling the rest of the app should never reimplement.
// Pure functions, no React, no DOM: see greek.test.ts.

/** Combining accents, once a string is decomposed. */
const ACCENTS = /[̀-ͯ]/g;

/** Strip accents but keep the letters. Σάββατο -> Σαββατο */
export function stripAccents(text: string): string {
    return text.normalize('NFD').replace(ACCENTS, '').normalize('NFC');
}

/**
 * Greek drops its accents in all-caps: Σάββατο -> ΣΑΒΒΑΤΟ, not ΣΆΒΒΑΤΟ.
 * `toUpperCase()` alone keeps them, which reads as a typo to a Greek eye.
 */
export function greekCaps(text: string): string {
    return stripAccents(text.toUpperCase());
}

/** Accent- and case-insensitive contains, so "παππας" finds "Α. Παππάς". */
export function matchesLoosely(haystack: string, needle: string): boolean {
    const fold = (s: string) => stripAccents(s).toLowerCase();
    return fold(haystack).includes(fold(needle.trim()));
}

/* ================= transliteration ================= */

// ELOT 743, near enough for names. The English locale needs Latin script: a
// reader who does not know Greek cannot choose between two Greek names, which
// defeats the point of having an English locale at all.

/** After αυ/ευ, these make the υ a "v"; anything else makes it "f". */
const VOICED = new Set('βγδζλμνραεηιουω'.split(''));

const DIGRAPHS: [string, string][] = [
    ['αυ', 'a?'], ['ευ', 'e?'], ['ηυ', 'i?'],   // '?' resolved by context below
    ['ου', 'ou'], ['αι', 'ai'], ['ει', 'ei'], ['οι', 'oi'], ['υι', 'yi'],
    ['γγ', 'ng'], ['γκ', 'gk'], ['γξ', 'nx'], ['γχ', 'nch'],
    ['ντ', 'nt'], ['τσ', 'ts'], ['τζ', 'tz'],
];

const SINGLES: Record<string, string> = {
    α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
    κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r',
    σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

function transliterateWord(word: string): string {
    const lower = stripAccents(word).toLowerCase();
    let out = '';
    let i = 0;

    while (i < lower.length) {
        const pair = lower.slice(i, i + 2);
        const digraph = DIGRAPHS.find(([from]) => from === pair);

        if (digraph) {
            let [, to] = digraph;
            if (to.endsWith('?')) {
                // αυ -> av before a voiced sound, af otherwise. Σταύρου -> Stavrou.
                const next = lower[i + 2];
                to = to.slice(0, -1) + (next && VOICED.has(next) ? 'v' : 'f');
            }
            out += to;
            i += 2;
            continue;
        }

        // μπ is "b" at the start of a word, "mp" inside it.
        if (pair === 'μπ') {
            out += i === 0 ? 'b' : 'mp';
            i += 2;
            continue;
        }

        const ch = lower.charAt(i);
        out += SINGLES[ch] ?? ch;
        i += 1;
    }

    // Restore the original word's capitalisation shape. A single letter is an
    // initial, not an acronym: Θ. is "Th.", not "TH.", even though it is
    // technically all-caps and transliterates to two characters.
    const isAcronym = word.length > 1
        && word === word.toUpperCase()
        && word !== word.toLowerCase();
    if (isAcronym) return out.toUpperCase();
    if (word[0] && word[0] === word[0].toUpperCase()) {
        return out.charAt(0).toUpperCase() + out.slice(1);
    }
    return out;
}

/**
 * Καραμάνος -> Karamanos, Σταύρου -> Stavrou, Γεωργίου -> Georgiou.
 *
 * Deterministic and good enough for display. Some people spell their own name
 * differently on a passport; when that matters, store an override rather than
 * bending the rules here.
 */
export function transliterate(text: string): string {
    return text.split(/(\s+|[.·-])/).map((part) =>
        /[Α-Ωα-ωάέήίόύώΐΰϊϋς]/.test(part) ? transliterateWord(part) : part,
    ).join('');
}

/** Names for display: Greek as written, Latin for the English locale. */
export function displayName(name: string, locale: 'el' | 'en'): string {
    return locale === 'en' ? transliterate(name) : name;
}

/* ================= names in a sentence ================= */

export type NameGender = 'm' | 'f';

/**
 * Gender for grammar when the roster does not say: a first name ending in -ς is masculine (Νίκος, Γιάννης),
 * one ending in -α, -η, -ω or -ου is feminine (Μαρία, Ελένη, Κλειώ), anything else (Αντρέι, Nick) is masculine.
 * Works on capitals too (ΝΙΚΟΣ), which is how most v1 names are stored.
 */
export function nameGender(firstName: string, known?: NameGender | null): NameGender {
    if (known) return known;
    const f = stripAccents(firstName.trim()).toLowerCase();
    if (/[ςσ]$/.test(f)) return 'm';
    if (/(α|η|ω|ου)$/.test(f)) return 'f';
    return 'm';
}

/**
 * Accusative of one name word. Masculine Greek words drop the final -ς after a vowel
 * (Νίκος -> Νίκο, Ροδίτης -> Ροδίτη, Παππάς -> Παππά, ΧΟΛΕΒΑΣ -> ΧΟΛΕΒΑ); feminine words and
 * non-Greek words stay as they are (Μαρία, Ντίρζου, Ostapov).
 */
export function accusativeWord(word: string, gender: NameGender): string {
    if (gender === 'f') return word;
    return word.replace(/([αεηιουωάέήίόύώϊϋΐΰΑΕΗΙΟΥΩΆΈΉΊΌΎΏΪΫ])[ςσΣ]$/u, '$1');
}

/** «Νίκο Ροδίτη», «Μαρία Καρρά»: the full name in the accusative, no article («με Νίκο Ροδίτη»). */
export function accusativeName(firstName: string, surname: string, known?: NameGender | null): string {
    const g = nameGender(firstName, known);
    return [firstName, surname]
        .filter(Boolean)
        .map((part) => part.split(/\s+/).map((w) => accusativeWord(w, g)).join(' '))
        .join(' ');
}

/** «τον Νίκο Ροδίτη», «την Μαρία Καρρά»: article plus the full name in the accusative. */
export function withArticleAccusative(firstName: string, surname: string, known?: NameGender | null): string {
    const g = nameGender(firstName, known);
    return `${g === 'f' ? 'την' : 'τον'} ${accusativeName(firstName, surname, g)}`;
}

/** «4», «4,5»: levels go in halves (founder, 12 Oct 2026); Greek writes the decimal with a comma */
export function levelNumber(level: number, locale: 'el' | 'en' = 'el'): string {
    const text = String(Math.floor(level * 2) / 2);
    return locale === 'el' ? text.replace('.', ',') : text;
}

/**
 * The letters a person's name may have: Greek and Latin (accents and diaeresis included). Spelled out rather than
 * \p{L}, so the server (core.name_letters in 20270227000000_identity_checks.sql) checks exactly the same set.
 */
const NAME_LETTER = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u0386\\u0388-\\u03FF\\u1F00-\\u1FFF';
const NAME_SHAPE = new RegExp(`^[${NAME_LETTER}]+(?:[ '’-][${NAME_LETTER}]+)*$`);
const NOT_LETTER = new RegExp(`[^${NAME_LETTER}]`, 'g');

/**
 * A first name or a surname as typed, tidied: trimmed, one space between words, none round a hyphen or apostrophe.
 * ALL CAPS or all lower case becomes proper case per word part («ΑΛΚΙΒΙΑΔΗΣ» -> «Αλκιβιαδης», «αλκιβιάδης» ->
 * «Αλκιβιάδης»; capitals carry no accents, so none are invented). Mixed case stays as typed («McDonald»).
 */
export function tidyName(raw: string): string {
    const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim().replace(/ *(['’-]) */g, '$1');
    if (s.replace(NOT_LETTER, '') === '') return s;
    if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
    const titled = s.replace(/[^ '’-]+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    return titled.replace(/σ(?=$|[ '’-])/g, 'ς');
}

/** Letters, with an inner hyphen, apostrophe or single space, and at least 2 letters (the server's name_shape rule). */
export function nameShapeOk(name: string): boolean {
    return NAME_SHAPE.test(name) && name.replace(NOT_LETTER, '').length >= 2;
}

/* ================= one person under two spellings ================= */

/** Latin capitals that look like Greek ones, as some sheets and rosters type them («KAKKABHΣ») */
const LOOKALIKE: Record<string, string> = {
    A: 'Α', B: 'Β', E: 'Ε', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', X: 'Χ', Y: 'Υ', Z: 'Ζ',
};

/**
 * A name folded for comparing, never for showing: capitals, no accents, no dots, one space, and Latin lookalikes read
 * as Greek when the name has any Greek letter. «Καραγιανίδης Χάρης» and «ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ.» fold to
 * «ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡΗΣ» and «ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ».
 */
export function nameKey(text: string): string {
    const caps = greekCaps(text.normalize('NFC')).replace(/[.·,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/[Α-Ω]/.test(caps)) return caps;
    return caps.replace(/[A-Z]/g, (c) => LOOKALIKE[c] ?? c);
}

/**
 * The same person, written once by a sheet («ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ», surname first, the first name cut short or missing)
 * and once by the roster (surname, first name): the surname is the same (a doubled letter aside: «ΜΠΡΙΛΛΑΚΗΣ» is
 * «Μπριλάκης»), and the first names agree where both are given: one starts with the other («ΧΑΡ», «Χάρης») or they
 * share their first four letters («Αντώνης», «ΑΝΤΩΝΙΟΣ»; «Νίκος», «ΝΙΚΟΛΑΟΣ»). `anyFirst` leaves first names out,
 * for an opponent already pinned down by the match.
 */
export function sameNamedPerson(sheet: string, surname: string, firstName: string, anyFirst = false): boolean {
    // spelled as it sounds: «ΤΖΙΩΤΖΙΟΣ» is «Τζιότζιος», «ΜΠΡΙΛΛΑΚΗΣ» is «Μπριλάκης»
    const single = (s: string) =>
        s.replace(/ΕΙ|ΟΙ|Η|Υ/g, 'Ι').replace(/ΑΙ/g, 'Ε').replace(/Ω/g, 'Ο').replace(/ΝΤ/g, 'Τ').replace(/ΜΠ/g, 'Π').replace(/(.)\1+/g, '$1');
    const raw = single(nameKey(sheet));
    const sur = single(nameKey(surname));
    if (!sur || !raw) return false;
    if (raw !== sur && !raw.startsWith(`${sur} `)) return false;
    const first = raw.slice(sur.length).trim();
    const known = single(nameKey(firstName));
    if (anyFirst || !first || !known) return true;
    const a = first.split(' ')[0]!;
    const b = known.split(' ')[0]!;
    return a.startsWith(b) || b.startsWith(a) || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4));
}
