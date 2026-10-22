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

const UPDATED_EL = 'Τελευταία ενημέρωση: 22 Οκτωβρίου 2026';
const UPDATED_EN = 'Last updated: 22 October 2026';

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
          'Αγορές: τι αγόρασες (Pro ή αντικείμενο), από ποιο κατάστημα, πότε και μέχρι πότε ισχύει. Τα στοιχεία της κάρτας σου μένουν στο App Store ή στο Google Play και δεν τα βλέπουμε ποτέ.',
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
          'Δεν πουλάμε στοιχεία. Χρησιμοποιούμε συνεργάτες που τα επεξεργάζονται για εμάς: Supabase (βάση δεδομένων και σύνδεση), Vercel (φιλοξενία), Resend (emails σύνδεσης), PostHog στην ΕΕ (στατιστικά χρήσης), RevenueCat (διαχείριση αγορών και συνδρομών: του λέμε τον κωδικό του λογαριασμού σου και παίρνουμε πίσω τι έχεις αγοράσει και μέχρι πότε ισχύει), Apple και Google (ειδοποιήσεις και αγορές μέσα από τα καταστήματα).',
          'Οι χορηγούμενες διαφημίσεις είναι banner που τα στήνουμε εμείς, με μια εικόνα και έναν σύνδεσμο. Δεν έχουμε διαφημιστικό SDK, δεν χρησιμοποιούμε το διαφημιστικό αναγνωριστικό της συσκευής σου και δεν δίνουμε στους χορηγούς κανένα στοιχείο σου. Αν πατήσεις έναν σύνδεσμο, ανοίγει το site του χορηγού και ισχύει η δική του πολιτική.',
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
          'Purchases: what you bought (Pro or an item), from which store, when and until when it is valid. Your card details stay with the App Store or Google Play and we never see them.',
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
          'We do not sell data. Partners process it for us: Supabase (database and sign-in), Vercel (hosting), Resend (sign-in emails), PostHog in the EU (usage statistics), RevenueCat (managing purchases and subscriptions: we give it your account id and get back what you bought and until when it is valid), Apple and Google (notifications and store purchases).',
          'Sponsored banners are placed by us, as a picture and a link. We have no advertising SDK, we do not use your device’s advertising ID and we give sponsors none of your data. If you tap a link, the sponsor’s own site opens and its own policy applies.',
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

/**
 * The terms of use, Greek first (22 Oct 2026). Founder decisions that shape it: no betting and no money prizes; the
 * age rule is the one the app enforces (a «15 και πάνω» tick at sign-up, the Greek age of digital consent); in-app
 * sponsored banners are allowed; the founding plan is 49,99€ for the first year and then 69,99€ a year, offered
 * until 31/12/2026; Greek law, courts of Athens. Drafts for the founder's and a lawyer's review.
 */
export const terms: Record<Lang, Doc> = {
  el: {
    title: 'Όροι χρήσης',
    updated: UPDATED_EL,
    intro:
      'Αυτοί είναι οι όροι για να παίζεις στο NetProphet. Τους γράψαμε απλά. Αν χρησιμοποιείς την εφαρμογή ή το site, συμφωνείς με αυτούς και με το Απόρρητο.',
    sections: [
      {
        heading: 'Ποιοι είμαστε',
        paragraphs: [
          'Το NetProphet το διαθέτει η MONAD LABS Ε.Ε., Αμφικτυόνων 28, Νέα Πεντέλη, Ελλάδα (εδώ «εμείς»). Επικοινωνία: hello@monadlabs.gr.',
        ],
      },
      {
        heading: 'Τι είναι το NetProphet',
        paragraphs: [
          'Ένα δωρεάν παιχνίδι ψήφου και σερί για το ερασιτεχνικό άθλημα. Ψηφίζεις ποιος θα κερδίσει, βλέπεις τι έγινε, κρατάς σερί, ανεβαίνεις στην Κατάταξη και ξεκλειδώνεις levels.',
          'Δεν είναι τυχερό παιχνίδι. Δεν βάζεις χρήματα σε κανένα ματς και δεν παίρνεις χρήματα ή δώρα με αξία. Οι πόντοι, το σερί, τα levels και οι θέσεις στην Κατάταξη δεν έχουν χρηματική αξία, δεν ανταλλάσσονται με χρήματα και δεν αγοράζονται.',
        ],
      },
      {
        heading: 'Ποιος μπορεί να παίξει',
        paragraphs: [
          'Το NetProphet είναι για άτομα 15 ετών και πάνω. Στην εγγραφή επιβεβαιώνεις ότι είσαι 15 και πάνω. Αν μάθουμε ότι κάποιος είναι μικρότερος, κλείνουμε τον λογαριασμό του.',
          'Πρέπει να έχεις τη νομική ικανότητα να δεχτείς αυτούς τους όρους ή, αν δεν την έχεις ακόμα, τη συναίνεση του γονέα ή κηδεμόνα σου.',
        ],
      },
      {
        heading: 'Ο λογαριασμός σου',
        bullets: [
          'Μπαίνεις με email και κωδικό μιας χρήσης, ή με Google ή Apple. Φρόντισε το email σου και μη δίνεις την πρόσβαση σε άλλον.',
          'Ένας άνθρωπος, ένας παίκτης: δεν κάνεις δεύτερο λογαριασμό για να παρακάμψεις αποκλεισμό ή να πάρεις πλεονέκτημα.',
          'Δίνεις σωστά στοιχεία.',
          'Μπορείς να διαγράψεις τον λογαριασμό σου όποτε θέλεις (δες παρακάτω).',
        ],
      },
      {
        heading: 'Ο παίκτης σου και οι διεκδικήσεις',
        paragraphs: [
          'Στην εγγραφή μπορείς να διεκδικήσεις τον παίκτη των τουρνουά που είσαι εσύ. Διεκδικείς μόνο τον εαυτό σου, ποτέ άλλον. Αν παριστάνεις κάποιον άλλον ή διεκδικήσεις παίκτη που δεν είσαι, κλείνουμε τη διεκδίκηση και, αν χρειαστεί, τον λογαριασμό.',
          'Αν κάποιος διεκδίκησε εσένα ή το όνομά σου χωρίς να είναι δικό του, γράψε μας στο hello@monadlabs.gr. Ελέγχουμε και διορθώνουμε. Οι διεκδικήσεις και τα νέα ονόματα περνούν από έλεγχο πριν εμφανιστούν.',
          'Οι ανήλικοι παίκτες των τουρνουά δεν εμφανίζονται.',
        ],
      },
      {
        heading: 'Ό,τι γράφεις και προσθέτεις',
        paragraphs: [
          'Στην εφαρμογή μπορείς να δώσεις όνομα στον Baller σου, να καταχωρίσεις ματς, να αντιδράσεις και να προτείνεις δικές σου φράσεις για το πώς παίζει ένας παίκτης. Παραμένουν δικά σου. Μας δίνεις το δικαίωμα να τα εμφανίζουμε στην εφαρμογή, όσο έχεις λογαριασμό, για να λειτουργεί το παιχνίδι.',
          'Δεν γράφεις τίποτα προσβλητικό, απειλητικό, ρατσιστικό, σεξουαλικό ή που βλάπτει κάποιον, ούτε στοιχεία άλλων που δεν έχεις δικαίωμα να δώσεις.',
          'Μπορείς να αναφέρεις ένα ματς, μια διεκδίκηση ή έναν χρήστη από την εφαρμογή, και να μπλοκάρεις όποιον θέλεις. Εμείς ελέγχουμε τις αναφορές, και τις νέες φράσεις πριν τις δουν άλλοι. Μπορούμε να κρύψουμε ή να σβήσουμε περιεχόμενο, να αλλάξουμε ένα όνομα και να αποκλείσουμε λογαριασμούς που παραβιάζουν τους όρους.',
          'Αν κάτι σε αφορά και θέλεις να βγει (για παράδειγμα ένα λάθος όνομα ή αποτέλεσμα, ή περιεχόμενο που σε βλάπτει), γράψε στο hello@monadlabs.gr με το τι και πού. Απαντάμε το συντομότερο και κατά κανόνα μέσα σε 7 μέρες.',
        ],
      },
      {
        heading: 'Πώς χρησιμοποιείς την εφαρμογή',
        bullets: [
          'Δεν σπας ή παρακάμπτεις την ασφάλεια, δεν κάνεις αυτοματοποιημένη πρόσβαση (bots, scraping) και δεν φορτώνεις υπερβολικά το σύστημα.',
          'Δεν αλλάζεις τους πόντους ή την Κατάταξη με ψεύτικα στοιχεία, ψεύτικα αποτελέσματα ή πολλούς λογαριασμούς.',
          'Δεν παρενοχλείς άλλους παίκτες και δεν χρησιμοποιείς το NetProphet για παράνομο σκοπό.',
          'Δεν αντιγράφεις ή αναπαράγεις την εφαρμογή, τα σχέδια και τα κείμενά μας χωρίς άδεια.',
        ],
      },
      {
        heading: 'NetProphet Pro',
        paragraphs: [
          'Το Pro είναι συνδρομή με αυτόματη ανανέωση που ανοίγει επιπλέον λειτουργίες (για παράδειγμα ειδοποιήσεις για κληρώσεις και ώρες ματς, και αναλυτικά στατιστικά). Το Pro δεν αγοράζει ποτέ πόντους, θέση στην Κατάταξη ή αποτέλεσμα. Τα ματς, τα αποτελέσματα και το παιχνίδι μένουν δωρεάν για όλους.',
        ],
        bullets: [
          'Τιμές: ορίζονται και φαίνονται στο κατάστημα (App Store ή Google Play) πριν αγοράσεις. Ενδεικτικά: 8,99€ τον μήνα ή 69,99€ τον χρόνο, με ΦΠΑ όπου ισχύει.',
          'Δωρεάν δοκιμή 7 ημερών, όπου προσφέρεται. Αν δεν ακυρώσεις τη συνδρομή τουλάχιστον 24 ώρες πριν λήξει η δοκιμή, ξεκινά αυτόματα η πληρωμένη συνδρομή και χρεώνεσαι.',
          'Ιδρυτικό πακέτο: 49,99€ για τον πρώτο χρόνο, και μετά ανανεώνεται στα 69,99€ τον χρόνο, εκτός αν ακυρώσεις. Διαθέσιμο ως τις 31/12/2026.',
          'Ανανέωση: η συνδρομή ανανεώνεται αυτόματα στο τέλος κάθε περιόδου, εκτός αν την ακυρώσεις τουλάχιστον 24 ώρες πριν.',
          'Ακύρωση και διαχείριση: από το App Store (Ρυθμίσεις › Συνδρομές) ή το Google Play (Πληρωμές και συνδρομές). Το Pro μένει ενεργό ως το τέλος της περιόδου που έχεις πληρώσει. Η διαγραφή της εφαρμογής ή του λογαριασμού δεν ακυρώνει τη συνδρομή.',
          'Επιστροφές: οι πληρωμές γίνονται από την Apple ή την Google, και οι επιστροφές ακολουθούν τους κανόνες τους. Ζητάς επιστροφή από το κατάστημα. Τα δικαιώματά σου ως καταναλωτή, όπως για την υπαναχώρηση, μένουν όπως τα ορίζει ο νόμος.',
        ],
      },
      {
        heading: 'Αντικείμενα για τον Baller',
        paragraphs: [
          'Μπορείς να αγοράσεις με μία πληρωμή ψηφιακά αντικείμενα για τον Baller σου (ρούχα, αξεσουάρ, κορνίζες). Είναι μόνο για την εμφάνιση. Δεν δίνουν πόντους, σερί, θέση στην Κατάταξη ή οποιοδήποτε πλεονέκτημα, δεν έχουν χρηματική αξία και δεν ανταλλάσσονται ή επιστρέφονται σε χρήματα. Ανήκουν στον λογαριασμό σου και δεν μεταφέρονται σε άλλον. Παραδίδονται αμέσως, και με την αγορά ζητούμε να δεχτείς ότι, μόλις παραδοθεί το ψηφιακό περιεχόμενο, χάνεις το δικαίωμα υπαναχώρησης, όπως το προβλέπει ο νόμος για το ψηφιακό περιεχόμενο. Επιστροφές ζητάς από το κατάστημα.',
        ],
      },
      {
        heading: 'Χορηγούμενο περιεχόμενο',
        paragraphs: [
          'Στην εφαρμογή μπορεί να εμφανίζονται χορηγούμενα banner, πάντα σημειωμένα ως «Χορηγούμενο». Τα επιλέγουμε εμείς και δεν επηρεάζουν πόντους, αποτελέσματα ή Κατάταξη. Για τα site στα οποία οδηγούν οι σύνδεσμοι ευθύνεται ο χορηγός και όχι εμείς. Δες και το Απόρρητο για το τι δεν μοιραζόμαστε.',
        ],
      },
      {
        heading: 'Στοιχεία και απόρρητο',
        paragraphs: ['Πώς χειριζόμαστε τα προσωπικά σου στοιχεία το λέμε στο Απόρρητο: netprophetapp.com/privacy.'],
      },
      {
        heading: 'Τα δεδομένα των αγώνων',
        paragraphs: [
          'Τα προγράμματα και τα αποτελέσματα προέρχονται από δημόσιες πηγές των διοργανωτών και από παίκτες, και μπορεί να έχουν λάθη ή καθυστερήσεις. Προσπαθούμε να τα διορθώνουμε. Δεν εγγυόμαστε ότι είναι πάντα πλήρη ή ακριβή.',
        ],
      },
      {
        heading: 'Λήξη και διαγραφή λογαριασμού',
        paragraphs: [
          'Μπορείς να σταματήσεις να παίζεις και να διαγράψεις τον λογαριασμό σου όποτε θέλεις: Εγώ › Ρυθμίσεις › «Διαγραφή λογαριασμού», ή με email στο hello@monadlabs.gr. Όλα τα βήματα και τι σβήνεται είναι στο netprophetapp.com/delete-account.',
          'Μπορούμε να περιορίσουμε ή να κλείσουμε έναν λογαριασμό που παραβιάζει αυτούς τους όρους, αφού σε ειδοποιήσουμε όταν γίνεται. Σε σοβαρή κατάχρηση μπορεί να γίνει και χωρίς προειδοποίηση.',
        ],
      },
      {
        heading: 'Διαθεσιμότητα και αλλαγές στην εφαρμογή',
        paragraphs: [
          'Φροντίζουμε να λειτουργεί, αλλά κανείς δεν υπόσχεται ότι θα είναι πάντα διαθέσιμη χωρίς διακοπή. Μπορεί να αλλάξουμε, να προσθέσουμε ή να αφαιρέσουμε λειτουργίες, και να διορθώσουμε πόντους και αποτελέσματα όταν βρούμε λάθος.',
        ],
      },
      {
        heading: 'Ευθύνη',
        paragraphs: [
          'Η εφαρμογή παρέχεται όπως είναι. Στο μέτρο που επιτρέπει ο νόμος, δεν ευθυνόμαστε για έμμεσες ζημιές ή για απώλειες από διακοπές, λάθη στα δεδομένα των αγώνων ή από τη χρήση της εφαρμογής.',
          'Τίποτα σε αυτούς τους όρους δεν περιορίζει την ευθύνη μας για δόλο ή βαριά αμέλεια, για σωματική βλάβη, ούτε τα δικαιώματά σου ως καταναλωτή που ορίζει ο ελληνικός και ο ευρωπαϊκός νόμος και δεν μπορούν να αποκλειστούν.',
        ],
      },
      {
        heading: 'Αλλαγές στους όρους',
        paragraphs: [
          'Μπορεί να αλλάξουμε αυτούς τους όρους. Για ουσιαστικές αλλαγές θα σε ενημερώσουμε στην εφαρμογή ή με email πριν ισχύσουν. Αν συνεχίσεις να χρησιμοποιείς το NetProphet μετά, τους δέχεσαι. Αν δεν συμφωνείς, μπορείς να διαγράψεις τον λογαριασμό σου.',
        ],
      },
      {
        heading: 'Εφαρμοστέο δίκαιο και δικαστήρια',
        paragraphs: [
          'Ισχύει το ελληνικό δίκαιο. Αρμόδια είναι τα δικαστήρια των Αθηνών, χωρίς να θίγονται το δικαίωμα του καταναλωτή να προσφύγει στα δικαστήρια της χώρας όπου κατοικεί ή οι υποχρεωτικές διατάξεις προστασίας του. Ως καταναλωτής, μπορείς να απευθυνθείς και στην πλατφόρμα ηλεκτρονικής επίλυσης διαφορών της ΕΕ ή σε φορέα εναλλακτικής επίλυσης (π.χ. τον Συνήγορο του Καταναλωτή).',
        ],
      },
      {
        heading: 'Επικοινωνία',
        paragraphs: ['MONAD LABS Ε.Ε. · Αμφικτυόνων 28, Νέα Πεντέλη · hello@monadlabs.gr'],
      },
    ],
  },
  en: {
    title: 'Terms of use',
    updated: UPDATED_EN,
    intro:
      'These are the terms for playing NetProphet. We wrote them in plain words. If you use the app or the site, you agree to them and to the Privacy Policy.',
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          'NetProphet is offered by MONAD LABS Ε.Ε., Amfiktyonon 28, Nea Penteli, Greece (here «we»). Contact: hello@monadlabs.gr.',
        ],
      },
      {
        heading: 'What NetProphet is',
        paragraphs: [
          'A free calling and streak game for amateur sport. You call who wins, see what happened, keep a streak, climb the Ladder and unlock levels.',
          'It is not gambling. You put no money on any match and you receive no money or prizes of value. Points, streaks, levels and places in the Ladder have no cash value, cannot be exchanged for money and cannot be bought.',
        ],
      },
      {
        heading: 'Who can play',
        paragraphs: [
          'NetProphet is for people aged 15 and over. At sign-up you confirm that you are 15 or over. If we learn that someone is younger, we close the account.',
          'You must be able to accept these terms in law or, if you are not yet, have the consent of a parent or guardian.',
        ],
      },
      {
        heading: 'Your account',
        bullets: [
          'You sign in with an email and a one-time code, or with Google or Apple. Look after your email and do not give access to anyone else.',
          'One person, one player: you do not make a second account to get around a block or to gain an edge.',
          'You give correct details.',
          'You can delete your account whenever you want (see below).',
        ],
      },
      {
        heading: 'Your player and claims',
        paragraphs: [
          'At sign-up you can claim the tournament player that is you. You claim only yourself, never someone else. If you pretend to be someone else or claim a player you are not, we close the claim and, if needed, the account.',
          'If someone claimed you or your name without it being theirs, write to hello@monadlabs.gr. We check and correct it. Claims and new names are reviewed before they show.',
          'Minor players in tournaments are not shown.',
        ],
      },
      {
        heading: 'What you write and add',
        paragraphs: [
          'In the app you can name your Baller, log matches, react, and suggest your own phrases about how a player plays. They stay yours. You give us the right to show them in the app, as long as you have an account, so the game works.',
          'You write nothing offensive, threatening, racist, sexual or harmful to anyone, and no details about others that you have no right to share.',
          'You can report a match, a claim or a user from the app, and block anyone you want. We review reports, and new phrases before others see them. We may hide or remove content, change a name and block accounts that break the terms.',
          'If something concerns you and you want it taken down (for example a wrong name or result, or content that harms you), write to hello@monadlabs.gr with what and where. We reply as soon as we can, usually within 7 days.',
        ],
      },
      {
        heading: 'How you use the app',
        bullets: [
          'You do not break or get around security, use automated access (bots, scraping) or overload the system.',
          'You do not change points or the Ladder with false details, false results or several accounts.',
          'You do not harass other players or use NetProphet for anything unlawful.',
          'You do not copy or reproduce the app, our designs and our texts without permission.',
        ],
      },
      {
        heading: 'NetProphet Pro',
        paragraphs: [
          'Pro is an auto-renewing subscription that opens extra features (for example alerts for draws and match times, and detailed stats). Pro never buys points, a place in the Ladder or an outcome. Matches, results and the game stay free for everyone.',
        ],
        bullets: [
          'Prices: set and shown in the store (App Store or Google Play) before you buy. For reference: €8.99 a month or €69.99 a year, VAT included where it applies.',
          '7-day free trial, where offered. If you do not cancel at least 24 hours before the trial ends, the paid subscription starts automatically and you are charged.',
          'Founding plan: €49.99 for the first year, then it renews at €69.99 a year unless you cancel. Available until 31 December 2026.',
          'Renewal: the subscription renews automatically at the end of each period unless you cancel at least 24 hours before.',
          'Cancel and manage: in the App Store (Settings › Subscriptions) or Google Play (Payments and subscriptions). Pro stays on until the end of the period you paid for. Deleting the app or your account does not cancel the subscription.',
          'Refunds: payment is taken by Apple or Google, and refunds follow their rules. You ask the store for a refund. Your consumer rights, such as withdrawal, stay as the law sets them.',
        ],
      },
      {
        heading: 'Items for your Baller',
        paragraphs: [
          'You can buy digital items for your Baller (clothes, accessories, frames) with a single payment. They are for looks only. They give no points, streak, place in the Ladder or any advantage, have no cash value and cannot be exchanged or refunded for money. They belong to your account and cannot be moved to anyone else. They are delivered at once, and when you buy we ask you to accept that once the digital content is delivered you lose the right of withdrawal, as the law allows for digital content. Ask the store for refunds.',
        ],
      },
      {
        heading: 'Sponsored content',
        paragraphs: [
          'The app may show sponsored banners, always marked «Sponsored». We choose them, and they do not affect points, results or the Ladder. A sponsor, not us, is responsible for the sites its links open. See the Privacy Policy for what we do not share.',
        ],
      },
      {
        heading: 'Your data and privacy',
        paragraphs: ['How we handle your personal data is in the Privacy Policy: netprophetapp.com/en/privacy.'],
      },
      {
        heading: 'Match data',
        paragraphs: [
          'Schedules and results come from the organisers’ public sources and from players, and may contain mistakes or delays. We try to correct them. We do not promise they are always complete or exact.',
        ],
      },
      {
        heading: 'Ending and deleting your account',
        paragraphs: [
          'You can stop playing and delete your account whenever you want: Me › Settings › «Delete account», or by email to hello@monadlabs.gr. All the steps and what is deleted are at netprophetapp.com/en/delete-account.',
          'We may limit or close an account that breaks these terms, telling you when we can. For serious abuse this may happen without warning.',
        ],
      },
      {
        heading: 'Availability and changes to the app',
        paragraphs: [
          'We work to keep it running, but nobody can promise it will always be available without a break. We may change, add or remove features, and correct points and results when we find a mistake.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'The app is provided as it is. As far as the law allows, we are not liable for indirect damage or for losses from interruptions, mistakes in match data or from using the app.',
          'Nothing in these terms limits our liability for intent or gross negligence, for personal injury, or your consumer rights under Greek and EU law, which cannot be excluded.',
        ],
      },
      {
        heading: 'Changes to the terms',
        paragraphs: [
          'We may change these terms. For material changes we tell you in the app or by email before they apply. If you keep using NetProphet afterwards, you accept them. If you disagree, you can delete your account.',
        ],
      },
      {
        heading: 'Governing law and courts',
        paragraphs: [
          'Greek law applies. The courts of Athens have jurisdiction, without affecting a consumer’s right to go to the courts where they live, or the mandatory rules that protect them. As a consumer you can also use the EU online dispute resolution platform or an alternative dispute resolution body (for example the Greek Consumer Ombudsman).',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['MONAD LABS Ε.Ε. · Amfiktyonon 28, Nea Penteli · hello@monadlabs.gr'],
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
      {
        heading: 'Όροι και απόρρητο',
        paragraphs: ['Οι όροι χρήσης: netprophetapp.com/terms. Το απόρρητο: netprophetapp.com/privacy.'],
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
      {
        heading: 'Terms and privacy',
        paragraphs: ['Terms of use: netprophetapp.com/en/terms. Privacy: netprophetapp.com/en/privacy.'],
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
