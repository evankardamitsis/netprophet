// lib/daily/copy/el.ts
//
// Greek is the source of truth. Strings ported from the prototype are verbatim —
// see CLAUDE.md for the fixes that must stay fixed.
//
// This object's shape *is* the `Copy` type, so `en.ts` cannot drift from it
// without a compile error.

import type { CardKind } from '../types';

/** 1 πόντος, 2 πόντοι. Getting this wrong is what makes copy feel machine-made. */
const points = (n: number) => `${n} ${n === 1 ? 'πόντος' : 'πόντοι'}`;
const days = (n: number) => `${n} ${n === 1 ? 'μέρα' : 'μέρες'}`;

export const el = {
    common: {
        continue: 'Συνέχεια',
        next: 'Επόμενο',
        finish: 'Τελείωσες',
        done: 'Τέλος',
        back: 'Πίσω',
        points,
        days,
        /** the ΠΟΝΤΟΙ caption under the celebration number */
        pointsCaption: 'ΠΟΝΤΟΙ',
        noResults: 'Κανένα αποτέλεσμα.',
    },

    onboarding: {
        eyebrow: 'Αθήνα · καθημερινό παιχνίδι',
        step: (n: number, total: number) => `Βήμα ${n} από ${total}`,
        welcome: {
            tagline: 'Ξέρεις την τοπική σκηνή καλύτερα από όλους;',
            sub: 'Οκτώ παιχνίδια τη μέρα με πραγματικά ματς από τα ταμπλό της Αθήνας. Προβλέψεις, δημοσκοπήσεις, ψηφοφορίες. Και τα στατιστικά κάθε παίκτη μαζί.',
            cta: 'Ξεκίνα',
        },
        playType: {
            tagline: 'Παίζεις κι εσύ;',
            sub: 'Για να ξέρουμε αν θα βλέπεις και τα δικά σου ματς μέσα στο παιχνίδι.',
        },
        claim: {
            tagline: 'Βρες τον εαυτό σου.',
            sub: 'Αν έχεις παίξει σε τοπικό ταμπλό, είσαι ήδη στη λίστα. Διάλεξε το προφίλ σου για να βλέπεις τα ματς και τα στατιστικά σου.',
            search: 'Γράψε το όνομά σου',
            yes: 'Αυτός είμαι',
            no: 'Δεν είμαι στη λίστα',
        },
        club: {
            tagline: 'Σε ποιον σύλλογο;',
            sub: 'Θα μπεις στην κατάταξη του συλλόγου σου και θα βλέπεις πρώτα τα δικά του ματς.',
        },
        friends: {
            tagline: 'Ποιους ξέρεις;',
            sub: 'Φίλοι, συμπαίκτες, αντίπαλοι. Θα βλέπεις πρώτα τα ματς τους και θα συγκρίνεσαι μαζί τους στην κατάταξη.',
            search: 'Αναζήτηση παίκτη',
            go: (n: number) => `Πάμε (${n})`,
            none: 'Διάλεξε τουλάχιστον έναν',
        },
    },

    hub: {
        tabs: { today: 'Σήμερα', players: 'Παίκτες', board: 'Κατάταξη', pro: 'Pro' },
        today: {
            heroDone: 'Το έπαιξες σήμερα',
            heroOpen: 'Οκτώ παιχνίδια σε περιμένουν',
            ledeDone: 'Επιστρέφεις αύριο στις 09:00.',
            ledeOpen: 'Αποτέλεσμα, σκορ, αυτός ή αυτός, δημοσκόπηση, ανατροπή, σειρά, ψηφοφορία, διπλή πρόβλεψη.',
            play: 'Παίξε τώρα',
            played: 'Ολοκληρώθηκε',
            yourProfile: (club: string, ntrp: string) =>
                `Το προφίλ σου · ${club} · NTRP ${ntrp}`,
            pending: 'ΣΕ ΑΝΑΜΟΝΗ',
            yourPlayers: 'ΟΙ ΠΑΙΚΤΕΣ ΣΟΥ',
            yourWeek: 'Η ΕΒΔΟΜΑΔΑ ΣΟΥ',
            settings: 'ΡΥΘΜΙΣΕΙΣ',
            stats: { points: 'ΠΟΝΤΟΙ', accuracy: 'ΑΚΡΙΒΕΙΑ', streak: 'ΣΕΡΙ' },
            bonus: {
                title: 'Γρήγορος γύρος',
                unlocked: 'ΞΕΚΛΕΙΔΩΘΗΚΕ',
                lede: (streak: number) =>
                    `Το κέρδισες με σερί ${streak}+ ημερών. Πέντε ερωτήσεις σε 18 δευτερόλεπτα.`,
                play: 'Παίξε τον γύρο',
            },
        },
        settings: {
            haptics: 'Δόνηση',
            hapticsOn: 'Μικρή δόνηση σε κάθε επιλογή',
            hapticsUnsupported: 'Δεν υποστηρίζεται σε αυτή τη συσκευή',
            language: 'Γλώσσα',
            languageSub: 'Ελληνικά',
        },
        players: {
            title: 'Παίκτες',
            count: (n: number) => `Αττική · ${n}`,
            search: 'Αναζήτηση παίκτη ή συλλόγου',
            form: 'ΦΟΡΜΑ · ΤΕΛΕΥΤΑΙΑ 5',
            bySurface: 'ΑΠΟΔΟΣΗ ΑΝΑ ΕΠΙΦΑΝΕΙΑ',
            recent: 'ΤΕΛΕΥΤΑΙΑ ΜΑΤΣ',
            deeper: 'ΒΑΘΥΤΕΡΑ ΣΤΑΤΙΣΤΙΚΑ',
            clay: 'ΧΩΜΑ',
            hard: 'ΣΚΛΗΡΟ',
            back: '← Παίκτες',
            meta: (ntrp: string, hand: string, age: number) =>
                `NTRP ${ntrp} · ${hand} · ${age} ετών`,
            sub: (club: string, ntrp: string) => `${club} · NTRP ${ntrp}`,
            streakLine: (streak: number, rating: number) =>
                `Ενεργό σερί: ${streak} · Βαθμοί: ${rating}`,
            lockedNote: 'Πλήρες ιστορικό 38 ματς, ανά αντίπαλο και ανά σεζόν',
            lockTitle: 'Πλήρη στατιστικά & ιστορικό',
            win: 'Ν',
            loss: 'Η',
        },
        board: {
            title: 'Κατάταξη',
            week: 'ΕΒΔΟΜΑΔΑ 36',
            attica: 'ΑΤΤΙΚΗ',
            clubs: 'ΣΥΛΛΟΓΟΙ',
            you: 'Εσύ',
            noClub: 'Χωρίς σύλλογο',
        },
        pro: {
            title: 'NetProphet Pro',
            badge: '7 ΜΕΡΕΣ ΔΩΡΕΑΝ',
            heading: 'Περισσότερα παιχνίδια, όλα τα δεδομένα',
            lede: 'Δωρεάν έχεις όλα τα παιχνίδια. Με την Pro έχεις και όλα τα δεδομένα.',
            free: 'ΔΩΡΕΑΝ',
            pro: 'PRO',
            best: 'ΚΑΛΥΤΕΡΗ ΑΞΙΑ',
            trial: 'Δοκιμή 7 ημερών. Ακυρώνεις όποτε θες.',
            store: 'ΜΕΜΟΝΩΜΕΝΑ',
        },
    },

    run: {
        confirm: 'Επιβεβαίωση',
        lock: 'Κλείδωσε',
        pick: (n: number) => `Διάλεξε ${n}`,
        pickMore: (n: number) => `Διάλεξε ${n} ακόμα`,
        scratchFirst: 'Ξύσε πρώτα',
        scratch: 'Ξύσε',
        streakDays: (n: number) => `${n} ${n === 1 ? 'μέρα' : 'μέρες'}`,
        shieldLabel: 'ασφάλεια σερί',
        kinds: {
            result: 'ΤΟ ΑΠΟΤΕΛΕΣΜΑ',
            score: 'ΤΟ ΣΚΟΡ',
            thisThat: 'ΑΥΤΟΣ Ή ΑΥΤΟΣ',
            poll: 'ΔΗΜΟΣΚΟΠΗΣΗ',
            upset: 'Η ΑΝΑΤΡΟΠΗ',
            order: 'ΒΑΛΕ ΣΕ ΣΕΙΡΑ',
            award: 'ΨΗΦΟΦΟΡΙΑ ΕΒΔΟΜΑΔΑΣ',
            combo: 'ΔΙΠΛΗ ΠΡΟΒΛΕΨΗ',
            guess: '',
        } as Record<CardKind, string>,
        titles: {
            result: { win: 'Σωστά!', lose: 'Όχι αυτή τη φορά' },
            score: { win: 'Ακριβώς', lose: 'Κοντά' },
            upset: { win: 'Το βρήκες', lose: 'Δεν ήταν αυτό' },
            order: { win: 'Σωστή σειρά', lose: 'Λάθος σειρά' },
        } as Partial<Record<CardKind, { win: string; lose: string }>>,
        info: {
            poll: 'Ψήφισες',
            award: 'Ψήφισες',
            thisThat: 'Ψήφισες',
            combo: 'Κλειδώθηκε',
        } as Partial<Record<CardKind, string>>,
        recorded: 'Καταχωρήθηκε',
    },

    risk: {
        onTable: (n: number) => `Έχεις ${points(n)} στο τραπέζι.`,
        keep: 'Κράτα',
        half: 'Τα μισά',
        double: 'Διπλασίασε',
        halfSub: (n: number) => `${n} + ασπίδα`,
        doubleSub: (n: number) => `${n} ή τίποτα`,
    },

    double: {
        atRisk: (n: number) => `⚡ ${n} ΠΟΝΤΟΙ ΣΕ ΚΙΝΔΥΝΟ`,
        kind: 'ΔΙΠΛΑΣΙΑΣΜΟΣ',
        lede: 'Σωστή απάντηση και διπλασιάζεις. Λάθος και τα χάνεις όλα.',
        won: 'Διπλασιάστηκε',
        lost: 'Τα έχασες',
        celebrationLabel: 'ΔΙΠΛΑΣΙΑΣΜΟΣ',
        celebrationTitle: 'Το πήρες',
    },

    celebration: {
        total: 'ΣΥΝΟΛΟ',
        runLabel: 'ΤΕΛΟΣ ΓΥΡΟΥ',
        runTitle: (streak: number) => `Σερί ${streak} ημερών`,
        runSub: 'Επιστρέφεις αύριο στις 09:00 για οκτώ νέα παιχνίδια.',
    },

    rapid: {
        label: 'ΓΡΗΓΟΡΟΣ ΓΥΡΟΣ',
        seconds: (n: number) => `${n} δευτερόλεπτα`,
        outOf: (correct: number, total: number) => `${correct} στα ${total}`,
        earned: (n: number) =>
            `Κέρδισες <b>${points(n)}</b> στον γρήγορο γύρο.`,
        wrong: 'Λάθος',
        right: 'Σωστό',
    },
};
