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
  feed: Question;
  game: { eyebrow: string; title: string; line: string; steps: Feature[] };
  more: { title: string; items: Feature[] };
  player: { eyebrow: string; title: string; line: string; note: string };
  pro: { eyebrow: string; title: string; line: string; price: string; items: Feature[]; note: string };
  faq: { title: string; items: { q: string; a: string }[] };
  close: { title: string; line: string };
  footer: { by: string; contact: string };
  /** the words inside the drawn phone screens */
  screens: {
    lang: Lang;
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
    tabs: [string, string, string];
    pick: string;
    forYou: string;
    friendMatch: string;
    quizQ: string;
    quizA: [string, string, string];
    quizRight: string;
    quizWrong: string;
    reactions: [string, string];
    tapHint: string;
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
      'Ποιος παίζει σήμερα, ποιος κέρδισε χθες, ποιος είναι ο αντίπαλός σου. Όλα τα ματς, τα αποτελέσματα και οι παίκτες των τουρνουά, στο κινητό σου.',
  },
  nav: { privacy: 'Πολιτική Απορρήτου', support: 'Βοήθεια', other: 'English', otherHref: '/en' },
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
      title: 'Όλα τα ματς που παίζονται σήμερα, με μια ματιά.',
      line: 'Ανοίγεις την εφαρμογή και βλέπεις ποιος παίζει, πού και τι ώρα, σε όλα τα τουρνουά της περιοχής σου.',
      points: [
        'Το δικό σου ματς πρώτο στο Feed, με αναλυτικές πληροφορίες για τον αντίπαλο',
        'Κατηγορία, γήπεδο και επιφάνεια για κάθε ματς',
        'Ψήφισε με ένα πάτημα και δες τι λέει η κερκίδα',
      ],
    },
    {
      id: 'results',
      eyebrow: 'ΠΟΙΟΣ ΚΕΡΔΙΣΕ ΧΘΕΣ',
      title: 'Μάθε τα αποτελέσματα, πριν αρχίσεις τα τηλέφωνα.',
      line: 'Σκορ, ανατροπές και τι έλεγε η κερκίδα, ανά μέρα και τουρνουά. Όλα ενημερωμένα στο κινητό σου.',
      points: [
        'Σετ και αναλυτικό σκορ',
        'Οι ανατροπές ξεχωρίζουν, για να μη σου ξεφύγει καμία',
        'Ψήφισες σωστά τον νικητή; Οι πόντοι σου έρχονται με το αποτέλεσμα',
      ],
    },
    {
      id: 'opponent',
      eyebrow: 'ΠΟΙΟΣ ΕΙΝΑΙ Ο ΑΝΤΙΠΑΛΟΣ ΣΟΥ',
      title: 'Ξέρεις με ποιον παίζεις, πριν μπεις στο γήπεδο.',
      line: 'Η κάρτα του αντιπάλου σου: πώς πάει φέτος, τα τελευταία του ματς, τι έγινε όταν παίξατε μεταξύ σας και πώς παίζει, όπως τον περιγράφουν όσοι έπαιξαν μαζί του.',
      points: ['Φόρμα και ρεκόρ της χρονιάς', 'Τα τελευταία ματς και τα μεταξύ σας', 'Πώς παίζει: τα χαρακτηριστικά που ψηφίζουν οι παίκτες'],
    },
  ],
  feed: {
    id: 'feed',
    eyebrow: 'ΦΤΙΑΓΜΕΝΟ ΓΙΑ ΣΕΝΑ',
    title: 'Ένα feed που ξέρει τι σε ενδιαφέρει.',
    line: 'Βλέπεις πρώτα τα δικά σου: το ματς σου, τους φίλους σου, τα τουρνουά σου. Μετά την περιοχή σου. Όσο ψηφίζεις και ακολουθείς παίκτες, τόσο πιο δικό σου γίνεται.',
    points: [
      'Πρώτα το ματς σου και τα ματς των φίλων σου',
      'Τα τουρνουά και οι κατηγορίες που σε αφορούν',
      '«Για σένα» Mini Quiz: 6 ερωτήσεις κάθε μέρα για παίκτες που ξέρεις',
    ],
  },
  game: {
    eyebrow: 'ΚΑΙ ΕΝΑ ΠΑΙΧΝΙΔΙ ΓΙΑ ΚΑΘΕ ΜΕΡΑ',
    title: 'Πες ποιος κερδίζει.',
    line: 'Πριν από κάθε ματς ψηφίζεις ποιος θα κερδίσει. Όταν βγει το αποτέλεσμα, μαθαίνεις αν το πέτυχες και κερδίζεις πόντους.',
    steps: [
      { title: '+10 πόντοι', line: 'για κάθε σωστή πρόβλεψη, +30 αν ήταν ανατροπή.' },
      { title: 'Σερί', line: 'πόσες σωστές έχεις στη σειρά. Ένα λάθος το μηδενίζει, εκτός αν έχεις Ασφάλεια: τότε το σερί σου μένει.' },
      { title: 'Level', line: 'ανεβαίνει με τους πόντους σου και ξεκλειδώνει νέα πράγματα στην εφαρμογή.' },
    ],
  },
  more: {
    title: 'Όλα όσα χρειάζεται ένας παίκτης',
    items: [
      { title: 'Κατάταξη', line: 'Ο μήνας σου απέναντι σε όσους ξέρεις, στην κατηγορία σου και σε όλη την Αττική.' },
      { title: 'Τουρνουά και κληρώσεις', line: 'Τα τουρνουά σου, το πρόγραμμα και οι κληρώσεις, ενημερωμένα μόνα τους.' },
      { title: 'Φίλοι', line: 'Ακολούθησε τους φίλους σου και δες πρώτα τα δικά τους ματς.' },
      { title: 'Πέρνα το ματς σου', line: 'Έπαιξες αγώνα; Γράψ’ το σε δέκα δευτερόλεπτα και δες το στα αποτελέσματα.' },
      { title: 'Αποστολές και Badges', line: 'Μικροί στόχοι κάθε μέρα και κάθε εβδομάδα, με δώρα για τον Baller σου.' },
      { title: 'Ειδοποιήσεις', line: 'Μαθαίνεις αν το πέτυχες τη στιγμή που βγαίνει το αποτέλεσμα.' },
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
    line: 'Το Pro σε κρατάει ενήμερο για ό,τι σε αφορά, χωρίς να ψάχνεις.',
    price: '8,99€ τον μήνα',
    items: [
      { title: 'Live ειδοποιήσεις για τα τουρνουά σου', line: 'Μόλις βγει η κλήρωση ή αλλάξει το πρόγραμμα, το μαθαίνεις πρώτος.' },
      { title: 'Υπενθυμίσεις για τα ματς σου', line: 'Το προηγούμενο βράδυ και δύο ώρες πριν, με ώρα, γήπεδο και αντίπαλο.' },
      { title: 'Ο αντίπαλος πριν το ματς', line: 'Φόρμα, τελευταία ματς, τα μεταξύ σας και πώς παίζει.' },
      { title: 'Τα στατιστικά σου αναλυτικά', line: 'Ρεκόρ, φόρμα και πώς πας στη χρονιά, όλα σε μια σελίδα.' },
    ],
    note: 'Τα ματς, τα αποτελέσματα και το παιχνίδι μένουν δωρεάν για όλους.',
  },
  faq: {
    title: 'Ερωτήσεις',
    items: [
      { q: 'Είναι δωρεάν;', a: 'Ναι. Τα ματς, τα αποτελέσματα, οι παίκτες και το παιχνίδι είναι δωρεάν για όλους. Το Pro προσθέτει ειδοποιήσεις, υπενθυμίσεις και την κάρτα του αντιπάλου.' },
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
    today: 'Τι παίζει σήμερα;',
    yourMatch: 'ΤΟ ΜΑΤΣ ΣΟΥ',
    yourMatchLine: 'Σήμερα 19:30 · απέναντι Άρης Φορχάντης',
    proButton: 'Ο αντίπαλος πριν το ματς ›',
    matchMeta: 'Σήμερα 18:00 · Open Γλυφάδας · Μ 40+',
    learn: 'Μαθαίνεις απόψε',
    results: 'Αποτελέσματα',
    yesterday: 'ΧΘΕΣ · OPEN ΓΛΥΦΑΔΑΣ · ΗΜΙΤΕΛΙΚΑ',
    crowd: 'Το 69% έλεγε Ρακετάκη',
    upset: 'Ανατροπή',
    called: 'Το είπες · +10',
    opponent: 'Ο αντίπαλός σου',
    level: 'level 4',
    rising: '↑ Ανεβαίνει',
    form: 'Φόρμα',
    last: 'Τελευταία ματς',
    h2h: 'Μεταξύ σας',
    plays: 'Πώς παίζει',
    traits: ['Δυνατό σερβίς', 'Μένει στη baseline', 'Δεν τα παρατάει'],
    tabs: ['Φόρμα', 'Μεταξύ σας', 'Πώς παίζει'],
    pick: 'Πάτα έναν παίκτη',
    forYou: 'Για σένα · 1/6',
    friendMatch: 'Ο φίλος σου Γιώργος Σερβίδης παίζει στις 20:00',
    quizQ: 'Ποιος θα σηκώσει το Open Γλυφάδας;',
    quizA: ['Ρακετάκης', 'Φορχάντης', 'Σερβίδης'],
    quizRight: '✓ Σωστό! +10',
    quizWrong: 'Όχι αυτή τη φορά',
    reactions: ['Τι ματς!', 'Το περίμενα'],
    tapHint: 'Πάτα για να δοκιμάσεις',
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
      'Who plays today, who won yesterday, who your opponent is. Every tournament match, result and player, on your phone.',
  },
  nav: { privacy: 'Privacy Policy', support: 'Help', other: 'Ελληνικά', otherHref: '/' },
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
      title: 'All the matches played today, at a glance.',
      line: 'Open the app and see who plays, where and when, across every tournament in your area.',
      points: [
        'Your own match first in the Feed, with details on your opponent',
        'Category, club and surface for every match',
        'Call it with one tap and see what the crowd says',
      ],
    },
    {
      id: 'results',
      eyebrow: 'WHO WON YESTERDAY',
      title: 'Know the results before the phone calls start.',
      line: 'Scores, upsets and what the crowd said, by day and tournament. All up to date on your phone.',
      points: ['Sets and the full score', 'Upsets stand out, so you never miss one', 'Called the winner right? Your points arrive with the result'],
    },
    {
      id: 'opponent',
      eyebrow: 'WHO IS YOUR OPPONENT',
      title: 'Know who you play before you step on court.',
      line: 'Your opponent’s card: their year so far, their last matches, what happened when you played each other, and how they play, as described by the people who played them.',
      points: ['Form and this year’s record', 'Last matches and your head to head', 'How they play: the traits players vote for'],
    },
  ],
  feed: {
    id: 'feed',
    eyebrow: 'MADE FOR YOU',
    title: 'A feed that knows what you care about.',
    line: 'Your things first: your match, your friends, your tournaments. Then your area. The more you call and follow players, the more it becomes yours.',
    points: [
      'Your match and your friends’ matches first',
      'The tournaments and categories that matter to you',
      '«For you» Mini Quiz: 6 questions a day about players you know',
    ],
  },
  game: {
    eyebrow: 'AND A GAME FOR EVERY DAY',
    title: 'Say who wins.',
    line: 'Before every match you call who will win. When the result comes in, you find out if you got it right and earn points.',
    steps: [
      { title: '+10 points', line: 'for every right call, +30 if it was an upset.' },
      { title: 'Streak', line: 'how many right calls you have in a row. One wrong call resets it, unless you have Insurance: then your streak stays.' },
      { title: 'Level', line: 'goes up with your points and unlocks new things in the app.' },
    ],
  },
  more: {
    title: 'Everything a player needs',
    items: [
      { title: 'Ladder', line: 'Your month against the people you know, your category and all of Attica.' },
      { title: 'Tournaments and draws', line: 'Your tournaments, the schedule and the draws, updated on their own.' },
      { title: 'Friends', line: 'Follow your friends and see their matches first.' },
      { title: 'Log your match', line: 'Played a match? Log it in ten seconds and see it in the results.' },
      { title: 'Quests and Badges', line: 'Small goals every day and every week, with gifts for your Baller.' },
      { title: 'Notifications', line: 'Find out if you got it right the moment the result comes in.' },
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
    line: 'Pro keeps you up to date on everything that concerns you, without searching.',
    price: '€8.99 a month',
    items: [
      { title: 'Live alerts for your tournaments', line: 'The moment the draw is out or the schedule changes, you know first.' },
      { title: 'Reminders for your matches', line: 'The evening before and two hours before, with time, club and opponent.' },
      { title: 'Your opponent before the match', line: 'Form, recent matches, your head to head and how they play.' },
      { title: 'Your detailed stats', line: 'Record, form and how your year is going, all on one page.' },
    ],
    note: 'Matches, results and the game stay free for everyone.',
  },
  faq: {
    title: 'Questions',
    items: [
      { q: 'Is it free?', a: 'Yes. Matches, results, players and the game are free for everyone. Pro adds alerts, reminders and the opponent card.' },
      { q: 'Where do the matches come from?', a: 'From the schedules and results tournament organisers publish, and from matches players log themselves. Everything is updated daily.' },
      { q: 'I am a player. How do I find myself?', a: 'When you sign up you type your name and say you play in tournaments. From then on you always see your matches first.' },
      { q: 'Is money involved anywhere?', a: 'No. You call matches for points, your streak and a place in the Ladder. No money changes hands anywhere.' },
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
    today: 'What’s on today?',
    yourMatch: 'YOUR MATCH',
    yourMatchLine: 'Today 19:30 · against Aris Forchantis',
    proButton: 'Your opponent before the match ›',
    matchMeta: 'Today 18:00 · Glyfada Open · M 40+',
    learn: 'You find out tonight',
    results: 'Results',
    yesterday: 'YESTERDAY · GLYFADA OPEN · SEMI FINALS',
    crowd: '69% said Raketakis',
    upset: 'Upset',
    called: 'Called it · +10',
    opponent: 'Your opponent',
    level: 'level 4',
    rising: '↑ Rising',
    form: 'Form',
    last: 'Last matches',
    h2h: 'Head to head',
    plays: 'How they play',
    traits: ['Big serve', 'Stays on the baseline', 'Never gives up'],
    tabs: ['Form', 'Head to head', 'How they play'],
    pick: 'Tap a player',
    forYou: 'For you · 1/6',
    friendMatch: 'Your friend Giorgos Servidis plays at 20:00',
    quizQ: 'Who will lift the Glyfada Open?',
    quizA: ['Raketakis', 'Forchantis', 'Servidis'],
    quizRight: '✓ Right! +10',
    quizWrong: 'Not this time',
    reactions: ['What a match!', 'Saw it coming'],
    tapHint: 'Tap to try it',
    won: 'W',
    lost: 'L',
    streak: 'streak',
    points: 'points',
  },
};

export const CONTACT = 'hello@monadlabs.gr';
export const content = (lang: Lang): Content => (lang === 'el' ? el : en);
