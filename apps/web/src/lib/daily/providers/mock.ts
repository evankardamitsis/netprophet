// lib/daily/providers/mock.ts
//
// The only data source in this branch. Hardcoded from the standalone prototype.
// A Supabase provider is out of scope here — nothing in `lib/daily` may read
// from the app's database or its tables.
//
// Content is stored per locale rather than translated at render, which is the
// same shape the real generator will produce: it writes a card's Greek and
// English at generation time, once, under review.
//
// Player *names* are the exception — they are stored once in Greek and
// transliterated for display (see `greek.ts`), because a name is not a
// translation.

import { displayName } from '../greek';
import type { Locale } from '../copy';
import type { PlayerRef, SideRef } from '../types';

export interface Localized { el: string; en: string }
export const t = (value: Localized, locale: Locale): string => value[locale];

/** Fields the prototype shows on a player page that `PlayerRef` does not carry. */
export interface PlayerMeta {
    age: number;
    hand: Localized;
    /** portrait gradient: [top, bottom, halo] */
    palette: [string, string, string];
}

const PLAYERS_EL: PlayerRef[] = [
    {
        id: 'nk', name: 'Ν. Καραμάνος', club: 'ΑΟ Κηφισιάς', ntrp: '4.5',
        winRate: 70, streak: 2, clay: 71, hard: 54, form: ['w', 'w', 'l', 'w', 'l'],
    },
    {
        id: 'dg', name: 'Δ. Γεωργίου', club: 'ΤΚ Γλυφάδας', ntrp: '4.0',
        winRate: 83, streak: 5, clay: 48, hard: 76, form: ['w', 'w', 'w', 'w', 'w'],
    },
    {
        id: 'ms', name: 'Μ. Σταύρου', club: 'ΟΑ Μαρουσιού', ntrp: '4.0',
        winRate: 44, streak: 0, clay: 63, hard: 41, form: ['l', 'l', 'w', 'l', 'w'],
    },
    {
        id: 'ap', name: 'Α. Παππάς', club: 'ΑΟ Κηφισιάς', ntrp: '3.5',
        winRate: 61, streak: 1, clay: 58, hard: 60, form: ['w', 'l', 'w', 'w', 'l'],
    },
    {
        id: 'ti', name: 'Θ. Ιωάννου', club: 'Athens LTC', ntrp: '3.5',
        winRate: 38, streak: 0, clay: 44, hard: 57, form: ['l', 'w', 'l', 'l', 'w'],
    },
];

/** Names and clubs rendered for the locale; everything else is numbers. */
export function getPlayers(locale: Locale): PlayerRef[] {
    return PLAYERS_EL.map((p) => ({
        ...p,
        name: displayName(p.name, locale),
        club: displayName(p.club, locale),
    }));
}

export function getPlayer(id: string, locale: Locale): PlayerRef | undefined {
    return getPlayers(locale).find((p) => p.id === id);
}

/** A side of a match: one id for singles, two for doubles. */
export function getSide(ids: string[], locale: Locale): SideRef | undefined {
    const players = ids
        .map((id) => getPlayer(id, locale))
        .filter((p): p is PlayerRef => Boolean(p));
    if (players.length !== ids.length) return undefined;
    return { id: ids.join('+'), players };
}

/** "Γεωργίου" for singles, "Γεωργίου / Σταύρου" for a pair. */
export function sideLabel(side: SideRef): string {
    return side.players.map((p) => p.name).join(' / ');
}

export const PLAYER_META: Record<string, PlayerMeta> = {
    nk: { age: 31, hand: { el: 'Δεξιόχειρας', en: 'Right-handed' }, palette: ['#2E4A63', '#0E1A24', '#66C2E8'] },
    dg: { age: 26, hand: { el: 'Αριστερόχειρας', en: 'Left-handed' }, palette: ['#5A3320', '#1A0E08', '#FF9A5B'] },
    ms: { age: 34, hand: { el: 'Δεξιόχειρας', en: 'Right-handed' }, palette: ['#2C4A34', '#0D1A12', '#79D9A0'] },
    ap: { age: 22, hand: { el: 'Δεξιόχειρας', en: 'Right-handed' }, palette: ['#3C2C58', '#150F22', '#A98BFF'] },
    ti: { age: 29, hand: { el: 'Δεξιόχειρας', en: 'Right-handed' }, palette: ['#4A4326', '#16140A', '#E3C86A'] },
};

export function getPlayerMeta(id: string): PlayerMeta | undefined {
    return PLAYER_META[id];
}

/**
 * Real clubs are transliterated; the last two are UI choices, so translated.
 *
 * Stored by `id`, never by display string — a profile created in English must
 * still read correctly after switching to Greek.
 */
export const CLUBS: (Localized & { id: string })[] = [
    { id: 'kifisia', el: 'ΑΟ Κηφισιάς', en: 'AO Kifisias' },
    { id: 'glyfada', el: 'ΤΚ Γλυφάδας', en: 'TK Glyfadas' },
    { id: 'marousi', el: 'ΟΑ Μαρουσιού', en: 'OA Marousiou' },
    { id: 'athens-ltc', el: 'Athens LTC', en: 'Athens LTC' },
    { id: 'other', el: 'Άλλος σύλλογος', en: 'Another club' },
    { id: 'none', el: 'Δεν ανήκω κάπου', en: 'Not with a club' },
];

/** Which club a player belongs to, as an id — for pre-filling the club step. */
export function clubIdFor(playerId: string): string | null {
    const player = PLAYERS_EL.find((p) => p.id === playerId);
    if (!player) return null;
    return CLUBS.find((c) => c.el === player.club)?.id ?? null;
}

/** Resolves a stored club id for display. Older profiles stored the name. */
export function clubName(id: string | null, locale: Locale): string | null {
    if (!id) return null;
    const found = CLUBS.find((c) => c.id === id);
    return found ? t(found, locale) : id;
}

export const PLAY_TYPES: {
    id: 'comp' | 'fun' | 'watch'; name: Localized; sub: Localized;
}[] = [
    {
        id: 'comp',
        name: { el: 'Παίζω σε τουρνουά', en: 'I play tournaments' },
        sub: { el: 'Αγωνίζομαι σε τοπικά ταμπλό', en: 'I compete in local draws' },
    },
    {
        id: 'fun',
        name: { el: 'Παίζω για πλάκα', en: 'I play for fun' },
        sub: { el: 'Χωρίς επίσημα τουρνουά', en: 'No official tournaments' },
    },
    {
        id: 'watch',
        name: { el: 'Παρακολουθώ', en: 'I follow the scene' },
        sub: { el: 'Μου αρέσει να ξέρω τι γίνεται', en: 'I like knowing what is going on' },
    },
];

/**
 * The Διπλασίασε questions. Harder than a run card on purpose — this is what
 * the player is betting the table against. Cycled in order across a run.
 */
export interface DoubleUpQuestion {
    question: Localized;
    options: Localized[];
    correctIndex: number;
    explanation: Localized;
}

export const DOUBLE_UP_QUESTIONS: DoubleUpQuestion[] = [
    {
        question: {
            el: 'Ο Γεωργίου δεν έχει χάσει ματς σε σκληρό γήπεδο φέτος.',
            en: 'Georgiou has not lost a match on hard court this year.',
        },
        options: [{ el: 'Λάθος', en: 'False' }, { el: 'Σωστό', en: 'True' }],
        correctIndex: 0,
        explanation: {
            el: 'Έχει χάσει ένα, στον δεύτερο γύρο του Μαρτίου. 76% δεν είναι 100%.',
            en: 'He lost one, in the second round in March. 76% is not 100%.',
        },
    },
    {
        question: {
            el: 'Ποιος έχει το μεγαλύτερο άλμα βαθμών τον τελευταίο μήνα;',
            en: 'Who has climbed the most rating points in the last month?',
        },
        options: [
            { el: 'Α. Παππάς', en: 'A. Pappas' },
            { el: 'Δ. Γεωργίου', en: 'D. Georgiou' },
            { el: 'Θ. Ιωάννου', en: 'T. Ioannou' },
        ],
        correctIndex: 0,
        explanation: {
            el: 'Ο Παππάς πήρε 62 βαθμούς σε τέσσερις εβδομάδες, κυρίως από τη νίκη επί του Γεωργίου.',
            en: 'Pappas took 62 points in four weeks, most of it from beating Georgiou.',
        },
    },
    {
        question: {
            el: 'Πόσα ματς έχουν παίξει μεταξύ τους Καραμάνος και Γεωργίου;',
            en: 'How many times have Karamanos and Georgiou played each other?',
        },
        options: [
            { el: 'Δύο', en: 'Two' }, { el: 'Τέσσερα', en: 'Four' }, { el: 'Έξι', en: 'Six' },
        ],
        correctIndex: 1,
        explanation: {
            el: 'Τέσσερα, με τον Γεωργίου να προηγείται 3-1.',
            en: 'Four, with Georgiou leading 3-1.',
        },
    },
];

/**
 * The Γρήγορος γύρος: five true/false calls against the clock. Everything here
 * is answerable from the roster above, which is the point — it rewards having
 * actually read the players.
 */
export const RAPID_QUESTIONS: { question: Localized; correctIndex: number }[] = [
    {
        question: {
            el: 'Ο Γεωργίου είναι αριστερόχειρας.',
            en: 'Georgiou is left-handed.',
        },
        correctIndex: 1,
    },
    {
        question: {
            el: 'Ο Καραμάνος έχει καλύτερο ποσοστό σε σκληρό απ’ ό,τι σε χώμα.',
            en: 'Karamanos has a better record on hard than on clay.',
        },
        correctIndex: 0,
    },
    {
        question: {
            el: 'Ο Παππάς είναι ο νεότερος της πεντάδας.',
            en: 'Pappas is the youngest of the five.',
        },
        correctIndex: 1,
    },
    {
        question: {
            el: 'Ο Σταύρου έχει ενεργό σερί νικών.',
            en: 'Stavrou is on an active winning streak.',
        },
        correctIndex: 0,
    },
    {
        question: {
            el: 'Ο ΑΟ Κηφισιάς έχει δύο παίκτες στην πεντάδα.',
            en: 'AO Kifisias has two players in the five.',
        },
        correctIndex: 1,
    },
];

/* ---------- hub content ---------- */

/** The Saturday double, waiting under foil on the Σήμερα tab. */
export const PENDING_RESOLVE = {
    id: 'combo-saturday-double',
    title: { el: 'Βγήκαν τα αποτελέσματα', en: 'The results are in' },
    when: { el: 'ΣΑΒ 21:40', en: 'SAT 21:40' },
    lede: {
        el: 'Η διπλή πρόβλεψη του Σαββάτου έκλεισε. Ξύσε για να δεις πώς πήγε.',
        en: 'Saturday’s double prediction has closed. Scratch to see how it went.',
    },
    underFoil: {
        el: 'Γεωργίου <b>6-3 6-4</b> · Καραμάνος <b>7-5 6-7 6-2</b><br>Και τα δύο σωστά.',
        en: 'Georgiou <b>6-3 6-4</b> · Karamanos <b>7-5 6-7 6-2</b><br>Both correct.',
    },
    points: 40,
    celebration: {
        label: { el: 'ΔΙΠΛΗ ΠΡΟΒΛΕΨΗ', en: 'THE DOUBLE' },
        title: { el: 'Βγήκαν και τα δύο', en: 'Both came in' },
        sub: {
            el: 'Μόνο το 12% της σκηνής βρήκε και τα δύο ματς του Σαββάτου.',
            en: 'Only 12% of the scene got both of Saturday’s matches.',
        },
    },
};

export const PENDING_VOTE = {
    title: { el: 'Ψηφοφορία εβδομάδας', en: 'Player of the week' },
    when: { el: 'ΚΛΕΙΝΕΙ ΑΠΟΨΕ', en: 'CLOSES TONIGHT' },
    lede: {
        el: 'Παίκτης της εβδομάδας · ψήφισες Παππά',
        en: 'Player of the week · you voted Pappas',
    },
};

/** Two results shown on every player page. Fixtures, not per-player data. */
export const RECENT_MATCHES: { against: Localized; score: string; won: boolean }[] = [
    { against: { el: 'vs Θ. Ιωάννου', en: 'vs T. Ioannou' }, score: '6-2 6-1', won: true },
    { against: { el: 'vs Α. Παππάς', en: 'vs A. Pappas' }, score: '6-7 4-6', won: false },
];

/** The Pro-only stats, blurred behind the lock on a player page. */
export const LOCKED_STATS: { label: Localized; value: number }[] = [
    { label: { el: 'ΣΕΡΒΙΣ', en: 'SERVE' }, value: 68 },
    { label: { el: '3 ΣΕΤ', en: '3 SETS' }, value: 74 },
    { label: { el: 'ΤΑΪ ΜΠΡΕΪΚ', en: 'TIEBREAK' }, value: 52 },
];

export interface BoardRow {
    name: Localized;
    sub: Localized;
    /** kept numeric so the board can sort and the tester can genuinely climb */
    points: number;
    me?: boolean;
}

/**
 * The rest of the ladder. The tester's own row is built at render time from
 * their week, then the whole board is sorted — so passing Κ. Βλάχος actually
 * moves you above him instead of leaving you stuck at third with a bigger score.
 */
export const BOARD_ATTICA: BoardRow[] = [
    {
        name: { el: 'Σ. Δημητρίου', en: 'S. Dimitriou' },
        sub: { el: 'ΤΚ Γλυφάδας · 71% ακρίβεια', en: 'TK Glyfadas · 71% accuracy' },
        points: 410,
    },
    {
        name: { el: 'Κ. Βλάχος', en: 'K. Vlachos' },
        sub: { el: 'ΟΑ Μαρουσιού · 68%', en: 'OA Marousiou · 68%' },
        points: 385,
    },
    {
        name: { el: 'Ι. Ρούσσος', en: 'I. Roussos' },
        sub: { el: 'Athens LTC · 61%', en: 'Athens LTC · 61%' },
        points: 318,
    },
];

/** Where the tester's week starts them on the local ladder. */
export const BOARD_BASELINE = 340;

export const BOARD_CLUBS: BoardRow[] = [
    {
        name: { el: 'ΤΚ Γλυφάδας', en: 'TK Glyfadas' },
        sub: { el: '34 παίκτες', en: '34 players' },
        points: 2140,
    },
    {
        name: { el: 'ΑΟ Κηφισιάς', en: 'AO Kifisias' },
        sub: { el: '29 παίκτες', en: '29 players' },
        points: 1980,
        me: true,
    },
];

export const PRO_FEATURES: { label: Localized; free: Localized; pro: Localized }[] = [
    { label: { el: 'Παιχνίδια τη μέρα', en: 'Games per day' }, free: { el: '8', en: '8' }, pro: { el: 'Απεριόριστα', en: 'Unlimited' } },
    { label: { el: 'Γρήγορος γύρος', en: 'Rapid round' }, free: { el: 'Με σερί', en: 'With a streak' }, pro: { el: 'Πάντα', en: 'Always' } },
    { label: { el: 'Δημοσκοπήσεις & ψηφοφορίες', en: 'Polls & votes' }, free: { el: '✓', en: '✓' }, pro: { el: '✓', en: '✓' } },
    { label: { el: 'Βασικά στατιστικά παικτών', en: 'Basic player stats' }, free: { el: '✓', en: '✓' }, pro: { el: '✓', en: '✓' } },
    { label: { el: 'Κατάταξη & σύλλογοι', en: 'Leaderboard & clubs' }, free: { el: '✓', en: '✓' }, pro: { el: '✓', en: '✓' } },
    { label: { el: 'Βαθύτερα στατιστικά', en: 'Deeper stats' }, free: { el: '—', en: '—' }, pro: { el: '✓', en: '✓' } },
    { label: { el: 'Ιστορικό μεταξύ τους', en: 'Head-to-head history' }, free: { el: '—', en: '—' }, pro: { el: '✓', en: '✓' } },
    { label: { el: 'Σύγκριση δύο παικτών', en: 'Compare two players' }, free: { el: '1 / εβδομάδα', en: '1 / week' }, pro: { el: 'Απεριόριστη', en: 'Unlimited' } },
    { label: { el: 'Αρχείο παλιών γύρων', en: 'Archive of past rounds' }, free: { el: '7 μέρες', en: '7 days' }, pro: { el: 'Πλήρες', en: 'Full' } },
    { label: { el: 'Ανάλυση ακρίβειας', en: 'Accuracy breakdown' }, free: { el: 'Σύνολο', en: 'Overall' }, pro: { el: 'Ανά τύπο', en: 'By card type' } },
    { label: { el: 'Ειδοποιήσεις παικτών', en: 'Player notifications' }, free: { el: '—', en: '—' }, pro: { el: '✓', en: '✓' } },
    { label: { el: 'Ασφάλεια σερί', en: 'Streak insurance' }, free: { el: '—', en: '—' }, pro: { el: 'Κάθε μήνα', en: 'Every month' } },
];

/** Shown, never sold — nothing in this branch is purchasable. */
export const PRO_PLANS: { price: string; period: Localized; best?: boolean }[] = [
    { price: '4,99 €', period: { el: 'τον μήνα', en: 'per month' } },
    { price: '34,99 €', period: { el: 'τον χρόνο · −42%', en: 'per year · −42%' }, best: true },
];

export const PRO_STORE: { icon: string; label: Localized; price: string }[] = [
    { icon: '🛡️', label: { el: 'Ασφάλεια σερί', en: 'Streak insurance' }, price: '0,99 €' },
    { icon: '⚡', label: { el: 'Έξτρα γύρος', en: 'Extra round' }, price: '0,99 €' },
    { icon: '📊', label: { el: 'Ανάλυση παίκτη', en: 'Player analysis' }, price: '1,99 €' },
];
