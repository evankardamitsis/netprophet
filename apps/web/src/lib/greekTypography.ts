/**
 * Greek monotonic typography: all-caps labels should not keep tonos (ά → Α, not Ά).
 * Uses NFD decomposition and strips combining marks (Unicode Mn).
 */
export function stripMonotonicGreekAccents(input: string): string {
    if (!input) return input;
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .normalize('NFC');
}

/** Strip accents before CSS `uppercase` or all-caps styling when locale is Greek. */
export function prepGreekTextForUppercase(lang: 'en' | 'el', text: string): string {
    if (lang !== 'el' || !text) return text;
    return stripMonotonicGreekAccents(text);
}

/** First letter of a given name segment for badges / LASTNAME A. compact forms. */
export function firstInitialUpper(lang: 'en' | 'el', firstName: string): string {
    if (!firstName) return '';
    const base = lang === 'el' ? stripMonotonicGreekAccents(firstName) : firstName;
    const ch = base.charAt(0);
    return ch.toLocaleUpperCase(lang === 'el' ? 'el-GR' : 'en');
}
