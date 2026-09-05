// lib/daily/greek.ts
//
// The Greek-specific text handling the rest of the app should never reimplement.
// Pure functions, no React, no DOM — see greek.test.ts.

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

// ELOT 743, near enough for names. The English locale needs Latin script — a
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

        const ch = lower[i];
        out += SINGLES[ch] ?? ch;
        i += 1;
    }

    // Restore the original word's capitalisation shape. A single letter is an
    // initial, not an acronym — Θ. is "Th.", not "TH.", even though it is
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
    return text.split(/(\s+|[.·\-])/).map((part) =>
        /[Α-Ωα-ωάέήίόύώΐΰϊϋς]/.test(part) ? transliterateWord(part) : part,
    ).join('');
}

/** Names for display: Greek as written, Latin for the English locale. */
export function displayName(name: string, locale: 'el' | 'en'): string {
    return locale === 'en' ? transliterate(name) : name;
}
