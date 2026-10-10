/** Greek is primary. Spoken, playful, no betting vocabulary, no em dashes. */
export const el = {
  common: {
    continue: 'Συνέχεια',
    back: 'Πίσω',
  },
  streak: {
    label: 'σερί',
  },
  level: {
    label: 'level',
  },
  ladder: {
    title: 'Ladder',
  },
  tabs: {
    vote: 'Ψήφισε',
    results: 'Αποτελέσματα',
    players: 'Παίκτες',
    ladder: 'Κατάταξη',
    me: 'Εγώ',
  },
  header: {
    points: 'πόντοι',
  },
  match: {
    today: 'Σήμερα',
    tomorrow: 'Αύριο',
    levelArea: 'level {level} · {area}',
    learnTonight: 'Μαθαίνεις απόψε',
    learnTomorrow: 'Μαθαίνεις αύριο',
    learnAfter: 'Μαθαίνεις μετά το ματς',
    weekdays: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
    formats: { doubles: 'Διπλό', mixed: 'Μικτό' },
    friendly: 'Φιλικό',
    rounds: {
      round64: 'Φάση των 64',
      round32: 'Φάση των 32',
      round16: 'Δεύτερος γύρος',
      quarter: 'Προημιτελικός',
      semi: 'Ημιτελικός',
      final: 'Τελικός',
    },
  },
  addMatch: {
    cta: '+ Ματς',
    title: 'Έχεις ματς;',
    soon: 'Έρχεται σύντομα.',
  },
  welcome: {
    title: 'Μάθε τα πάντα για το ερασιτεχνικό',
    /** the last word rotates between sports */
    sports: ['τένις.', 'padel.'],
    points: ['Ψήφισε τους νικητές', 'Δες αποτελέσματα', 'Μάθε τα πάντα για τους αντιπάλους σου'],
    tagline: 'Ποιος κερδίζει σήμερα; Πες το πρώτος.',
    cta: 'Πάμε',
    later: 'Άλλη φορά',
  },
  auth: {
    title: 'Μπες στο παιχνίδι',
    subtitle: 'Γράψε το email σου και σου στέλνουμε κωδικό.',
    emailLabel: 'Το email σου',
    emailPlaceholder: 'esy@email.gr',
    sendCode: 'Στείλε μου κωδικό',
    or: 'ή',
    google: 'Συνέχεια με Google',
    codeTitle: 'Κοίτα το email σου',
    codeSent: 'Σου στείλαμε κωδικό 6 ψηφίων στο {email}.',
    codeLabel: 'Κωδικός',
    verify: 'Μπες',
    resend: 'Ξαναστείλε τον',
    changeEmail: 'Άλλο email',
    signOut: 'Αποσύνδεση',
    errors: {
      invalidEmail: 'Αυτό δεν μοιάζει με email.',
      badCode: 'Λάθος ή ληγμένος κωδικός. Ξαναδοκίμασε.',
      tooMany: 'Πολλές προσπάθειες. Δοκίμασε σε λίγο.',
      generic: 'Κάτι στράβωσε. Ξαναδοκίμασε.',
    },
  },
  feed: {
    title: 'Τι παίζει σήμερα;',
    subtitle: 'Ψήφισε τους νικητές και μάζεψε πόντους.',
    end: 'Όσο κατεβαίνεις, βλέπεις ματς από παίκτες που ίσως δεν ξέρεις.',
    empty: 'Κανένα ματς αυτή τη μέρα ακόμα.',
    error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
    voteFailed: 'Η ψήφος δεν πέρασε. Ξαναδοκίμασε.',
    votingClosed: 'Η ψηφοφορία έκλεισε.',
  },
  result: {
    correct: "Το 'πες!",
    wrong: 'Όχι αυτή τη φορά',
    /** «κέρδισε τον Νίκο Ροδίτη»: {loser} carries the article, see withArticleAccusative */
    beat: 'κέρδισε {loser}',
    /** doubles (new, not in the prototype) */
    beatPair: 'κέρδισαν τους {losers}',
    points: '+{points} · σερί {streak}',
    kept: 'κράτησες το σερί',
    next: 'Επόμενο ›',
    done: 'Εντάξει',
  },
  results: {
    title: 'Αποτελέσματα',
    subtitle: 'Τι έγινε στα γήπεδα.',
    yesterday: 'Χθες',
    dayBefore: 'Προχθές',
    /** «Την Κυριακή · OPEN ΓΛΥΦΑΔΑΣ»: the day with its article, for days within the last week */
    weekdaysOn: ['Την Κυριακή', 'Τη Δευτέρα', 'Την Τρίτη', 'Την Τετάρτη', 'Την Πέμπτη', 'Την Παρασκευή', 'Το Σάββατο'],
    friendlies: 'Φιλικά',
    /** a round names a group of results, so some are plural («Προημιτελικά») */
    rounds: {
      round64: 'Φάση των 64',
      round32: 'Φάση των 32',
      round16: 'Δεύτερος γύρος',
      quarter: 'Προημιτελικά',
      semi: 'Ημιτελικά',
      final: 'Τελικός',
    },
    upset: 'Ανατροπή',
    calledIt: 'Το ’πες · +{points}',
    /** «Το 69% έλεγε Πράτσας»: the side most people picked */
    line: 'Το {pct}% έλεγε {name}',
    retired: 'απ.',
    walkover: 'w/o',
    empty: 'Δεν έχει αποτελέσματα ακόμα. Μόλις τελειώσει ένα ματς, θα το δεις εδώ.',
    error: 'Δεν φόρτωσαν. Τράβα προς τα κάτω για ξανά.',
  },
  placeholder: {
    results: 'Τα αποτελέσματα έρχονται εδώ.',
    players: 'Οι παίκτες έρχονται εδώ.',
    ladder: 'Η Ladder ανοίγει σύντομα.',
    me: 'Το προφίλ σου έρχεται εδώ.',
  },
};
