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
  nav: { privacy: string; support: string; other: string; otherHref: string };
  hero: { eyebrow: string; questions: [string, string, string]; line: string; cta: string; soon: string };
  questions: [Question, Question, Question];
  game: { eyebrow: string; title: string; line: string; steps: Feature[] };
  more: { title: string; items: Feature[] };
  player: { eyebrow: string; title: string; line: string; note: string };
  pro: { eyebrow: string; title: string; price: string; items: string[]; note: string };
  faq: { title: string; items: { q: string; a: string }[] };
  close: { title: string; line: string };
  footer: { by: string; contact: string };
  /** the words inside the drawn phone screens */
  screens: {
    today: string;
    yourMatch: string;
    yourMatchLine: string;
    proButton: string;
    matchMeta: string;
    learn: string;
    results: string;
    yesterday: string;
    crowd: string;
    upset: string;
    called: string;
    opponent: string;
    level: string;
    rising: string;
    form: string;
    last: string;
    h2h: string;
    plays: string;
    traits: string[];
    won: string;
    lost: string;
    streak: string;
    points: string;
  };
}

export const el: Content = {
  lang: 'el',
  meta: {
    title: 'NetProphet · Τα πάντα για το ερασιτεχνικό τένις',
    description:
      'Ποιος παίζει σήμερα, ποιος κέρδισε χθες, ποιος είναι ο αντίπαλός σου. Ψήφισε ποιος κερδίζει, κράτα σερί και ανέβα στην Κατάταξη.',
  },
  nav: { privacy: 'Απόρρητο', support: 'Βοήθεια', other: 'English', otherHref: '/en' },
  hero: {
    eyebrow: 'ΤΑ ΠΑΝΤΑ ΓΙΑ ΤΟ ΕΡΑΣΙΤΕΧΝΙΚΟ ΤΕΝΙΣ',
    questions: ['Ποιος παίζει σήμερα;', 'Ποιος κέρδισε χθες;', 'Ποιος είναι ο αντίπαλός σου;'],
    line: 'Όλα τα ματς των τουρνουά, τα αποτελέσματα και οι παίκτες, στο κινητό σου. Και μια κερκίδα που ψηφίζει ποιος κερδίζει.',
    cta: 'Δες τι κάνει ↓',
    soon: 'Έρχεται στο App Store και στο Google Play',
  },
  questions: [
    {
      id: 'today',
      eyebrow: 'ΠΟΙΟΣ ΠΑΙΖΕΙ ΣΗΜΕΡΑ',
      title: 'Όλα τα σημερινά ματς, με μια ματιά.',
      line: 'Ανοίγεις την εφαρμογή και βλέπεις ποιος παίζει, πού και τι ώρα, σε όλα τα τουρνουά της περιοχής σου.',
      points: [
        'Το δικό σου ματς πάντα πρώτο, με τον αντίπαλο και την ώρα',
        'Κατηγορία, γήπεδο και επιφάνεια σε κάθε ματς',
        'Ψήφισε με ένα πάτημα και δες τι λέει η κερκίδα',
      ],
    },
    {
      id: 'results',
      eyebrow: 'ΠΟΙΟΣ ΚΕΡΔΙΣΕ ΧΘΕΣ',
      title: 'Τα αποτελέσματα, πριν σε πάρουν τηλέφωνο.',
      line: 'Σκορ, ανατροπές και τι έλεγε η κερκίδα, ανά μέρα και τουρνουά. Ενημερώνεται μόνο του, τρεις φορές τη μέρα.',
      points: [
        'Σετ προς σετ, από τη μεριά του νικητή',
        'Οι ανατροπές ξεχωρίζουν, για να μη σου ξεφύγει καμία',
        'Το είπες σωστά; Οι πόντοι σου έρχονται με το αποτέλεσμα',
      ],
    },
    {
      id: 'opponent',
      eyebrow: 'ΠΟΙΟΣ ΕΙΝΑΙ Ο ΑΝΤΙΠΑΛΟΣ ΣΟΥ',
      title: 'Ξέρεις με ποιον παίζεις, πριν μπεις στο γήπεδο.',
      line: 'Η κάρτα του αντιπάλου σου: πώς πάει φέτος, τα τελευταία του ματς, τι έγινε όταν παίξατε μεταξύ σας και πώς παίζει, όπως τον περιγράφουν όσοι έπαιξαν μαζί του.',
      points: [
        'Φόρμα και ρεκόρ της χρονιάς',
        'Τα τελευταία ματς και τα μεταξύ σας',
        'Πώς παίζει: τα χαρακτηριστικά που ψηφίζουν οι παίκτες',
      ],
    },
  ],
  game: {
    eyebrow: 'ΚΑΙ ΕΝΑ ΠΑΙΧΝΙΔΙ ΓΙΑ ΚΑΘΕ ΜΕΡΑ',
    title: 'Ψήφισε. Μάθε απόψε. Ανέβα.',
    line: 'Λες ποιος κερδίζει, μαθαίνεις το βράδυ αν το είπες σωστά, και μαζεύεις πόντους. Χωρίς χρήματα, μόνο για την τιμή.',
    steps: [
      { title: '+10 πόντοι', line: 'για κάθε ματς που το είπες σωστά, +30 όταν είναι ανατροπή' },
      { title: 'Σερί', line: 'σωστές στη σειρά, με παγώματα για τις δύσκολες μέρες' },
      { title: 'Level', line: 'ανεβαίνει με τους πόντους σου και ξεκλειδώνει καινούργια πράγματα' },
    ],
  },
  more: {
    title: 'Και όλα τα υπόλοιπα',
    items: [
      { title: 'Κατάταξη', line: 'Ο μήνας σου απέναντι σε όσους ξέρεις, στην κατηγορία σου και σε όλη την Αττική.' },
      { title: 'Τουρνουά και κληρώσεις', line: 'Τα τουρνουά σου, το πρόγραμμα και οι κληρώσεις, ενημερωμένα μόνα τους.' },
      { title: 'Για σένα', line: 'Οι 6 ερωτήσεις της ημέρας για τα ματς και τους παίκτες που ξέρεις.' },
      { title: 'Φίλοι', line: 'Ακολούθησε τους παίκτες σου και δες πρώτα τα δικά τους ματς.' },
      { title: 'Γράψε το ματς σου', line: 'Έπαιξες φιλικό; Γράψ’ το σε δέκα δευτερόλεπτα και μπαίνει στα αποτελέσματα.' },
      { title: 'Αποστολές και badges', line: 'Μικροί στόχοι κάθε μέρα και κάθε εβδομάδα, με δώρα για τον παίκτη σου.' },
    ],
  },
  player: {
    eyebrow: 'Ο ΠΑΙΚΤΗΣ ΣΟΥ',
    title: 'Ένα μπαλάκι με χαρακτήρα.',
    line: 'Διάλεξε τον παίκτη σου και ντύσ’ τον: καπέλο, κορδέλα, γυαλιά, ρούχα, ρακέτα και κορνίζα. Χοροπηδάει, ανοιγοκλείνει τα μάτια και πανηγυρίζει μαζί σου. Κάποια τα κερδίζεις παίζοντας.',
    note: 'Μόνο στυλ. Ποτέ πλεονέκτημα.',
  },
  pro: {
    eyebrow: 'NETPROPHET PRO',
    title: 'Για όσους παίζουν τουρνουά',
    price: '8,99€ τον μήνα',
    items: [
      'Ειδοποίηση για τα τουρνουά σου, τις κληρώσεις και τα ματς σου',
      'Υπενθύμιση το βράδυ πριν και δύο ώρες πριν το ματς',
      'Ο αντίπαλος πριν το ματς: φόρμα, τελευταία ματς, μεταξύ σας',
      'Τα στατιστικά σου, όλα σε μια σελίδα',
    ],
    note: 'Όλα τα υπόλοιπα είναι δωρεάν, για όλους.',
  },
  faq: {
    title: 'Ερωτήσεις',
    items: [
      { q: 'Είναι δωρεάν;', a: 'Ναι. Τα ματς, τα αποτελέσματα, οι παίκτες και το παιχνίδι είναι δωρεάν για όλους. Το Pro προσθέτει ειδοποιήσεις, υπενθυμίσεις και την κάρτα του αντιπάλου.' },
      { q: 'Από πού έρχονται τα ματς;', a: 'Από τα προγράμματα και τα αποτελέσματα που δημοσιεύουν οι διοργανωτές των τουρνουά, και από τα ματς που γράφουν οι ίδιοι οι παίκτες. Ενημερώνονται τρεις φορές τη μέρα.' },
      { q: 'Είμαι παίκτης. Πώς βρίσκω τον εαυτό μου;', a: 'Στην εγγραφή γράφεις το όνομά σου και διαλέγεις τον παίκτη σου από τα τουρνουά. Από εκεί και πέρα τα ματς σου είναι πάντα πρώτα.' },
      { q: 'Παίζω χρήματα;', a: 'Όχι. Ψηφίζεις για πόντους, σερί και θέση στην Κατάταξη. Χρήματα δεν παίζονται πουθενά.' },
      { q: 'Ποια αθλήματα έχει;', a: 'Τένις τώρα. Πάντελ, μπάσκετ και ποδόσφαιρο έρχονται μετά.' },
      { q: 'Πότε βγαίνει;', a: 'Σύντομα στο App Store και στο Google Play. Γράψε μας στο hello@monadlabs.gr αν θέλεις να το δοκιμάσεις πρώτος.' },
    ],
  },
  close: {
    title: 'Η κερκίδα σε περιμένει.',
    line: 'Δωρεάν για όλους. Το Pro είναι για όσους θέλουν περισσότερα.',
  },
  footer: { by: 'Το NetProphet είναι εφαρμογή της Monad Labs.', contact: 'Επικοινωνία' },
  screens: {
    today: 'Τι παίζει σήμερα;',
    yourMatch: 'ΤΟ ΜΑΤΣ ΣΟΥ',
    yourMatchLine: 'Σήμερα 19:30 · απέναντι Αλέξανδρος Κοψιάλης',
    proButton: 'Ο αντίπαλος πριν το ματς ›',
    matchMeta: 'Σήμερα 18:00 · Open Γλυφάδας · Μ 40+',
    learn: 'Μαθαίνεις απόψε',
    results: 'Αποτελέσματα',
    yesterday: 'ΧΘΕΣ · OPEN ΓΛΥΦΑΔΑΣ · ΗΜΙΤΕΛΙΚΑ',
    crowd: 'Το 69% έλεγε Πράτσας',
    upset: 'Ανατροπή',
    called: 'Το είπες · +10',
    opponent: 'Ο αντίπαλός σου',
    level: 'level 4',
    rising: '↑ Ανεβαίνει',
    form: 'Φόρμα',
    last: 'Τελευταία ματς',
    h2h: 'Μεταξύ σας',
    plays: 'Πώς παίζει',
    traits: ['Δυνατό σερβίς', 'Μένει πίσω', 'Δεν τα παρατάει'],
    won: 'Ν',
    lost: 'Η',
    streak: 'σερί',
    points: 'πόντοι',
  },
};

export const en: Content = {
  lang: 'en',
  meta: {
    title: 'NetProphet · Everything about amateur tennis',
    description:
      'Who plays today, who won yesterday, who your opponent is. Call who wins, keep your streak and climb the Ladder.',
  },
  nav: { privacy: 'Privacy', support: 'Help', other: 'Ελληνικά', otherHref: '/' },
  hero: {
    eyebrow: 'EVERYTHING ABOUT AMATEUR TENNIS',
    questions: ['Who plays today?', 'Who won yesterday?', 'Who is your opponent?'],
    line: 'Every tournament match, result and player, on your phone. And a crowd that calls who wins.',
    cta: 'See what it does ↓',
    soon: 'Coming to the App Store and Google Play',
  },
  questions: [
    {
      id: 'today',
      eyebrow: 'WHO PLAYS TODAY',
      title: 'All of today’s matches, at a glance.',
      line: 'Open the app and see who plays, where and when, across every tournament in your area.',
      points: [
        'Your own match always first, with your opponent and the time',
        'Category, club and surface on every match',
        'Call it with one tap and see what the crowd says',
      ],
    },
    {
      id: 'results',
      eyebrow: 'WHO WON YESTERDAY',
      title: 'The results, before anyone calls you.',
      line: 'Scores, upsets and what the crowd said, by day and tournament. It updates itself three times a day.',
      points: [
        'Set by set, from the winner’s side',
        'Upsets stand out, so you never miss one',
        'Called it right? Your points arrive with the result',
      ],
    },
    {
      id: 'opponent',
      eyebrow: 'WHO IS YOUR OPPONENT',
      title: 'Know who you play before you step on court.',
      line: 'Your opponent’s card: their year so far, their last matches, what happened when you played each other, and how they play, as described by the people who played them.',
      points: ['Form and this year’s record', 'Last matches and your head to head', 'How they play: the traits players vote for'],
    },
  ],
  game: {
    eyebrow: 'AND A GAME FOR EVERY DAY',
    title: 'Call it. Find out tonight. Climb.',
    line: 'Say who wins, find out in the evening if you were right, and collect points. No money, just the glory.',
    steps: [
      { title: '+10 points', line: 'for every match you called right, +30 for an upset' },
      { title: 'Streak', line: 'right calls in a row, with freezes for the hard days' },
      { title: 'Level', line: 'goes up with your points and unlocks new things' },
    ],
  },
  more: {
    title: 'And everything else',
    items: [
      { title: 'Ladder', line: 'Your month against the people you know, your category and all of Attica.' },
      { title: 'Tournaments and draws', line: 'Your tournaments, the schedule and the draws, updated on their own.' },
      { title: 'For you', line: 'The day’s 6 questions about the matches and players you know.' },
      { title: 'Friends', line: 'Follow your players and see their matches first.' },
      { title: 'Log your match', line: 'Played a friendly? Log it in ten seconds and it joins the results.' },
      { title: 'Quests and badges', line: 'Small goals every day and every week, with gifts for your player.' },
    ],
  },
  player: {
    eyebrow: 'YOUR PLAYER',
    title: 'A ball with character.',
    line: 'Pick your player and dress them up: cap, headband, shades, clothes, racket and frame. They bounce, blink and celebrate with you. Some things you earn by playing.',
    note: 'Style only. Never an advantage.',
  },
  pro: {
    eyebrow: 'NETPROPHET PRO',
    title: 'For tournament players',
    price: '€8.99 a month',
    items: [
      'Alerts for your tournaments, your draws and your matches',
      'A reminder the evening before and two hours before your match',
      'Your opponent before the match: form, recent matches, head to head',
      'Your stats, all on one page',
    ],
    note: 'Everything else is free, for everyone.',
  },
  faq: {
    title: 'Questions',
    items: [
      { q: 'Is it free?', a: 'Yes. Matches, results, players and the game are free for everyone. Pro adds alerts, reminders and the opponent card.' },
      { q: 'Where do the matches come from?', a: 'From the schedules and results tournament organisers publish, and from matches players log themselves. They update three times a day.' },
      { q: 'I am a player. How do I find myself?', a: 'When you sign up you type your name and pick your player from the tournaments. From then on your matches always come first.' },
      { q: 'Is there money involved?', a: 'No. You call matches for points, your streak and a place in the Ladder. No money changes hands anywhere.' },
      { q: 'Which sports?', a: 'Tennis now. Padel, basketball and football come later.' },
      { q: 'When is it out?', a: 'Soon on the App Store and Google Play. Write to hello@monadlabs.gr if you want to try it first.' },
    ],
  },
  close: {
    title: 'The crowd is waiting.',
    line: 'Free for everyone. Pro is for those who want more.',
  },
  footer: { by: 'NetProphet is an app by Monad Labs.', contact: 'Contact' },
  screens: {
    today: 'What’s on today?',
    yourMatch: 'YOUR MATCH',
    yourMatchLine: 'Today 19:30 · against Alexandros Kopsialis',
    proButton: 'Your opponent before the match ›',
    matchMeta: 'Today 18:00 · Glyfada Open · M 40+',
    learn: 'You find out tonight',
    results: 'Results',
    yesterday: 'YESTERDAY · GLYFADA OPEN · SEMI FINALS',
    crowd: '69% said Pratsas',
    upset: 'Upset',
    called: 'Called it · +10',
    opponent: 'Your opponent',
    level: 'level 4',
    rising: '↑ Rising',
    form: 'Form',
    last: 'Last matches',
    h2h: 'Head to head',
    plays: 'How they play',
    traits: ['Big serve', 'Stays back', 'Never gives up'],
    won: 'W',
    lost: 'L',
    streak: 'streak',
    points: 'points',
  },
};

export const CONTACT = 'hello@monadlabs.gr';
export const content = (lang: Lang): Content => (lang === 'el' ? el : en);
