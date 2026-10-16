import type { Lang } from './content';

/**
 * The privacy policy and the help page, Greek first. The privacy text follows what the app actually keeps (the
 * profiles, votes and matches tables, push tokens, PostHog EU by user id, Resend for sign-in emails, Supabase and
 * Vercel for hosting). Drafted 16 Oct 2026 for the founder's review before the store submissions.
 */
export interface Doc {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; paragraphs?: string[]; bullets?: string[] }[];
}

const UPDATED_EL = 'Τελευταία ενημέρωση: 16 Οκτωβρίου 2026';
const UPDATED_EN = 'Last updated: 16 October 2026';

export const privacy: Record<Lang, Doc> = {
  el: {
    title: 'Απόρρητο',
    updated: UPDATED_EL,
    intro:
      'Το NetProphet είναι εφαρμογή της Monad Labs. Εδώ λέμε απλά ποια στοιχεία κρατάμε, γιατί, και τι μπορείς να κάνεις με αυτά.',
    sections: [
      {
        heading: 'Ποια στοιχεία κρατάμε',
        bullets: [
          'Λογαριασμός: το email σου, και αν μπεις με Google ή Apple, το όνομα και το email που μας δίνουν.',
          'Προφίλ: όνομα, περιοχή, άθλημα, φύλο (για τα σωστά ματς και τις κατηγορίες), και τον παίκτη που διεκδίκησες.',
          'Αυτά που κάνεις στην εφαρμογή: ψήφοι, πόντοι, σερί, level, φίλοι που ακολουθείς, αντιδράσεις, ματς που καταχωρείς, ό,τι φοράει ο παίκτης σου.',
          'Ειδοποιήσεις: ένα κλειδί της συσκευής σου, μόνο αν δεχτείς ειδοποιήσεις.',
          'Χρήση της εφαρμογής: ποιες οθόνες ανοίγεις και τι πατάς, συνδεδεμένα με τον κωδικό του λογαριασμού σου, ποτέ με το email σου.',
        ],
      },
      {
        heading: 'Τα ματς και οι παίκτες των τουρνουά',
        paragraphs: [
          'Τα προγράμματα και τα αποτελέσματα έρχονται από τα δημόσια φύλλα των διοργανωτών: ονόματα παικτών, ματς, σκορ. Οι ανήλικοι παίκτες δεν εμφανίζονται. Αν είσαι παίκτης και θέλεις να κρυφτείς ή να διορθώσουμε κάτι, γράψε μας.',
        ],
      },
      {
        heading: 'Γιατί τα κρατάμε',
        bullets: [
          'Για να λειτουργεί η εφαρμογή: ψήφοι, αποτελέσματα, πόντοι, Κατάταξη.',
          'Για να σου στέλνουμε κωδικούς σύνδεσης και, αν το θέλεις, ειδοποιήσεις.',
          'Για να βελτιώνουμε την εφαρμογή, από το πώς χρησιμοποιείται συνολικά.',
          'Για την ασφάλεια: αναφορές, αποκλεισμοί, προστασία από κατάχρηση.',
        ],
      },
      {
        heading: 'Με ποιους τα μοιραζόμαστε',
        paragraphs: [
          'Δεν πουλάμε στοιχεία. Χρησιμοποιούμε συνεργάτες που τα επεξεργάζονται για εμάς: Supabase (βάση δεδομένων και σύνδεση), Vercel (φιλοξενία), Resend (emails σύνδεσης), PostHog στην ΕΕ (στατιστικά χρήσης), Apple και Google (ειδοποιήσεις και αγορές μέσα από τα καταστήματα).',
          'Το όνομά σου, ο παίκτης σου, οι πόντοι και η θέση σου στην Κατάταξη φαίνονται σε άλλους χρήστες. Μπορείς να κρύψεις το προφίλ σου από τις Ρυθμίσεις.',
        ],
      },
      {
        heading: 'Για πόσο',
        paragraphs: [
          'Όσο έχεις λογαριασμό. Όταν τον διαγράψεις, σβήνουμε τα στοιχεία σου μέσα σε 30 μέρες, εκτός από όσα ο νόμος μας ζητά να κρατήσουμε (για παράδειγμα αποδείξεις αγορών).',
        ],
      },
      {
        heading: 'Τα δικαιώματά σου',
        paragraphs: [
          'Μπορείς να ζητήσεις να δεις, να διορθώσεις, να πάρεις ή να σβήσεις τα στοιχεία σου, και να αντιταχθείς στη χρήση τους. Γράψε στο hello@monadlabs.gr και απαντάμε μέσα σε 30 μέρες. Μπορείς επίσης να απευθυνθείς στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (dpa.gr).',
        ],
      },
      {
        heading: 'Παιδιά',
        paragraphs: ['Το NetProphet είναι για άτομα 13 ετών και πάνω.'],
      },
      {
        heading: 'Επικοινωνία',
        paragraphs: ['Monad Labs · hello@monadlabs.gr'],
      },
    ],
  },
  en: {
    title: 'Privacy',
    updated: UPDATED_EN,
    intro: 'NetProphet is an app by Monad Labs. Here is, in plain words, what we keep, why, and what you can do about it.',
    sections: [
      {
        heading: 'What we keep',
        bullets: [
          'Account: your email, and if you sign in with Google or Apple, the name and email they share with us.',
          'Profile: name, area, sport, gender (for the right matches and categories), and the player you claimed.',
          'What you do in the app: calls, points, streak, level, the friends you follow, reactions, matches you log, what your player wears.',
          'Notifications: a key for your device, only if you allow notifications.',
          'App usage: which screens you open and what you tap, linked to your account id, never your email.',
        ],
      },
      {
        heading: 'Tournament matches and players',
        paragraphs: [
          'Schedules and results come from the organisers’ public sheets: player names, matches, scores. Minors are never shown. If you are a player and want to be hidden or something corrected, write to us.',
        ],
      },
      {
        heading: 'Why we keep it',
        bullets: [
          'To run the app: calls, results, points, the Ladder.',
          'To send you sign-in codes and, if you want them, notifications.',
          'To improve the app, from how it is used overall.',
          'For safety: reports, blocks, protection from abuse.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: [
          'We do not sell data. Partners process it for us: Supabase (database and sign-in), Vercel (hosting), Resend (sign-in emails), PostHog in the EU (usage statistics), Apple and Google (notifications and store purchases).',
          'Your name, your player, your points and your place in the Ladder are visible to other users. You can hide your profile in Settings.',
        ],
      },
      {
        heading: 'How long',
        paragraphs: [
          'For as long as you have an account. When you delete it, we erase your data within 30 days, except what the law requires us to keep (for example purchase records).',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You can ask to see, correct, take or erase your data, and object to its use. Write to hello@monadlabs.gr and we answer within 30 days. You can also contact the Hellenic Data Protection Authority (dpa.gr).',
        ],
      },
      {
        heading: 'Children',
        paragraphs: ['NetProphet is for people aged 13 and over.'],
      },
      {
        heading: 'Contact',
        paragraphs: ['Monad Labs · hello@monadlabs.gr'],
      },
    ],
  },
};

export const support: Record<Lang, Doc> = {
  el: {
    title: 'Βοήθεια',
    updated: UPDATED_EL,
    intro: 'Κάτι δεν πάει καλά ή έχεις ερώτηση; Γράψε στο hello@monadlabs.gr και απαντάμε γρήγορα.',
    sections: [
      {
        heading: 'Λάθος αποτέλεσμα ή όνομα',
        paragraphs: ['Γράψε μας με το τουρνουά και το ματς. Το διορθώνουμε και οι πόντοι μετράνε ξανά.'],
      },
      {
        heading: 'Ο παίκτης μου',
        paragraphs: ['Στην εγγραφή διαλέγεις τον παίκτη σου από τα τουρνουά. Αν δεν σε βρίσκεις ή διάλεξες λάθος, γράψε μας και το φτιάχνουμε.'],
      },
      {
        heading: 'Ειδοποιήσεις',
        paragraphs: ['Τις ανοίγεις και τις κλείνεις από τις Ρυθμίσεις του κινητού σου. Οι υπενθυμίσεις για τα ματς σου είναι μέρος του Pro.'],
      },
      {
        heading: 'Pro και αγορές',
        paragraphs: ['Οι αγορές γίνονται από το App Store ή το Google Play, και εκεί ακυρώνεις ή ζητάς επιστροφή.'],
      },
      {
        heading: 'Διαγραφή λογαριασμού',
        paragraphs: ['Γράψε μας από το email του λογαριασμού σου και τον σβήνουμε μέσα σε 30 μέρες, μαζί με τα στοιχεία σου.'],
      },
    ],
  },
  en: {
    title: 'Help',
    updated: UPDATED_EN,
    intro: 'Something wrong or a question? Write to hello@monadlabs.gr and we answer quickly.',
    sections: [
      {
        heading: 'A wrong result or name',
        paragraphs: ['Write to us with the tournament and the match. We fix it and the points are counted again.'],
      },
      {
        heading: 'My player',
        paragraphs: ['When you sign up you pick your player from the tournaments. If you cannot find yourself or picked the wrong one, write to us and we fix it.'],
      },
      {
        heading: 'Notifications',
        paragraphs: ['Turn them on or off in your phone’s Settings. Reminders for your matches are part of Pro.'],
      },
      {
        heading: 'Pro and purchases',
        paragraphs: ['Purchases go through the App Store or Google Play, which is also where you cancel or ask for a refund.'],
      },
      {
        heading: 'Deleting your account',
        paragraphs: ['Write to us from your account’s email and we delete it within 30 days, with your data.'],
      },
    ],
  },
};
