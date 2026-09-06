// lib/daily/content/validate.ts
//
// The quality gate. Runs on every generated card and blocks publication on
// failure. Written before the generator on purpose — a linter written
// afterwards never gets written.
//
// Every rejection carries the rule it broke and the card that broke it. That
// log is the fastest read on where the generator is weak, and it is the raw
// material for the rules file the review loop feeds back on.

import type { Locale } from '../copy';
import { stripAccents } from '../greek';
import type { GameCard } from '../types';

/**
 * A word boundary that works in Greek.
 *
 * JavaScript's `\b` is defined against `\w`, which is ASCII only — so
 * `/\bκέρδη\b/` never matches "τα κέρδη σου", because neither the space nor
 * the kappa counts as a word character and no boundary exists between them.
 * Every Greek rule written with `\b` silently matches nothing, which is a
 * quiet way for a linter to pass everything.
 */
const word = (pattern: string) => new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, 'iu');

/**
 * Greek patterns are written without accents and matched against accent-stripped
 * text. Declension moves the accent — δίδυμο becomes δίδυμό σου, σερί becomes
 * σεριού — so a literal pattern catches one form and misses the rest.
 */
const fold = (text: string) => stripAccents(text);

/** No gambling vocabulary, in either language. Non-negotiable after the pivot. */
const BANNED: Record<Locale, RegExp[]> = {
    // accent-free; matched against folded text
    el: [
        word('κερδη'), word('δελτιο'), word('κουπονι'), word('παρολι'),
        word('στοιχημα'), word('τζογο[ςυ]?'), word('πονταρισμα'),
        // "απόδοση" is fine about a player's performance, banned as odds
        /αποδοση\s+(?:\d|νικης|αγωνα)/iu,
    ],
    en: [
        word('winnings'), word('slip'), word('coupon'), word('parlay'),
        word('bet(?:s|ting)?'), word('stake[sd]?'), word('wager'), word('odds'),
    ],
};

/** Copy fixes that must stay fixed — see CLAUDE.md. */
const REGRESSIONS: RegExp[] = [
    /σεριου/iu,          // σερί never declines
    /διδυμ[οα]/iu,       // it is a διπλή πρόβλεψη
    /το καρφι/iu,        // it is η ανατροπή
    /εκκρεμ[ηει]/iu,     // it is σε αναμονή
    /ανατροφοδοτηση/iu,  // it is δόνηση
    word('report'),      // it is ανάλυση παίκτη
];

/** Same-day framing does not survive a twice-weekly upload — content spec §2.1c. */
const SAME_DAY: Record<Locale, RegExp[]> = {
    el: [word('χθες'), /σημερα το πρωι/iu, /πριν απο λιγο/iu],
    en: [word('yesterday'), /this morning/iu, /just now/iu],
};

export interface Issue {
    rule: string;
    detail: string;
}

export interface Verdict {
    ok: boolean;
    issues: Issue[];
}

/** Every player-visible string on a card. */
export function textsOf(card: GameCard): string[] {
    const texts = [card.kicker, card.question, card.explanation];
    if (card.lede) texts.push(card.lede);
    if ('options' in card) {
        for (const option of card.options) {
            texts.push(typeof option === 'string' ? option : `${option.title} ${option.sub}`);
        }
    }
    if ('rows' in card) for (const row of card.rows) texts.push(row.label, row.right);
    if ('clues' in card && card.clues) texts.push(...card.clues);
    return texts.filter(Boolean);
}

function optionsOf(card: GameCard): string[] {
    if ('options' in card) {
        return card.options.map((o) => (typeof o === 'string' ? o : o.title));
    }
    if ('rows' in card) return card.rows.map((r) => r.label);
    return [];
}

export interface ValidateOptions {
    /**
     * Names that are allowed to be Latin inside Greek copy — tournaments,
     * venues, clubs. Without this every card from "TAF Tennis Open" is
     * rejected as English creeping into the Greek, which rejected 127 of 336
     * cards on the first real run.
     */
    properNouns?: string[];
}

export function validateCard(
    card: GameCard, locale: Locale, options: ValidateOptions = {},
): Verdict {
    const issues: Issue[] = [];
    const texts = textsOf(card);
    const add = (rule: string, detail: string) => issues.push({ rule, detail });

    for (const text of texts) {
        const probe = locale === 'el' ? fold(text) : text;
        for (const pattern of BANNED[locale]) {
            if (pattern.test(probe)) add('banned-vocabulary', `${pattern} in "${text}"`);
        }
        for (const pattern of SAME_DAY[locale]) {
            if (pattern.test(probe)) add('same-day-framing', `${pattern} in "${text}"`);
        }
        if (locale === 'el') {
            for (const pattern of REGRESSIONS) {
                if (pattern.test(probe)) add('copy-regression', `${pattern} in "${text}"`);
            }
            // Latin letters are fine in names and tournaments, not in prose.
            const allowed = new Set(
                (options.properNouns ?? [])
                    .flatMap((n) => n.split(/[\s·\-/]+/))
                    .map((w) => w.toLowerCase()),
            );
            const latinWords = text.match(/\b[A-Za-z]{4,}\b/g) ?? [];
            const suspicious = latinWords.filter((w) =>
                !/^(NTRP|LTC|Pro|NetProphet)$/i.test(w) && !allowed.has(w.toLowerCase()));
            if (suspicious.length > 2) {
                add('latin-in-greek', `"${suspicious.join(', ')}" in "${text}"`);
            }
        }
    }

    // Distractors decide whether a card is any good — content spec §4.4.
    const answers = optionsOf(card);
    const normalised = answers.map((o) => o.trim().toLowerCase().replace(/\s+/g, ' '));
    const duplicates = normalised.filter((o, i) => normalised.indexOf(o) !== i);
    if (duplicates.length) add('duplicate-options', duplicates.join(', '));

    if (answers.length > 1) {
        // A conspicuously longer option is a tell, whichever one it is. Compare
        // the longest against the mean of the others rather than a median that
        // includes it — with two options a median is the outlier itself.
        const lengths = answers.map((o) => o.length).sort((a, b) => a - b);
        const longest = lengths[lengths.length - 1];
        const rest = lengths.slice(0, -1);
        const mean = rest.reduce((n, l) => n + l, 0) / rest.length;
        if (mean > 0 && longest > mean * 2.2) {
            add('option-length-tell', `longest ${longest} vs ${mean.toFixed(0)} for the rest`);
        }
    }

    if ('correctIndex' in card) {
        // `upset` indexes rows, everything else indexes options.
        const answers = 'options' in card ? card.options.length : card.rows.length;
        if (card.correctIndex < 0 || card.correctIndex >= answers) {
            add('answer-out-of-range', `correctIndex ${card.correctIndex} of ${answers}`);
        }
    }
    if (card.kind === 'result') {
        const ids = [card.a.id, card.b.id];
        if (!ids.includes(card.correctId)) {
            add('answer-not-on-card', `correctId ${card.correctId} is neither side`);
        }
    }
    if (card.kind === 'order') {
        const items = new Set(card.items.map((p) => p.id));
        if (card.correctOrder.length !== card.items.length
            || !card.correctOrder.every((id) => items.has(id))) {
            add('answer-not-on-card', 'correctOrder does not match items');
        }
    }
    if (card.kind === 'combo' && card.pickCount >= card.rows.length) {
        add('no-choice', `pickCount ${card.pickCount} of ${card.rows.length} rows`);
    }

    if (!card.explanation.trim()) add('missing-explanation', card.id);
    if (!card.question.trim()) add('missing-question', card.id);

    return { ok: issues.length === 0, issues };
}

/** Cards derived from live standings expire; a stale card must never ship. */
export function isExpired(validUntil: string | null, now = new Date()): boolean {
    if (!validUntil) return false;
    return Date.parse(validUntil) <= now.getTime();
}

export function validateAll(
    cards: GameCard[], locale: Locale, options: ValidateOptions = {},
): {
    passed: GameCard[];
    rejected: { card: GameCard; issues: Issue[] }[];
} {
    const passed: GameCard[] = [];
    const rejected: { card: GameCard; issues: Issue[] }[] = [];
    for (const card of cards) {
        const verdict = validateCard(card, locale, options);
        if (verdict.ok) passed.push(card);
        else rejected.push({ card, issues: verdict.issues });
    }
    return { passed, rejected };
}
