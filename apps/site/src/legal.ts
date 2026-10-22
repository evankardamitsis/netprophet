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
          'Τα προγράμματα και τα αποτελέσματα έρχονται από τα δημόσια φύλλα των διοργανωτών: ονόματα παικτών, ματς, σκορ. Οι ανήλικοι παίκτες δεν εμφανίζονται. Αν είσαι παίκτης και θέλεις να μην εμφανίζεσαι ή να διορθώσουμε κάτι, γράψε μας.',
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
        paragraphs: ['Το NetProphet είναι για άτομα 15 ετών και πάνω.'],
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
          'Schedules and results come from the organisers’ public sheets: player names, matches, scores. Minors are never shown. If you are a player and do not want to appear, or want something corrected, write to us.',
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
        paragraphs: ['NetProphet is for people aged 15 and over.'],
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
        paragraphs: ['Τις ανοίγεις και τις κλείνεις από τις Ρυθμίσεις του κινητού σου. Οι ειδοποιήσεις για κληρώσεις και ώρες ματς είναι μέρος του Pro. Τα τουρνουά που ακολουθείς σε ενημερώνουν δωρεάν.'],
      },
      {
        heading: 'Pro και αγορές',
        paragraphs: ['Οι αγορές γίνονται από το App Store ή το Google Play, και εκεί ακυρώνεις ή ζητάς επιστροφή.'],
      },
      {
        heading: 'Διαγραφή λογαριασμού',
        paragraphs: ['Μέσα από την εφαρμογή: Εγώ › Ρυθμίσεις › «Διαγραφή λογαριασμού». Ή γράψε μας από το email του λογαριασμού σου και τον σβήνουμε μέσα σε 30 μέρες. Όλα τα βήματα: netprophetapp.com/delete-account'],
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
        paragraphs: ['Turn them on or off in your phone’s Settings. Alerts for draws and match times are part of Pro. Tournaments you follow tell you for free.'],
      },
      {
        heading: 'Pro and purchases',
        paragraphs: ['Purchases go through the App Store or Google Play, which is also where you cancel or ask for a refund.'],
      },
      {
        heading: 'Deleting your account',
        paragraphs: ['In the app: Me › Settings › «Delete account». Or write to us from your account’s email and we delete it within 30 days. All the steps: netprophetapp.com/en/delete-account'],
      },
    ],
  },
};

/**
 * Deleting your account (22 Oct 2026): the web page Google Play asks for next to the in-app path. It says how, what
 * goes and what stays, and offers the email way for someone who no longer has the app. api.delete_my_account removes
 * the sign-in at once, and with it the profile, calls, points, σερί, follows, reactions and what the player owns;
 * purchase records stay without a name (the law asks for receipts). Greek is a draft for the founder.
 */
export const deleteAccount: Record<Lang, Doc> = {
  el: {
    title: 'Διαγραφή λογαριασμού',
    updated: 'Τελευταία ενημέρωση: 22 Οκτωβρίου 2026',
    intro: 'Μπορείς να σβήσεις τον λογαριασμό σου στο NetProphet (Monad Labs) όποτε θέλεις, με δύο τρόπους.',
    sections: [
      {
        heading: 'Από την εφαρμογή, αμέσως',
        bullets: [
          'Άνοιξε το NetProphet και μπες στον λογαριασμό σου.',
          'Πήγαινε στο Εγώ › Ρυθμίσεις.',
          'Πάτα «Διαγραφή λογαριασμού» και μετά «Ναι, διαγραφή».',
        ],
      },
      {
        heading: 'Χωρίς την εφαρμογή, με email',
        paragraphs: [
          'Γράψε στο hello@monadlabs.gr από το email που μπαίνεις στο NetProphet, με θέμα «Διαγραφή λογαριασμού». Τον σβήνουμε μέσα σε 30 μέρες και σου απαντάμε όταν γίνει.',
        ],
      },
      {
        heading: 'Τι σβήνεται',
        bullets: [
          'Ο λογαριασμός και το email σου.',
          'Το προφίλ σου: όνομα, περιοχή, φύλο, ο παίκτης σου.',
          'Ψήφοι, πόντοι, σερί, level, φίλοι, αντιδράσεις, ό,τι έχει κερδίσει ή φοράει ο παίκτης σου.',
          'Τα κλειδιά για τις ειδοποιήσεις.',
        ],
      },
      {
        heading: 'Τι μένει',
        bullets: [
          'Οι αγορές, χωρίς το όνομά σου, όσο ο νόμος ζητά να κρατάμε αποδείξεις.',
          'Τα αποτελέσματα των τουρνουά, που είναι δημόσια. Ο παίκτης μένει στα ταμπλό χωρίς τον λογαριασμό σου.',
          'Τα στατιστικά χρήσης, χωρίς email, σβήνονται μέσα σε 30 μέρες αν το ζητήσεις με email.',
        ],
      },
      {
        heading: 'Το Pro σου',
        paragraphs: [
          'Η διαγραφή δεν ακυρώνει τη συνδρομή στο κατάστημα. Ακύρωσέ τη πρώτα από το Google Play (Πληρωμές και συνδρομές) ή το App Store (Συνδρομές).',
        ],
      },
    ],
  },
  en: {
    title: 'Delete your account',
    updated: 'Last updated: 22 October 2026',
    intro: 'You can delete your NetProphet (Monad Labs) account whenever you want, in two ways.',
    sections: [
      {
        heading: 'In the app, right away',
        bullets: [
          'Open NetProphet and sign in.',
          'Go to Me › Settings.',
          'Tap «Delete account», then «Yes, delete».',
        ],
      },
      {
        heading: 'Without the app, by email',
        paragraphs: [
          'Write to hello@monadlabs.gr from the email you sign in with, subject «Delete account». We delete it within 30 days and reply when it is done.',
        ],
      },
      {
        heading: 'What is deleted',
        bullets: [
          'Your account and your email.',
          'Your profile: name, area, gender, your player.',
          'Calls, points, streak, level, friends, reactions, everything your player earned or wears.',
          'The keys for notifications.',
        ],
      },
      {
        heading: 'What stays',
        bullets: [
          'Purchase records, without your name, for as long as the law asks us to keep receipts.',
          'Tournament results, which are public. The player stays in the draws, without your account.',
          'Usage statistics, never linked to your email, are erased within 30 days if you ask by email.',
        ],
      },
      {
        heading: 'Your Pro',
        paragraphs: [
          'Deleting your account does not cancel a store subscription. Cancel it first in Google Play (Payments and subscriptions) or the App Store (Subscriptions).',
        ],
      },
    ],
  },
};
