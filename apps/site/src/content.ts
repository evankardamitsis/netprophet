/**
 * The words of netprophetapp.com, Greek first. Built around the three questions the app answers (founder, 16 Oct):
 * who plays today, who won yesterday, who your opponent is. Rules (CLAUDE.md): spoken Greek, «level» never
 * «επίπεδο», no betting words, no em dashes, capitals without accents. content.test.ts checks them.
 */
export type Lang = 'el' | 'en';

export interface Question {
  id: string;
  eyebrow: string;
  title: string;
  line: string;
  points: string[];
}

export interface Feature {
  title: string;
  line: string;
}

export interface Content {
  lang: Lang;
  meta: { title: string; description: string };
  nav: { privacy: string; terms: string; support: string; other: string; otherHref: string };
  hero: { eyebrow: string; questions: [string, string, string]; line: string; cta: string; soon: string };
  questions: [Question, Question, Question];
  tournament: Question;
  game: { eyebrow: string; title: string; line: string; steps: Feature[] };
  more: { title: string; items: Feature[] };
  player: { eyebrow: string; title: string; line: string; note: string };
  pro: { eyebrow: string; title: string; line: string; price: string; items: Feature[]; note: string };
  faq: { title: string; items: { q: string; a: string }[] };
  close: { title: string; line: string };
  footer: { by: string; contact: string };
  /** the words inside the drawn phone screens */
  screens: Screens;
}

export interface Screens {
  lang: Lang;
  streak: string;
  points: string;
  tapHint: string;
  won: string;
  lost: string;
  /** the app's bottom tab bar, Τουρνουά first */
  tabBar: string[];
  home: {
    title: string; date: string; resultsTitle: string; resultsLine: string; resultsPoints: string; resultsBtn: string;
    yours: string; myMatch: string; myMatchLine: string; now: string; friends: string; friendsLine: string;
    quizTitle: string; quizLine: string; vote: string; voteHint: string; called: string;
    proTag: string; proTitle: string; proLine: string; proBtn: string; trial: string;
    tournaments: string; addMatch: string; playing: string; following: string; firstMatch: string; nextMatch: string; hard: string; clay: string;
  };
  results: { title: string; summary: string; points: string; day: string; right: string; wrong: string; upset: string };
  tournament: {
    name: string; meta: string; tabs: string[]; hint: string; hold: string; played: string; close: string;
    path: string; ifWins: string; round: string[]; schedule: string[]; bracketTitle: string; newRecord: string; streakLine: string;
  };
  scout: {
    title: string; pro: string; tabs: string[]; formats: string[]; year: string; last: string; h2h: string; h2hLine: string;
    surfaces: string; partners: string; plays: string; traits: string[]; playsHint: string; hand: string; form: string;
  };
}

export const el: Content = {
  lang: 'el',
  meta: {
    title: 'NetProphet · Τα πάντα για το ερασιτεχνικό τένις',
    description:
      'Ποιος παίζει σήμερα, ποιος κέρδισε χθες, ποιος είναι ο αντίπαλός σου. Όλα τα ματς, τα αποτελέσματα και οι παίκτες των τουρνουά, στο κινητό σου.',
  },
  nav: { privacy: 'Πολιτική Απορρήτου', terms: 'Όροι χρήσης', support: 'Βοήθεια', other: 'English', otherHref: '/en' },
  hero: {
    eyebrow: 'ΤΑ ΠΑΝΤΑ ΓΙΑ ΤΟ ΕΡΑΣΙΤΕΧΝΙΚΟ ΤΕΝΙΣ',
    questions: ['Ποιος παίζει σήμερα;', 'Ποιος κέρδισε χθες;', 'Ποιος είναι ο αντίπαλός σου;'],
    line: 'Όλα τα ματς των τουρνουά, τα αποτελέσματα και οι παίκτες, ενημερωμένα στο κινητό σου. Και μια κερκίδα που ψηφίζει ποιος κερδίζει.',
    cta: 'Δες τι κάνει ↓',
    soon: 'Έρχεται στο App Store και στο Google Play',
  },
  questions: [
    {
      id: 'today',
      eyebrow: 'ΠΟΙΟΣ ΠΑΙΖΕΙ ΣΗΜΕΡΑ',
      title: 'Όλα όσα παίζονται σήμερα, με μια ματιά.',
      line: 'Ανοίγεις την εφαρμογή και βλέπεις πρώτα τα δικά σου: το ματς σου, τους φίλους σου που παίζουν τώρα. Μετά τα τουρνουά της μέρας.',
      points: [
        'Τα αποτελέσματα της χθεσινής μέρας και οι πόντοι σου, σε μία κάρτα',
        'Πάτα το όνομα του παίκτη που θα κερδίσει: ψηφίζεις αμέσως και βλέπεις τι λέει η κερκίδα',
        'Τα τουρνουά σήμερα, με επιφάνεια και ώρα. Στα δικά σου γράφει «Παίζεις»',
      ],
    },
    {
      id: 'results',
      eyebrow: 'ΠΟΙΟΣ ΚΕΡΔΙΣΕ ΧΘΕΣ',
      title: 'Μάθε τα αποτελέσματα, πριν αρχίσεις τα τηλέφωνα.',
      line: 'Σκορ, ανατροπές και τι έλεγε η κερκίδα, ανά μέρα και τουρνουά. Όλα ενημερωμένα στο κινητό σου.',
      points: [
        'Σετ και αναλυτικό σκορ',
        'Ψήφισες σωστά; Το ματς φωτίζεται με ✓ και οι πόντοι σου έρχονται μαζί με το αποτέλεσμα',
        'Οι ανατροπές ξεχωρίζουν, για να μη σου ξεφύγει καμία',
      ],
    },
    {
      id: 'opponent',
      eyebrow: 'ΠΟΙΟΣ ΕΙΝΑΙ Ο ΑΝΤΙΠΑΛΟΣ ΣΟΥ',
      title: 'Ξέρεις με ποιον παίζεις, πριν μπεις στο γήπεδο.',
      line: 'Η κάρτα κάθε παίκτη έχει τα τελευταία του ματς και το πώς παίζει, όπως τον περιγράφουν όσοι έπαιξαν μαζί του. Με Pro, το «Δες τον αντίπαλό σου» ανοίγει όλο του το ιστορικό.',
      points: [
        'Τελευταία ματς και «Πώς παίζει»: πάτα ένα χαρακτηριστικό για να του δώσεις +1',
        'Pro: μονά και διπλά, τα μεταξύ σας, φόρμα και επιφάνειες',
        'Pro: με ποιους παρτενέρ παίζει και πώς τα πάνε μαζί',
      ],
    },
  ],
  tournament: {
    id: 'tournament',
    eyebrow: 'ΜΕΣΑ ΣΤΟ ΤΟΥΡΝΟΥΑ',
    title: 'Δες όλο το τουρνουά, όχι μόνο το ματς σου.',
    line: 'Κάθε τουρνουά έχει τρεις όψεις: τι παίζεται σήμερα, το ταμπλό και το πρόγραμμα. Και ένα κόλπο: κράτα πατημένο ένα όνομα.',
    points: [
      'Σήμερα, Ταμπλό και Πρόγραμμα, ένα πάτημα μακριά',
      'Κράτα πατημένο ένα όνομα και δες την πορεία του στο ταμπλό, μαζί με το «Αν κερδίσει»',
      'Το σερί μετράει σωστές ψήφους στη σειρά. Όταν περάσεις το καλύτερό σου, βλέπεις «Νέο ρεκόρ»',
    ],
  },
  game: {
    eyebrow: 'ΚΑΙ ΕΝΑ ΠΑΙΧΝΙΔΙ ΓΙΑ ΚΑΘΕ ΜΕΡΑ',
    title: 'Πες ποιος κερδίζει.',
    line: 'Πριν από κάθε ματς πατάς το όνομα αυτού που θα κερδίσει. Όταν βγει το αποτέλεσμα, μαθαίνεις αν το πέτυχες και κερδίζεις πόντους.',
    steps: [
      { title: '+10 πόντοι', line: 'για κάθε σωστή ψήφο, +30 αν ήταν ανατροπή. Το Quiz της ημέρας δίνει άλλους +30.' },
      { title: 'Σερί', line: 'πόσες σωστές ψήφους έχεις στη σειρά. Ένα λάθος το μηδενίζει, εκτός αν έχεις Ασφάλεια. Όταν περάσεις το καλύτερό σου: «Νέο ρεκόρ».' },
      { title: 'Level', line: 'ανεβαίνει με τους πόντους σου και ξεκλειδώνει νέα πράγματα στην εφαρμογή.' },
    ],
  },
  more: {
    title: 'Όλα όσα χρειάζεται ένας παίκτης',
    items: [
      { title: 'Κατάταξη', line: 'Ο μήνας σου απέναντι σε όσους ξέρεις, στην κατηγορία σου και σε όλη την Αττική.' },
      { title: 'Τουρνουά και κληρώσεις', line: 'Ακολούθησε ένα τουρνουά και μαθαίνεις για την κλήρωση, το πρόγραμμα και τον τελικό, δωρεάν.' },
      { title: 'Φίλοι', line: 'Ακολούθησε τους φίλους σου και δες πρώτα τα δικά τους ματς.' },
      { title: 'Πέρνα το ματς σου', line: 'Έπαιξες αγώνα; Πάτα «+ Ματς», γράψ’ το σε δέκα δευτερόλεπτα και δες το στα αποτελέσματα.' },
      { title: 'Αποστολές και Badges', line: 'Μικροί στόχοι κάθε μέρα και κάθε εβδομάδα, με δώρα για τον Baller σου.' },
      { title: 'Quiz της ημέρας', line: 'Έξι γρήγορες ερωτήσεις κάθε μέρα. Και οι έξι δίνουν +30.' },
    ],
  },
  player: {
    eyebrow: 'NETPROPHET BALLER',
    title: 'Γνώρισε τον Baller σου.',
    line: 'Ο Baller είναι ο παίκτης σου στο NetProphet: ένα μπαλάκι με χαρακτήρα. Τον ντύνεις με καπέλο, κορδέλα, γυαλιά, ρούχα, ρακέτα και το δικό του frame. Χοροπηδάει, ανοιγοκλείνει τα μάτια και πανηγυρίζει μαζί σου.',
    note: 'Κάποια τα κερδίζεις με σερί και αποστολές, άλλα τα προσαρμόζεις από την Εμφάνιση.',
  },
  pro: {
    eyebrow: 'NETPROPHET PRO',
    title: 'Για όσους παίζουν τουρνουά',
    line: 'Το Pro σε κρατάει ενήμερο για ό,τι σε αφορά, χωρίς να ψάχνεις. Δεν αγοράζει πόντους ούτε θέση στην Κατάταξη.',
    price: '8,99€ τον μήνα',
    items: [
      { title: 'Δες τον αντίπαλό σου', line: 'Όλο του το ιστορικό, μονά και διπλά: τα μεταξύ σας, φόρμα, επιφάνειες και παρτενέρ.' },
      { title: 'Ειδοποιήσεις για κληρώσεις και ώρες ματς', line: 'Μόλις βγει η κλήρωση ή αλλάξει η ώρα του ματς σου, το μαθαίνεις πρώτος.' },
      { title: 'Τα στατιστικά σου', line: 'Νίκες, σετ, επιφάνειες και οι αντίπαλοι που βρίσκεις πιο συχνά, όλα σε μια σελίδα.' },
      { title: '7 μέρες δωρεάν', line: '69,99€ τον χρόνο. Μέχρι 31/12, το ιδρυτικό πακέτο: 49,99€ τον πρώτο χρόνο, μετά 69,99€/χρόνο.' },
    ],
    note: 'Τα ματς, τα αποτελέσματα και το παιχνίδι μένουν δωρεάν για όλους.',
  },
  faq: {
    title: 'Ερωτήσεις',
    items: [
      { q: 'Είναι δωρεάν;', a: 'Ναι. Τα ματς, τα αποτελέσματα, οι παίκτες και το παιχνίδι είναι δωρεάν για όλους. Το Pro προσθέτει τον πλήρη αντίπαλο, ειδοποιήσεις για κληρώσεις και ώρες ματς, και τα στατιστικά σου. Δεν αγοράζει ποτέ πόντους ή θέση στην Κατάταξη.' },
      { q: 'Πόσο κοστίζει το Pro;', a: '8,99€ τον μήνα ή 69,99€ τον χρόνο, με 7 μέρες δωρεάν. Μέχρι 31/12 υπάρχει το ιδρυτικό πακέτο: 49,99€ τον πρώτο χρόνο, μετά 69,99€ τον χρόνο. Η συνδρομή ανανεώνεται αυτόματα και την ακυρώνεις όποτε θες.' },
      { q: 'Από πού έρχονται τα ματς;', a: 'Από τα προγράμματα και τα αποτελέσματα που δημοσιεύουν οι διοργανωτές των τουρνουά, και από τα ματς που περνάν οι ίδιοι οι παίκτες. Όλα ενημερωμένα καθημερινά.' },
      { q: 'Είμαι παίκτης. Πώς βρίσκω τον εαυτό μου;', a: 'Στην εγγραφή γράφεις το όνομά σου και επιλέγεις ότι παίζεις σε τουρνουά. Από εκεί και πέρα βλέπεις τα ματς σου πάντα πρώτα.' },
      { q: 'Παίζω κάπου χρήματα;', a: 'Όχι. Ψηφίζεις για πόντους, σερί και θέση στην Κατάταξη. Χρήματα δεν παίζονται πουθενά.' },
      { q: 'Ποια αθλήματα έχει;', a: 'Τένις τώρα. Padel, μπάσκετ και ποδόσφαιρο έρχονται σύντομα.' },
      { q: 'Πότε βγαίνει;', a: 'Σύντομα στο App Store και στο Google Play. Γράψε μας στο hello@monadlabs.gr αν θέλεις να το δοκιμάσεις πρώτος.' },
    ],
  },
  close: {
    title: 'Η κερκίδα σε περιμένει.',
    line: 'Δωρεάν για όλους. Το Pro είναι για όσους θέλουν περισσότερα.',
  },
  footer: { by: 'Το NetProphet είναι εφαρμογή της Monad Labs.', contact: 'Επικοινωνία' },
  screens: {
    lang: 'el',
    streak: 'σερί',
    points: 'πόντοι',
    tapHint: 'Πάτα για να δοκιμάσεις',
    won: 'Ν',
    lost: 'Η',
    tabBar: ['Τουρνουά', 'Αποτελέσματα', 'Κατάταξη', 'Εγώ'],
    home: {
      title: 'Σήμερα',
      date: 'Πέμπτη 22 Οκτ',
      resultsTitle: '3 αποτελέσματα από χθες',
      resultsLine: '2 ✓ · 1 χαμένο',
      resultsPoints: '+30',
      resultsBtn: 'Δες τα ›',
      yours: 'Οι δικοί σου',
      myMatch: 'Ο αγώνας σου',
      myMatchLine: 'με Φορχάντη · Open Γλυφάδας',
      now: 'Τώρα',
      friends: 'Σερβίδης με Λοβάκη',
      friendsLine: 'Open Γλυφάδας',
      quizTitle: 'Quiz της ημέρας',
      quizLine: '6 ερωτήσεις · και οι 6 δίνουν +30',
      vote: 'Ψήφισε σήμερα',
      voteHint: 'Πάτα το όνομα που θα κερδίσει',
      called: 'Ψήφισες',
      proTag: 'PRO',
      proTitle: 'Ο αντίπαλός σου στις 18:00',
      proLine: 'Πώς έπαιξε φέτος, ποιους κέρδισε, σε ποια επιφάνεια.',
      proBtn: 'Δες τον αντίπαλο ›',
      trial: '7 μέρες δωρεάν',
      tournaments: 'Τουρνουά σήμερα',
      addMatch: '+ Ματς',
      playing: 'Παίζεις',
      following: 'Ακολουθείς',
      firstMatch: 'Πρώτο ματς 18:00',
      nextMatch: 'Επόμενο ματς 17:30',
      hard: 'Σκληρό',
      clay: 'Χώμα',
    },
    results: {
      title: 'Αποτελέσματα',
      summary: '2 ✓ από 3',
      points: '+30',
      day: 'ΧΘΕΣ · OPEN ΓΛΥΦΑΔΑΣ',
      right: 'Το είχες',
      wrong: 'Όχι αυτή τη φορά',
      upset: 'Ανατροπή',
    },
    tournament: {
      name: 'Open Γλυφάδας',
      meta: 'Χώμα · Ημιτελικοί σήμερα',
      tabs: ['Σήμερα', 'Ταμπλό', 'Πρόγραμμα'],
      hint: 'Κράτα πατημένο ένα όνομα για την πορεία του στο τουρνουά',
      hold: 'Η πορεία στο ταμπλό',
      played: 'Ως τώρα',
      close: '‹',
      path: 'Φορχάντης',
      ifWins: 'Αν κερδίσει',
      round: ['Φάση των 16', 'Προημιτελικός', 'Ημιτελικός', 'Τελικός'],
      schedule: ['18:00 · Ρακετάκης με Φορχάντη', '19:30 · Σερβίδης με Λοβάκη', 'Αύριο 10:00 · Τελικός'],
      bracketTitle: 'Ταμπλό',
      newRecord: 'Νέο ρεκόρ!',
      streakLine: 'Πέρασες το 4. Πάμε για παραπάνω!',
    },
    scout: {
      title: 'Ο αντίπαλος πριν το ματς',
      pro: 'PRO',
      tabs: ['Ματς', 'Μεταξύ σας', 'Πώς παίζει'],
      formats: ['Μονά', 'Διπλά'],
      year: 'Φέτος 11-4',
      last: 'Τελευταία ματς',
      h2h: 'Μεταξύ σας',
      h2hLine: '2 ματς μεταξύ σας · Τελευταίο: Open Βούλας, 6-4 3-6 10-8',
      surfaces: 'Επιφάνειες',
      partners: 'Παρτενέρ',
      plays: 'Πώς παίζει',
      traits: ['Δυνατό σερβίς', 'Μένει στη baseline', 'Δεν τα παρατάει'],
      playsHint: 'Πάτα ένα για +1',
      hand: 'δεξί χέρι',
      form: 'Φόρμα',
    },
  },
};

export const en: Content = {
  lang: 'en',
  meta: {
    title: 'NetProphet · Everything about amateur tennis',
    description:
      'Who plays today, who won yesterday, who your opponent is. Every tournament match, result and player, on your phone.',
  },
  nav: { privacy: 'Privacy Policy', terms: 'Terms of use', support: 'Help', other: 'Ελληνικά', otherHref: '/' },
  hero: {
    eyebrow: 'EVERYTHING ABOUT AMATEUR TENNIS',
    questions: ['Who plays today?', 'Who won yesterday?', 'Who is your opponent?'],
    line: 'Every tournament match, result and player, up to date on your phone. And a crowd that calls who wins.',
    cta: 'See what it does ↓',
    soon: 'Coming to the App Store and Google Play',
  },
  questions: [
    {
      id: 'today',
      eyebrow: 'WHO PLAYS TODAY',
      title: 'Everything on today, at a glance.',
      line: 'Open the app and your things come first: your match, your friends playing right now. Then the day’s tournaments.',
      points: [
        'Yesterday’s results and your points, on one card',
        'Tap the name of the player you think wins: your vote counts at once and you see what the crowd says',
        'Today’s tournaments with surface and time. Yours say “Playing”',
      ],
    },
    {
      id: 'results',
      eyebrow: 'WHO WON YESTERDAY',
      title: 'Know the results before the phone calls start.',
      line: 'Scores, upsets and what the crowd said, by day and tournament. All up to date on your phone.',
      points: [
        'Sets and the full score',
        'Called it? The match lights up with ✓ and your points arrive with the result',
        'Upsets stand out, so you never miss one',
      ],
    },
    {
      id: 'opponent',
      eyebrow: 'WHO IS YOUR OPPONENT',
      title: 'Know who you play before you step on court.',
      line: 'Every player’s card shows their last matches and how they play, as described by the people who played them. With Pro, “See your opponent” opens their whole history.',
      points: [
        'Last matches and “How they play”: tap a trait to give it +1',
        'Pro: singles and doubles, your head to head, form and surfaces',
        'Pro: which partners they play with and how they do together',
      ],
    },
  ],
  tournament: {
    id: 'tournament',
    eyebrow: 'INSIDE A TOURNAMENT',
    title: 'See the whole tournament, not just your match.',
    line: 'Every tournament has three views: what is on today, the draw and the schedule. And one trick: hold a name.',
    points: [
      'Today, Draw and Schedule, one tap apart',
      'Hold a name to see their run through the draw, with “If they win”',
      'Your streak counts right votes in a row. Pass your best and you see “New record”',
    ],
  },
  game: {
    eyebrow: 'AND A GAME FOR EVERY DAY',
    title: 'Say who wins.',
    line: 'Before every match you tap the name of who will win. When the result comes in, you find out if you got it right and earn points.',
    steps: [
      { title: '+10 points', line: 'for every right vote, +30 if it was an upset. The daily Quiz gives another +30.' },
      { title: 'Streak', line: 'how many right votes you have in a row. One wrong vote resets it, unless you have Insurance. Pass your best and it is a “New record”.' },
      { title: 'Level', line: 'goes up with your points and unlocks new things in the app.' },
    ],
  },
  more: {
    title: 'Everything a player needs',
    items: [
      { title: 'Ladder', line: 'Your month against the people you know, your category and all of Attica.' },
      { title: 'Tournaments and draws', line: 'Follow a tournament and hear about the draw, the schedule and the final, for free.' },
      { title: 'Friends', line: 'Follow your friends and see their matches first.' },
      { title: 'Log your match', line: 'Played a match? Tap “+ Match”, log it in ten seconds and see it in the results.' },
      { title: 'Quests and Badges', line: 'Small goals every day and every week, with gifts for your Baller.' },
      { title: 'Daily Quiz', line: 'Six quick questions every day. All six give +30.' },
    ],
  },
  player: {
    eyebrow: 'NETPROPHET BALLER',
    title: 'Meet your Baller.',
    line: 'Your Baller is your player on NetProphet: a ball with character. Dress them with a cap, headband, shades, clothes, racket and their own frame. They bounce, blink and celebrate with you.',
    note: 'Some things you earn with streaks and quests, others you customise in Look.',
  },
  pro: {
    eyebrow: 'NETPROPHET PRO',
    title: 'For tournament players',
    line: 'Pro keeps you up to date on everything that concerns you, without searching. It never buys points or a place in the Ladder.',
    price: '€8.99 a month',
    items: [
      { title: 'See your opponent', line: 'Their whole history, singles and doubles: your head to head, form, surfaces and partners.' },
      { title: 'Alerts for draws and match times', line: 'The moment the draw is out or your match time changes, you know first.' },
      { title: 'Your stats', line: 'Wins, sets, surfaces and the opponents you meet most, all on one page.' },
      { title: '7 days free', line: '€69.99 a year. Until 31 December, the founding plan: €49.99 for the first year, then €69.99/year.' },
    ],
    note: 'Matches, results and the game stay free for everyone.',
  },
  faq: {
    title: 'Questions',
    items: [
      { q: 'Is it free?', a: 'Yes. Matches, results, players and the game are free for everyone. Pro adds the full opponent view, alerts for draws and match times, and your stats. It never buys points or a place in the Ladder.' },
      { q: 'How much is Pro?', a: '€8.99 a month or €69.99 a year, with 7 days free. Until 31 December there is a founding plan: €49.99 for the first year, then €69.99 a year. It renews automatically and you can cancel any time.' },
      { q: 'Where do the matches come from?', a: 'From the schedules and results tournament organisers publish, and from matches players log themselves. Everything is updated daily.' },
      { q: 'I am a player. How do I find myself?', a: 'When you sign up you type your name and say you play in tournaments. From then on you always see your matches first.' },
      { q: 'Is money involved anywhere?', a: 'No. You vote for points, your streak and a place in the Ladder. No money changes hands anywhere.' },
      { q: 'Which sports?', a: 'Tennis now. Padel, basketball and football are coming soon.' },
      { q: 'When is it out?', a: 'Soon on the App Store and Google Play. Write to hello@monadlabs.gr if you want to try it first.' },
    ],
  },
  close: {
    title: 'The crowd is waiting.',
    line: 'Free for everyone. Pro is for those who want more.',
  },
  footer: { by: 'NetProphet is an app by Monad Labs.', contact: 'Contact' },
  screens: {
    lang: 'en',
    streak: 'streak',
    points: 'points',
    tapHint: 'Tap to try it',
    won: 'W',
    lost: 'L',
    tabBar: ['Tournaments', 'Results', 'Ladder', 'Me'],
    home: {
      title: 'Today',
      date: 'Thu 22 Oct',
      resultsTitle: '3 results from yesterday',
      resultsLine: '2 ✓ · 1 missed',
      resultsPoints: '+30',
      resultsBtn: 'See them ›',
      yours: 'Yours',
      myMatch: 'Your match',
      myMatchLine: 'against Forchantis · Glyfada Open',
      now: 'Now',
      friends: 'Servidis against Lovakis',
      friendsLine: 'Glyfada Open',
      quizTitle: 'Daily Quiz',
      quizLine: '6 questions · all 6 give +30',
      vote: 'Vote today',
      voteHint: 'Tap the name who wins',
      called: 'You voted',
      proTag: 'PRO',
      proTitle: 'Your opponent at 18:00',
      proLine: 'How they played this year, who they beat, on which surface.',
      proBtn: 'See your opponent ›',
      trial: '7 days free',
      tournaments: 'Tournaments today',
      addMatch: '+ Match',
      playing: 'Playing',
      following: 'Following',
      firstMatch: 'First match 18:00',
      nextMatch: 'Next match 17:30',
      hard: 'Hard',
      clay: 'Clay',
    },
    results: {
      title: 'Results',
      summary: '2 ✓ of 3',
      points: '+30',
      day: 'YESTERDAY · GLYFADA OPEN',
      right: 'You had it',
      wrong: 'Not this time',
      upset: 'Upset',
    },
    tournament: {
      name: 'Glyfada Open',
      meta: 'Clay · Semi-finals today',
      tabs: ['Today', 'Draw', 'Schedule'],
      hint: 'Hold a name to see their run through the tournament',
      hold: 'Their run through the draw',
      played: 'So far',
      close: '‹',
      path: 'Forchantis',
      ifWins: 'If they win',
      round: ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
      schedule: ['18:00 · Raketakis against Forchantis', '19:30 · Servidis against Lovakis', 'Tomorrow 10:00 · Final'],
      bracketTitle: 'Draw',
      newRecord: 'New record!',
      streakLine: 'You passed 4. Let’s go for more!',
    },
    scout: {
      title: 'Your opponent before the match',
      pro: 'PRO',
      tabs: ['Matches', 'Head to head', 'How they play'],
      formats: ['Singles', 'Doubles'],
      year: 'This year 11-4',
      last: 'Last matches',
      h2h: 'Head to head',
      h2hLine: '2 matches between you · Last: Voula Open, 6-4 3-6 10-8',
      surfaces: 'Surfaces',
      partners: 'Partners',
      plays: 'How they play',
      traits: ['Big serve', 'Stays on the baseline', 'Never gives up'],
      playsHint: 'Tap one for +1',
      hand: 'right-handed',
      form: 'Form',
    },
  },
};

export const CONTACT = 'hello@monadlabs.gr';
export const content = (lang: Lang): Content => (lang === 'el' ? el : en);
