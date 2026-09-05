// lib/daily/providers/mock.ts
//
// The only data source in this branch. Hardcoded from the standalone prototype.
// A Supabase provider is out of scope here — nothing in `lib/daily` may read
// from the app's database or its tables.

import type { PlayerRef } from '../types';

/** Fields the prototype shows on a player page that `PlayerRef` does not carry. */
export interface PlayerMeta {
    age: number;
    /** 'Δεξιόχειρας' | 'Αριστερόχειρας' */
    hand: string;
    /** portrait gradient: [top, bottom, halo] */
    palette: [string, string, string];
}

export const PLAYERS: PlayerRef[] = [
    {
        id: 'nk', name: 'Ν. Καραμάνος', club: 'ΑΟ Κηφισιάς', ntrp: '4.5',
        rating: 1842, streak: 2, clay: 71, hard: 54, form: ['w', 'w', 'l', 'w', 'l'],
    },
    {
        id: 'dg', name: 'Δ. Γεωργίου', club: 'ΤΚ Γλυφάδας', ntrp: '4.0',
        rating: 1795, streak: 5, clay: 48, hard: 76, form: ['w', 'w', 'w', 'w', 'w'],
    },
    {
        id: 'ms', name: 'Μ. Σταύρου', club: 'ΟΑ Μαρουσιού', ntrp: '4.0',
        rating: 1711, streak: 0, clay: 63, hard: 41, form: ['l', 'l', 'w', 'l', 'w'],
    },
    {
        id: 'ap', name: 'Α. Παππάς', club: 'ΑΟ Κηφισιάς', ntrp: '3.5',
        rating: 1688, streak: 1, clay: 58, hard: 60, form: ['w', 'l', 'w', 'w', 'l'],
    },
    {
        id: 'ti', name: 'Θ. Ιωάννου', club: 'Athens LTC', ntrp: '3.5',
        rating: 1601, streak: 0, clay: 44, hard: 57, form: ['l', 'w', 'l', 'l', 'w'],
    },
];

export const PLAYER_META: Record<string, PlayerMeta> = {
    nk: { age: 31, hand: 'Δεξιόχειρας', palette: ['#2E4A63', '#0E1A24', '#66C2E8'] },
    dg: { age: 26, hand: 'Αριστερόχειρας', palette: ['#5A3320', '#1A0E08', '#FF9A5B'] },
    ms: { age: 34, hand: 'Δεξιόχειρας', palette: ['#2C4A34', '#0D1A12', '#79D9A0'] },
    ap: { age: 22, hand: 'Δεξιόχειρας', palette: ['#3C2C58', '#150F22', '#A98BFF'] },
    ti: { age: 29, hand: 'Δεξιόχειρας', palette: ['#4A4326', '#16140A', '#E3C86A'] },
};

export const CLUBS: string[] = [
    'ΑΟ Κηφισιάς', 'ΤΚ Γλυφάδας', 'ΟΑ Μαρουσιού', 'Athens LTC',
    'Άλλος σύλλογος', 'Δεν ανήκω κάπου',
];

export const PLAY_TYPES: { id: 'comp' | 'fun' | 'watch'; name: string; sub: string }[] = [
    { id: 'comp', name: 'Παίζω σε τουρνουά', sub: 'Αγωνίζομαι σε τοπικά ταμπλό' },
    { id: 'fun', name: 'Παίζω για πλάκα', sub: 'Χωρίς επίσημα τουρνουά' },
    { id: 'watch', name: 'Παρακολουθώ', sub: 'Μου αρέσει να ξέρω τι γίνεται' },
];

/**
 * The Διπλασίασε questions. Harder than a run card on purpose — this is what
 * the player is betting the table against. Cycled in order across a run.
 */
export interface DoubleUpQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export const DOUBLE_UP_QUESTIONS: DoubleUpQuestion[] = [
    {
        question: 'Ο Γεωργίου δεν έχει χάσει ματς σε σκληρό γήπεδο φέτος.',
        options: ['Λάθος', 'Σωστό'],
        correctIndex: 0,
        explanation:
            'Έχει χάσει ένα, στον δεύτερο γύρο του Μαρτίου. 76% δεν είναι 100%.',
    },
    {
        question: 'Ποιος έχει το μεγαλύτερο άλμα βαθμών τον τελευταίο μήνα;',
        options: ['Α. Παππάς', 'Δ. Γεωργίου', 'Θ. Ιωάννου'],
        correctIndex: 0,
        explanation:
            'Ο Παππάς πήρε 62 βαθμούς σε τέσσερις εβδομάδες, κυρίως από τη νίκη επί του Γεωργίου.',
    },
    {
        question: 'Πόσα ματς έχουν παίξει μεταξύ τους Καραμάνος και Γεωργίου;',
        options: ['Δύο', 'Τέσσερα', 'Έξι'],
        correctIndex: 1,
        explanation: 'Τέσσερα, με τον Γεωργίου να προηγείται 3-1.',
    },
];

/**
 * The Γρήγορος γύρος: five true/false calls against the clock. Everything here
 * is answerable from the roster above, which is the point — it rewards having
 * actually read the players.
 */
export const RAPID_QUESTIONS: { question: string; correctIndex: number }[] = [
    { question: 'Ο Γεωργίου είναι αριστερόχειρας.', correctIndex: 1 },
    {
        question: 'Ο Καραμάνος έχει καλύτερο ποσοστό σε σκληρό απ’ ό,τι σε χώμα.',
        correctIndex: 0,
    },
    { question: 'Ο Παππάς είναι ο νεότερος της πεντάδας.', correctIndex: 1 },
    { question: 'Ο Σταύρου έχει ενεργό σερί νικών.', correctIndex: 0 },
    { question: 'Ο ΑΟ Κηφισιάς έχει δύο παίκτες στην πεντάδα.', correctIndex: 1 },
];

/* ---------- hub content ---------- */

/** The Saturday double, waiting under foil on the Σήμερα tab. */
export const PENDING_RESOLVE = {
    id: 'combo-saturday-double',
    title: 'Βγήκαν τα αποτελέσματα',
    when: 'ΣΑΒ 21:40',
    lede: 'Η διπλή πρόβλεψη του Σαββάτου έκλεισε. Ξύσε για να δεις πώς πήγε.',
    underFoil:
        'Γεωργίου <b>6-3 6-4</b> · Καραμάνος <b>7-5 6-7 6-2</b><br>Και τα δύο σωστά.',
    points: 40,
    celebration: {
        label: 'ΔΙΠΛΗ ΠΡΟΒΛΕΨΗ',
        title: 'Βγήκαν και τα δύο',
        sub: 'Μόνο το 12% της σκηνής βρήκε και τα δύο ματς του Σαββάτου.',
    },
} as const;

export const PENDING_VOTE = {
    title: 'Ψηφοφορία εβδομάδας',
    when: 'ΚΛΕΙΝΕΙ ΑΠΟΨΕ',
    lede: 'Παίκτης της εβδομάδας · ψήφισες Παππά',
} as const;

/** Two results shown on every player page. Fixtures, not per-player data. */
export const RECENT_MATCHES: { against: string; score: string; won: boolean }[] = [
    { against: 'vs Θ. Ιωάννου', score: '6-2 6-1', won: true },
    { against: 'vs Α. Παππάς', score: '6-7 4-6', won: false },
];

/** The Pro-only stats, blurred behind the lock on a player page. */
export const LOCKED_STATS: { label: string; value: number }[] = [
    { label: 'ΣΕΡΒΙΣ', value: 68 },
    { label: '3 ΣΕΤ', value: 74 },
    { label: 'ΤΑΪ ΜΠΡΕΪΚ', value: 52 },
];

export interface BoardRow {
    name: string;
    sub: string;
    /** kept numeric so the board can sort and the tester can genuinely climb */
    points: number;
    /** the tester's own row, or their club */
    me?: boolean;
}

/**
 * The rest of the ladder. The tester's own row is built at render time from
 * their week, then the whole board is sorted — so passing Κ. Βλάχος actually
 * moves you above him instead of leaving you stuck at third with a bigger score.
 */
export const BOARD_ATTICA: BoardRow[] = [
    { name: 'Σ. Δημητρίου', sub: 'ΤΚ Γλυφάδας · 71% ακρίβεια', points: 410 },
    { name: 'Κ. Βλάχος', sub: 'ΟΑ Μαρουσιού · 68%', points: 385 },
    { name: 'Ι. Ρούσσος', sub: 'Athens LTC · 61%', points: 318 },
];

/** Where the tester's week starts them on the local ladder. */
export const BOARD_BASELINE = 340;

export const BOARD_CLUBS: BoardRow[] = [
    { name: 'ΤΚ Γλυφάδας', sub: '34 παίκτες', points: 2140 },
    { name: 'ΑΟ Κηφισιάς', sub: '29 παίκτες', points: 1980, me: true },
];

export const PRO_FEATURES: { label: string; free: string; pro: string }[] = [
    { label: 'Παιχνίδια τη μέρα', free: '8', pro: 'Απεριόριστα' },
    { label: 'Γρήγορος γύρος', free: 'Με σερί', pro: 'Πάντα' },
    { label: 'Δημοσκοπήσεις & ψηφοφορίες', free: '✓', pro: '✓' },
    { label: 'Βασικά στατιστικά παικτών', free: '✓', pro: '✓' },
    { label: 'Κατάταξη & σύλλογοι', free: '✓', pro: '✓' },
    { label: 'Βαθύτερα στατιστικά', free: '—', pro: '✓' },
    { label: 'Ιστορικό μεταξύ τους', free: '—', pro: '✓' },
    { label: 'Σύγκριση δύο παικτών', free: '1 / εβδομάδα', pro: 'Απεριόριστη' },
    { label: 'Αρχείο παλιών γύρων', free: '7 μέρες', pro: 'Πλήρες' },
    { label: 'Ανάλυση ακρίβειας', free: 'Σύνολο', pro: 'Ανά τύπο' },
    { label: 'Ειδοποιήσεις παικτών', free: '—', pro: '✓' },
    { label: 'Ασφάλεια σερί', free: '—', pro: 'Κάθε μήνα' },
];

/** Shown, never sold — nothing in this branch is purchasable. */
export const PRO_PLANS: { price: string; period: string; best?: boolean }[] = [
    { price: '4,99 €', period: 'τον μήνα' },
    { price: '34,99 €', period: 'τον χρόνο · −42%', best: true },
];

export const PRO_STORE: { icon: string; label: string; price: string }[] = [
    { icon: '🛡️', label: 'Ασφάλεια σερί', price: '0,99 €' },
    { icon: '⚡', label: 'Έξτρα γύρος', price: '0,99 €' },
    { icon: '📊', label: 'Ανάλυση παίκτη', price: '1,99 €' },
];

export function getPlayer(id: string): PlayerRef | undefined {
    return PLAYERS.find((p) => p.id === id);
}

export function getPlayerMeta(id: string): PlayerMeta | undefined {
    return PLAYER_META[id];
}
