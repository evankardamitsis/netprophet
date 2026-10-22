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
    title: 'Κατάταξη',
    subtitle: 'Ποιος πέφτει μέσα πιο συχνά αυτόν τον μήνα.',
    scopes: { league: 'Κατηγορία', friends: 'Όσοι ξέρεις', all: 'Όλη η Αττική' },
    /** the pill on the ink card; the league one is «Χάλκινη · 20 παίκτες» */
    scopeName: { league: '{tier} · {n} παίκτες', friends: 'Όσοι ξέρεις · αυτόν τον μήνα', all: 'Όλη η Αττική · αυτόν τον μήνα' },
    tiers: { bronze: 'Χάλκινη', silver: 'Ασημένια', gold: 'Χρυσή' },
    /** the lines on the «Κατηγορία» board, and what the month close says */
    league: {
      up: '↑ Ανεβαίνουν κατηγορία',
      down: '↓ Αλλάζουν κατηγορία',
      foot: 'Οι 3 πρώτοι παίρνουν κορνίζα και badge.',
      /** full-screen moment: «ΚΑΤΑΤΑΞΗ · ΧΑΛΚΙΝΗ», «3ος», then the reward line */
      label: 'Κατάταξη · {tier}',
      award: 'Frame Κορυφαίος του μήνα και badge',
      next: 'Κατηγορία τον άλλο μήνα: {tier}',
    },
    /** the big position on the card, «4ος» */
    position: '{n}ος',
    points: 'πόντοι',
    streak: 'Σωστές στη σειρά',
    streakPill: 'σερί',
    next: 'Για την επόμενη θέση',
    toNext: { one: '1 πόντος ακόμα', many: '{n} πόντοι ακόμα' },
    top: 'Στην κορυφή',
    keep: 'Κράτα τη θέση',
    pending: {
      head: 'Έχεις +{n} στον αέρα.',
      up: 'Αν πέσεις μέσα, ανεβαίνεις θέση.',
      lead: 'Αν πέσεις μέσα, ανοίγεις τη διαφορά.',
      open: { one: '1 ματς ακόμα περιμένει την ψήφο σου.', many: '{n} ματς ακόμα περιμένουν την ψήφο σου.' },
      allVoted: 'Ψήφισες σε όλα. Τώρα περιμένουμε τα αποτελέσματα.',
    },
    chase: {
      /** {name} is the person right above you */
      head: '{name}: {n} πόντοι μπροστά σου.',
      headOne: '{name}: 1 πόντος μπροστά σου.',
      sub: { one: 'Μία σωστή και περνάς μπροστά.', many: '{n} σωστές και περνάς μπροστά.' },
      streak: 'Σερί {n}, μην το αφήσεις να κρυώσει.',
    },
    leading: { head: 'Είσαι στην κορυφή.', sub: 'Κράτα το σερί σου για να μείνεις εκεί.' },
    voteNow: 'Ψήφισε τώρα · {n} ματς',
    backToVotes: 'Πίσω στις ψήφους',
    you: 'Εσύ',
    renews: 'Ανανεώνεται την 1η του μήνα.',
    how: 'Πώς βγαίνουν οι πόντοι',
    rules: {
      correct: 'Είπες σωστά ποιος κερδίζει',
      upset: 'Είπες την ανατροπή',
      chain: 'Κάθε σωστή στη σειρά',
      /** «+5 ακόμα» */
      chainValue: '+{n} ακόμα',
    },
    error: 'Δεν φόρτωσε η Κατάταξη. Τράβα προς τα κάτω για να ξαναδοκιμάσεις.',
  },
  tabs: {
    /** the home tab (founder, 14 Oct: four tabs, one job each) */
    vote: 'Σήμερα',
    results: 'Αποτελέσματα',
    tournaments: 'Τουρνουά',
    players: 'Παίκτες',
    ladder: 'Κατάταξη',
    me: 'Εγώ',
  },
  header: {
    points: 'πόντοι',
  },
  match: {
    /** said with the category when the players alone don't say it (founder, 18 Oct: no «Διπλό»/«Μονό», it is obvious) */
    categoryWho: { WS: 'Γυναικών', WD: 'Γυναικών', XD: 'Μικτό', mixed: 'Μικτό' } as Record<string, string>,
    /** a match that started: no more votes (founder, 17 Oct) */
    closed: 'Οι ψήφοι έκλεισαν',
    /** the question, said once under Σήμερα's title while a card takes a vote (founder, 19 Oct) */
    who: 'Ποιος κερδίζει;',
    /** under an hour before it starts, next to the question */
    soon: { one: 'Ξεκινά σε 1 λεπτό', many: 'Ξεκινά σε {n} λεπτά' },
    today: 'Σήμερα',
    tomorrow: 'Αύριο',
    levelArea: 'level {level} · {area}',
    learnTonight: 'Μαθαίνεις απόψε',
    learnTomorrow: 'Μαθαίνεις αύριο',
    learnAfter: 'Μαθαίνεις μετά το ματς',
    weekdays: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
    formats: { doubles: 'Διπλό', mixed: 'Μικτό' },
    friendly: 'Φιλικό',
    /** where it is played: «PRC (Μαρούσι) · Σκληρό» (founder, 14 Oct) */
    surfaces: { clay: 'Χώμα', hard: 'Σκληρό', grass: 'Γρασίδι', carpet: 'Συνθετικό' } as Record<string, string>,
    postponed: {
      chip: 'Αναβλήθηκε',
      newDay: 'Νέα μέρα',
      was: 'ήταν {when}',
      keptVote: 'Η ψήφος σου μένει. Θα δεις τη νέα μέρα εδώ.',
      seeNewDay: 'Θα δεις τη νέα μέρα εδώ.',
    },
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
    titlePlayed: 'Έπαιξες σήμερα;',
    titleSoon: 'Έχεις ματς;',
    modes: { played: 'Παίχτηκε', soon: 'Έρχεται' },
    subPlayed: 'Καταχώρησε τον αγώνα σου για να τον δει και η παρέα.',
    subSoon: 'Δείξε στην παρέα σου ποιο ματς έρχεται.',
    when: 'Πότε',
    tournament: 'Τουρνουά',
    kind: 'Μονό, διπλό ή μικτό',
    choose: 'Διάλεξε',
    daysPlayed: { today: 'Σήμερα', other: 'Χθες' },
    daysSoon: { today: 'Σήμερα', other: 'Αύριο' },
    otherDay: 'Άλλη μέρα',
    friendly: 'Φιλικό',
    otherTournament: 'Άλλο',
    otherPlaceholder: 'Πώς λέγεται το τουρνουά;',
    otherNote: 'Θα φανεί μόλις το εγκρίνουμε.',
    kinds: { singles: 'Μονό', doubles: 'Διπλό', mixed: 'Μικτό' },
    match: 'Ματς',
    change: 'Αλλαγή',
    partner: { m: 'Ο παρτενέρ σου', f: 'Η παρτενέρ σου' },
    against: 'Απέναντι',
    with: 'Με ποιον',
    againstTwo: 'Απέναντι · διάλεξε δύο',
    againstMixed: 'Απέναντι · έναν και μία',
    oneMore: ' · ένας ακόμα',
    search: 'Ψάξε στους {n} παίκτες',
    noneFound: 'Δεν τον βρίσκουμε. Γράψε το όνομά του για να τον προσθέσουμε.',
    first: 'Όνομα',
    surname: 'Επώνυμο',
    addNew: '+ Πρόσθεσε {name}',
    /** a typed name without the shape (letters only, at least 2 each: the server's name_shape rule) */
    nameShape: 'Γράψε το πραγματικό όνομα και επώνυμο, με γράμματα.',
    won: { one: 'Κέρδισα', many: 'Κερδίσαμε' },
    lost: { one: 'Έχασα', many: 'Χάσαμε' },
    submitPlayed: 'Βάλ’ το',
    submitSoon: 'Βάλ’ το στα ματς',
    isYours: 'Αυτό είναι το ματς σου;',
    isYoursSub: 'Το έχει ήδη βάλει κάποιος. Αν είναι αυτό, βάζουμε μόνο το αποτέλεσμα.',
    isYoursYes: 'Ναι, αυτό είναι',
    isYoursNo: 'Όχι, άλλο ματς',
    done: {
      pill: 'Μπήκε',
      head: 'Στα ματς',
      headPlayed: 'Στα αποτελέσματα',
      /** «Εσύ & Νίκος Ροδίτης - Δημήτρης Γκότσης» */
      line: '{me} - {them}',
      subSoon: 'Φαίνεται τώρα στα ματς και όλοι μπορούν να το ψηφίσουν.',
      subPlayed: 'Οι ψήφοι μετράνε από τώρα. Για το level μετράει μόλις το επιβεβαιώσει ο αντίπαλος.',
      goSoon: 'Δες το στα ματς',
      goPlayed: 'Δες το στα αποτελέσματα',
      again: 'Άλλο ένα ματς',
      /** a player's match goes to staff first (founder, 18 Oct 2026: no match can be invented) */
      review: {
        pill: 'Σε έλεγχο',
        head: 'Για έλεγχο',
        subSoon: 'Το στείλαμε για έλεγχο. Μόλις εγκριθεί, μπαίνει στο feed.',
        subPlayed: 'Το στείλαμε για έλεγχο. Μόλις εγκριθεί, μπαίνει στα αποτελέσματα και μετράνε οι ψήφοι.',
        ok: 'Εντάξει',
      },
    },
    share: {
      one: 'Στείλ’ το απέναντι',
      many: 'Στείλ’ το και στους δύο απέναντι',
      peek: 'Δες τι βλέπει απέναντι ›',
      peekAfter: 'Δες τι βλέπει ο αντίπαλος ›',
      /** «Ο Βαγγέλης Κ. δήλωσε ότι παίξατε» */
      title: '{who} δήλωσε ότι παίξατε',
      body: 'Έτσι έγινε; Πάτα να το κλείσουμε.',
      apps: { whatsapp: 'WhatsApp', viber: 'Viber', sms: 'Μήνυμα', other: 'Άλλο' },
      close: 'Κλείσιμο',
      sent: { one: 'Το στείλαμε απέναντι', many: 'Το στείλαμε και στους δύο' },
      copied: 'Το link αντιγράφηκε',
    },
    errors: {
      duplicate: 'Αυτό το ματς υπάρχει ήδη.',
      nameRequired: 'Βάλε όνομα και επώνυμο, για σένα και για όποιον προσθέτεις.',
      /** the server's name_shape: a typed name, or your own profile name */
      nameShape: 'Ένα όνομα δεν μοιάζει αληθινό. Γράψε με γράμματα το δικό σου και όποιου προσθέτεις.',
      rateLimited: 'Φτάνουν για σήμερα. Τα υπόλοιπα αύριο.',
      failed: 'Δεν μπήκε. Ξαναδοκίμασε.',
    },
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
    deleteAccount: 'Διαγραφή λογαριασμού',
    deleteTitle: 'Να διαγραφεί ο λογαριασμός σου;',
    deleteLine: 'Σβήνουν οι ψήφοι, οι πόντοι, το σερί, οι φίλοι και ό,τι έχει κερδίσει ο παίκτης σου. Δεν γυρίζει πίσω.',
    deleteYes: 'Ναι, διαγραφή',
    deleteNo: 'Άκυρο',
    deleting: 'Διαγράφεται…',
    deleteFailed: 'Δεν έγινε η διαγραφή. Δοκίμασε ξανά ή γράψε στο hello@monadlabs.gr.',
    errors: {
      invalidEmail: 'Αυτό δεν μοιάζει με email.',
      badCode: 'Λάθος ή ληγμένος κωδικός. Ξαναδοκίμασε.',
      tooMany: 'Πολλές προσπάθειες. Δοκίμασε σε λίγο.',
      generic: 'Κάτι στράβωσε. Ξαναδοκίμασε.',
    },
  },
  feed: {
    title: 'Τι παίζει σήμερα;',
    /** from 23:00 the feed already shows tomorrow */
    titleTomorrow: 'Τι παίζει αύριο;',
    subtitle: 'Ψήφισε τους νικητές και μάζεψε πόντους.',
    /** the line under the title while today's matches wait for your vote (founder, 18 Oct) */
    open: { one: 'Ένα ματς περιμένει την ψήφο σου.', many: '{n} ματς περιμένουν την ψήφο σου.' },
    allVoted: 'Ψήφισες σε όλα. Τώρα περιμένουμε τα αποτελέσματα.',
    /** beside «Ποιος κερδίζει;» under the title, said once for every card (founder, 19 Oct) */
    hint: 'Πάτα τον νικητή',
    /** nothing left today, but later days wait under «Αύριο και μετά» */
    openLater: { one: 'Ένα ματς για αύριο και μετά περιμένει την ψήφο σου.', many: '{n} ματς για αύριο και μετά περιμένουν την ψήφο σου.' },
    /** «Το ματς σου» at the top of Σήμερα when you play today or tomorrow */
    myMatch: 'Το ματς σου',
    /** the fold for matches on later days: «Αύριο και μετά · 4» */
    later: 'Αύριο και μετά · {count}',
    end: 'Όσο κατεβαίνεις, βλέπεις ματς από παίκτες που ίσως δεν ξέρεις.',
    empty: 'Κανένα ματς αυτή τη μέρα ακόμα.',
    error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
    voteFailed: 'Η ψήφος δεν πέρασε. Ξαναδοκίμασε.',
    votingClosed: 'Η ψηφοφορία έκλεισε.',
    sponsoredMore: 'Δες περισσότερα ›',
    /** the folded row at the top: the game of the day and matches to confirm, opened with a tap (founder, 13 Oct) */
    daily: {
      title: 'Για σένα',
      confirmOne: 'Ένα ματς να επιβεβαιώσεις',
      confirmMany: '{count} ματς να επιβεβαιώσεις',
      /** the closed row's action: the game of the day waits */
      play: 'Παίξε',
      /** the closed row's action: only matches to confirm */
      see: 'Δες',
      open: 'Άνοιξε',
      close: 'Κλείσε',
      /** the once-a-day full screen «Για σένα»: its close button */
      later: 'Αργότερα',
    },
  },
  /**
   * The home, Τουρνουά (mockup D, founder 22 Oct): results, your people, the quiz, today's votes, Pro, today's
   * tournaments. Drafts for the founder.
   */
  home: {
    results: {
      title: 'Αποτελέσματα',
      /** the single blue action while results wait */
      take: 'Πάρε τους ›',
      /** «+30», the points the results bring (lime) */
      points: '+{n}',
    },
    yours: {
      title: 'Οι δικοί σου',
      myMatch: 'Ο αγώνας σου',
      /** «με Ρήγα · Open Γλυφάδας» */
      line: '{against} · {tournament}',
      now: 'Τώρα',
    },
    quiz: {
      title: 'Quiz της ημέρας',
      /** «6 ερωτήσεις · και οι 6 δίνουν +30»: the +30 comes with the sixth answer, right or not */
      line: '{n} ερωτήσεις · και οι 6 δίνουν +30',
      /** part way: «2 από 6 · και οι 6 δίνουν +30» */
      progress: '{n} από {total} · και οι 6 δίνουν +30',
      /** played: «6 από 6» and, lime, «+30» */
      played: '{n} από {total}',
      earned: '+30',
      doneLine: 'Οι επόμενες αύριο στις 9:00',
    },
    vote: {
      title: 'Ψήφισε σήμερα',
      /** nothing left to vote today: tomorrow's first three */
      tomorrow: 'Τα επόμενα ματς αύριο',
      more: 'Περισσότερα ›',
      less: 'Λιγότερα ↑',
      undo: 'Αναίρεση',
      /** for screen readers, on each name */
      a11yVote: 'Ψήφος: {name}',
      /** after the result: «Το είχες ✓» */
      called: 'Το είχες ✓',
      empty: 'Κανένα ματς για ψήφο ακόμα.',
    },
    pro: {
      tag: 'PRO',
      trial: '7 μέρες δωρεάν',
      /** your match is near (ProNudge before_match) */
      opponentToday: 'Ο αντίπαλός σου στις {time}',
      opponentTomorrow: 'Ο αντίπαλός σου αύριο στις {time}',
      /** the match has a day but no time yet */
      opponentTodayNoTime: 'Ο αντίπαλός σου σήμερα',
      opponentTomorrowNoTime: 'Ο αντίπαλός σου αύριο',
      opponentLine: 'Πώς έπαιξε φέτος, ποιους κέρδισε, σε ποια επιφάνεια.',
      opponentBuy: 'Δες τον με Pro ›',
      opponentOpen: 'Δες τον αντίπαλο ›',
      /** no match near: your own stats */
      statsTitle: 'Τα στατιστικά σου',
      statsLine: 'Νίκες, σετ, επιφάνειες και οι αντίπαλοι που βρίσκεις πιο συχνά.',
      statsBuy: 'Δες τα με Pro ›',
      statsOpen: 'Δες τα ›',
    },
    tournaments: {
      title: 'Τουρνουά σήμερα',
      playing: 'Παίζεις',
      following: 'Ακολουθείς',
      near: 'Κοντά σου',
      /** the live line: «Παππάς με Λιάκο» after the «Τώρα» tag */
      first: 'Πρώτο ματς {time}',
      next: 'Επόμενο ματς {time}',
      all: 'Όλα τα τουρνουά ›',
      search: 'Ψάξε παίκτη ›',
      none: 'Κανένα τουρνουά σήμερα.',
    },
  },
  result: {
    wrong: 'Όχι αυτή τη φορά',
    /** «κέρδισε τον Νίκο Ροδίτη»: {loser} carries the article, see withArticleAccusative */
    beat: 'κέρδισε {loser}',
    /** doubles (new, not in the prototype) */
    beatPair: 'κέρδισαν τους {losers}',
    points: '+{points} · σερί {streak}',
    kept: 'κράτησες το σερί',
    /** the one line a played result folds into when you did not call it: «Δρουλιάς κέρδισε» */
    won: '{winner} κέρδισε',
    wonPair: '{winner} κέρδισαν',
    next: 'Επόμενο ›',
    done: 'Εντάξει',
    /** results one by one (founder, 20 Oct); with 2 or more behind a card, «Πάρε τους πόντους» takes them all at once */
    summary: {
      more: 'Και {n} ακόμα',
      /** the row under the card (founder, 21 Oct): «Και 13 ακόμα: 11 ✓ · 2 χαμένα» and one action */
      right: '{n} ✓',
      wrongOne: '1 χαμένο',
      wrongMany: '{n} χαμένα',
      take: 'Πάρε τους πόντους',
      /** the toast once they are taken: «+155 πόντοι · σερί 7»; with no point in them, «Τα είδες όλα · σερί 0» */
      taken: '+{points} πόντοι · σερί {streak}',
      takenNone: 'Τα είδες όλα · σερί {streak}',
    },
  },
  results: {
    title: 'Αποτελέσματα',
    subtitle: 'Τι έγινε στα γήπεδα.',
    /** the filter on top (founder, 17 Oct): every result, or one tournament's; and a name */
    all: 'Όλα',
    search: 'Ψάξε παίκτη',
    /** the quiet toggle beside the search (founder, 20 Oct): the chips stay hidden until it is tapped; shows the picked tournament's name */
    tournaments: 'Τουρνουά',
    noneFound: 'Τίποτα εδώ. Δοκίμασε άλλο όνομα ή «Όλα».',
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
    /** your own result that staff have not checked yet */
    inReview: 'Σε έλεγχο',
    calledIt: 'Το ’πες · +{points}',
    /** «Το 69% έλεγε Πράτσας»: the side most people picked */
    line: 'Το {pct}% έλεγε {name}',
    retired: 'απ.',
    walkover: 'w/o',
    empty: 'Δεν έχει αποτελέσματα ακόμα. Μόλις τελειώσει ένα ματς, θα το δεις εδώ.',
    error: 'Δεν φόρτωσαν. Τράβα προς τα κάτω για ξανά.',
  },
  players: {
    title: 'Παίκτες',
    subtitle: 'Δες πώς παίζει κάποιος πριν τον βρεις απέναντι.',
    /** {n} is the roster size, «1.632» */
    search: 'Ψάξε στους {n} παίκτες',
    listLabel: 'Οι φίλοι σου και όσοι παίζουν σήμερα',
    countOne: '1 παίκτης',
    countMany: '{n} παίκτες',
    noneFound: 'Κανείς με αυτό το όνομα.',
    empty: 'Ακολούθησε όσους ξέρεις και θα τους βλέπεις εδώ.',
    friend: { m: 'φίλος', f: 'φίλη' },
    follow: '+ Ακολούθησε',
    following: '✓ Στους φίλους σου',
    followed: 'Μπήκε στους φίλους σου',
    unfollowed: 'Βγήκε από τους φίλους σου',
    thisYear: 'Φέτος',
    last5: 'Τελευταία 5',
    /** «14 νίκες · 6 ήττες» */
    record: '{w} {wins} · {l} {losses}',
    wins: { one: 'νίκη', many: 'νίκες' },
    losses: { one: 'ήττα', many: 'ήττες' },
    direction: { up: '↑ Ανεβαίνει', same: { m: '= Σταθερός', f: '= Σταθερή' }, down: '↓ Πέφτει' },
    next: 'Επόμενο ματς',
    /** «Σήμερα 18:00 με Δημήτρη Γκότση» */
    nextWith: '{when} με {name}',
    nextAgainst: '{when} · απέναντι {names}',
    lastMatches: 'Τελευταία ματς',
    won: 'Νίκη {score}',
    lost: 'Ήττα {score}',
    against: '· {name}',
    againstPair: '· παρτενέρ {partner}, απέναντι {names}',
    noMatches: 'Κανένα ματς ακόμα',
    error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
    notFound: 'Αυτός ο παίκτης δεν φαίνεται πια.',
    followFailed: 'Δεν έγινε. Ξαναδοκίμασε.',
    /** an unclaimed player's profile, for an account with no player and no open request: the usual claim, staff approve */
    claimMe: { m: 'Αυτός είμαι εγώ', f: 'Αυτή είμαι εγώ' },
  },
  onboarding: {
    /** sign-up is for 15 and over */
    age: { check: 'Είμαι 15 χρονών και πάνω' },
    back: '‹ Πίσω',
    next: 'Συνέχεια',
    name: {
      title: 'Πώς σε λένε;',
      subtitle: 'Με το όνομά σου σε βρίσκουν οι αντίπαλοι.',
      first: 'Όνομα',
      surname: 'Επώνυμο',
      sport: 'Τι παίζεις;',
      sports: { tennis: 'Τένις', padel: 'Padel', both: 'Και τα δύο' },
      /** «Συνέχεια» before the step is ready: the first thing still missing, next to the button */
      missing: {
        name: 'Γράψε όνομα και επώνυμο',
        sport: 'Διάλεξε τι παίζεις',
        age: 'Τίκαρε ότι είσαι 15 και πάνω',
        /** letters only, at least 2 each (the server's name_shape rule) */
        nameShape: 'Γράψε το πραγματικό σου όνομα και επώνυμο, με γράμματα.',
      },
    },
    claim: {
      title: 'Είσαι ήδη εδώ;',
      search: 'Γράψε το όνομά σου',
      /** {n} is the roster size, «1.632» */
      subtitle: 'Έχουμε {n} παίκτες από όλη την Αττική. Μήπως είσαι εσύ παρακάτω;',
      none: 'Δεν βρήκαμε κανέναν με αυτό το όνομα.',
      me: 'Εγώ είμαι',
      newPlayer: 'Δεν με βρίσκω, είμαι καινούριος',
      /** someone else got this player a moment ago: the row turns into a claimed one, with «Είμαι εγώ» */
      taken: 'Αυτό το προφίλ μόλις συνδέθηκε με άλλο λογαριασμό. Αν είσαι εσύ, πάτα «Είμαι εγώ».',
      otherClaimed: 'Ο λογαριασμός σου έχει ήδη έναν παίκτη.',
      /** a roster player is asked for, staff approve (founder, 18 Oct 2026) */
      requested: 'Το αίτημά σου στάλθηκε. Μέχρι να το εγκρίνουμε παίζεις κανονικά, θα σου πούμε μόλις γίνει.',
      /** after «είμαι καινούριος»: staff make the player (founder, 20 Oct 2026) */
      newRequested: 'Θα φτιάξουμε το προφίλ σου και θα σου πούμε μόλις είναι έτοιμο. Μέχρι τότε παίζεις κανονικά.',
      failed: 'Δεν έγινε. Ξαναδοκίμασε.',
      /** 5 requests a day (security_pass_2) */
      limited: 'Για σήμερα φτάνει. Ξαναδοκίμασε αύριο.',
      /** a roster player another account already holds: listed, but not for a normal claim (founder, 20 Oct 2026) */
      claimedSub: 'Έχει ήδη συνδεθεί με άλλο λογαριασμό',
      claimedNote: 'Αυτό το προφίλ το έχει ήδη άλλος λογαριασμός. Αν είσαι εσύ, πες μας και θα το ελέγξουμε.',
      claimedMe: 'Είμαι εγώ',
      claimedSent: 'Θα το ελέγξουμε και θα σου πούμε. Μέχρι τότε παίζεις κανονικά.',
      /** how the account holding it signs in (the provider only, never the address), so the owner can use that one */
      claimedVia: {
        google: 'Εκείνος ο λογαριασμός μπαίνει με Google. Αν είναι δικός σου, βγες και μπες με Google.',
        apple: 'Εκείνος ο λογαριασμός μπαίνει με Apple. Αν είναι δικός σου, βγες και μπες με Apple.',
        email: 'Εκείνος ο λογαριασμός μπαίνει με κωδικό σε άλλο email. Αν είναι δικός σου, βγες και μπες με εκείνο.',
      },
      claimedSwitch: 'Βγες και μπες αλλιώς',
    },
    play: {
      title: 'Πώς παίζεις;',
      subtitle: 'Δύο πράγματα για να σε γνωρίσουμε.',
      hand: 'Με ποιο χέρι',
      hands: { R: 'Δεξιόχειρας', L: 'Αριστερόχειρας' },
      tour: 'Από τουρνουά πώς πάμε;',
      tours: [
        { id: 'never', name: 'Ποτέ, μόνο φιλικά', sub: 'Και καλά περνάω' },
        { id: 'few', name: 'Ένα δυο, για την εμπειρία', sub: 'Έμαθα τι σημαίνει άγχος' },
        { id: 'monthly', name: 'Κάθε μήνα είμαι σε ένα', sub: 'Με ξέρουν οι διοργανωτές' },
        { id: 'trophies', name: 'Έχω κούπες στο σπίτι', sub: 'Και τις ξεσκονίζω' },
      ],
      /** Εγώ › Ρυθμίσεις: the row that keeps hand and tournaments since they left the first run (founder, 19 Oct) */
      row: 'Πώς παίζεις',
      unset: 'Πες μας με ποιο χέρι παίζεις και πόσα τουρνουά έχεις',
    },
    area: {
      title: 'Πού παίζεις;',
      subtitle: 'Διάλεξε πού παίζεις συνήθως, για να βλέπεις πρώτα τα ματς της περιοχής σου.',
      regions: { north: 'Βόρεια', center: 'Κέντρο', south: 'Νότια' },
      where: { north: 'Πού στα Βόρεια;', center: 'Πού στο Κέντρο;', south: 'Πού στα Νότια;' },
      help: 'Διάλεξε όσες θες. Αν δεν διαλέξεις καμία, σου δείχνουμε όλη την περιοχή.',
    },
    known: {
      title: 'Ποια είναι η παρέα σου;',
      subtitle: 'Διάλεξε όσους ξέρεις. Θα τους βλέπεις πρώτους στα Αποτελέσματα και στα Τουρνουά.',
      note: 'Διάλεξε τουλάχιστον τρεις. Μπορείς να προσθέσεις κι άλλους αργότερα.',
      noteSuggested: 'Δεν πειράζει. Σου βάλαμε τους τρεις πιο γνωστούς της περιοχής. Άλλαξέ τους όπως θες.',
      search: 'Ψάξε όνομα',
      searchSuggested: 'Δημοφιλείς στην περιοχή σου · ψάξε όνομα',
      followers: '{n} ακόλουθοι',
      need: 'Διάλεξε {n} ακόμα',
      go: 'Συνέχεια · {n} {friends}',
      friends: { one: 'φίλος', many: 'φίλοι' },
      none: 'Δεν ξέρω κανέναν ακόμα',
      noneFound: 'Κανείς με αυτό το όνομα.',
      /** nobody picked: the step is optional (founder, 19 Oct) */
      later: 'Αργότερα',
      /**
       * the usual path, one line (founder, 20 Oct): picking nobody follows the 6 most followed players of their area
       * (19 Oct), so say it up front. The link path keeps `subtitle` and its own note.
       */
      subtitleAuto: 'Διάλεξε όσους ξέρεις, θα τους βλέπεις πρώτους. Αν δεν διαλέξεις, σου βάζουμε τους 6 πιο δημοφιλείς της περιοχής σου.',
    },
    intro: {
      /** the step pill, «1 από 4» */
      of: '{n} από {total}',
      ready: 'Πάμε',
      vote: {
        title: 'Ψήφισε τους νικητές.',
        sub: 'Δες αγώνες από την παρέα σου και ψήφισε ποιος θα κερδίσει. Θέλουμε γεμάτη κερκίδα, ε;',
        when: 'Σήμερα 18:00 · Open Γλυφάδας',
        a: { first: 'Νίκος', surname: 'Ροδίτης' },
        b: { first: 'Δημήτρης', surname: 'Γκότσης' },
        foot: 'Πάτα όποιον πιστεύεις. Βλέπεις αμέσως τι ψήφισαν οι άλλοι.',
      },
      know: {
        title: 'Μάθε ποιον έχεις απέναντι.',
        sub: 'Δες περισσότερα για τον αντίπαλό σου πριν περάσει στην άλλη μεριά του φιλέ.',
        who: 'Νίκος Ροδίτης · level 5 · πώς παίζει',
        traits: [
          { name: 'Δυνατό σερβίς', n: 23 },
          { name: 'Δεν χάνει tie-break', n: 17 },
          { name: 'Αργεί να ζεσταθεί', n: 12 },
        ],
        foot: 'Τα γράφουν όσοι έχουν παίξει απέναντί του.',
      },
      points: {
        title: 'Μάζεψε πόντους, κράτα το σερί σου.',
        sub: 'Κάθε σωστή ψήφος δίνει πόντους. Όσο μεγαλώνει το σερί σου, τόσο ανεβαίνεις στην Κατάταξη.',
        correct: 'Σωστή ψήφος',
        upset: 'Είπες την ανατροπή',
        streak: 'Σερί: σωστές ψήφοι στη σειρά',
        rows: [
          { name: '1 · Μαρία Καρρά', n: 610 },
          { name: '2 · Εσύ', n: 580 },
        ],
        foot: 'Κάθε μήνα νέα Κατάταξη με την παρέα σου.',
      },
      matches: {
        title: 'Πέρνα εύκολα τους αγώνες σου.',
        sub: 'Όσους περισσότερους αγώνες βάζεις, τόσο γεμίζει το προφίλ σου και μαζεύεις ψήφους.',
        when: 'Χθες · Φιλικό · Μονό',
        line: 'Κέρδισες τον Γιώργο Δεσύπρη',
        score: '2-1',
        help: 'Πότε, με ποιον, ποιος κέρδισε. Μισό λεπτό.',
        level: 'Ανεβαίνεις level όσο το λες σωστά.',
        levelHelp: 'Κάθε σωστή ψήφος, κάθε σερί και οι ερωτήσεις της ημέρας σε ανεβάζουν.',
      },
      /** the splash after the slides: «Ας» in paper, «ξεκινήσουμε» in lime */
      go: { a: 'Ας', b: 'ξεκινήσουμε' },
    },
    failed: 'Δεν αποθηκεύτηκε. Ξαναδοκίμασε.',
  },
  me: {
    /** development builds only: run onboarding again */
    replayOnboarding: 'Δες ξανά το onboarding',
    /** development builds with the dev guest: walk the onboarding with sample data, nothing is saved */
    previewOnboarding: 'Δοκιμή onboarding',
    /** dev builds only: the guest plays as a brand new player */
    newPlayer: 'Νέος παίκτης',
    newPlayerOn: 'Νέος παίκτης ✓',
    /** the row on Εγώ that opens your match statistics (/match-stats) */
    statsPage: 'Τα στατιστικά σου',
    /** the row on Εγώ and the title of the page it opens: σερί, votes, score and badges */
    predictionsPage: 'Οι προβλέψεις σου',
    /** the one row on Εγώ (and the title of /me?page=stats) that holds the stats, the predictions and the season (19 Oct) */
    numbers: 'Τα νούμερά σου',
    numbersLine: 'Σερί, ψήφοι, ματς και η σεζόν σου',
    /** under «Τα στατιστικά σου» on «Τα νούμερά σου» */
    statsLine: 'Τα ματς σου, σε νούμερα',
    /** dev builds only: the drawn avatars for review */
    avatarsDev: 'Τα avatar (δοκιμή)',
    direction: { up: 'Ανεβαίνεις', same: 'Μένεις εκεί', down: 'Πέφτεις' },
    /** your game level from points (Εγώ, under the hero) */
    gameLevel: {
      title: 'Level {n}',
      toNext: 'Ακόμα {n} πόντοι για το level {next}',
      toNextOne: 'Ακόμα 1 πόντος για το level {next}',
    },
    streak: 'σερί',
    /** «ρεκόρ 9», your best σερί */
    best: 'ρεκόρ {n}',
    monthPoints: 'πόντοι μήνα',
    hands: { R: 'δεξί χέρι', L: 'αριστερό χέρι' },
    sports: { tennis: 'τένις', padel: 'padel' },
    noLevel: 'Δεν έχεις level ακόμα',
    noLevelSub: 'Βγαίνει μόλις μαζέψεις 3 ματς ή 10 ψήφους.',
    progressMatches: 'Ματς · {n} από 3',
    progressVotes: 'Ψήφοι · {n} από 10',
    addFirst: 'Βάλε το πρώτο σου ματς',
    addMatch: 'Βάλε ματς',
    freeze: { ready: 'Ασφάλεια σερί {i} από {max}, έτοιμη', empty: 'Ασφάλεια σερί {i} από {max}, άδεια' },
    /** «Δωρεάν Ασφάλεια σε 4 ψήφους» */
    nextFreeze: { one: 'Δωρεάν Ασφάλεια στην επόμενη ψήφο', many: 'Δωρεάν Ασφάλεια σε {n} ψήφους' },
    freezesFull: 'Έχεις όσες Ασφάλειες χωράνε',
    score: 'Το σκορ σου',
    stats: {
      correct: 'Σωστές ψήφοι',
      points: 'Πόντοι αυτόν τον μήνα',
    },
    votes: {
      title: 'Οι ψήφοι σου',
      waiting: { one: '1 ψήφος περιμένει αποτέλεσμα', many: '{n} ψήφοι περιμένουν αποτέλεσμα' },
      none: 'Δεν έχεις ψηφίσει ακόμα',
      sofar: { one: '1 ψήφος μέχρι τώρα', many: '{n} ψήφοι μέχρι τώρα' },
      ifAll: 'Αν πέσεις μέσα παντού: +{n} πόντοι',
      open: { one: '1 ματς περιμένει την ψήφο σου. Πάμε;', many: '{n} ματς περιμένουν την ψήφο σου. Πάμε;' },
      noneOpen: 'Δεν υπάρχει ανοιχτό ματς αυτή τη στιγμή.',
    },
    matches: {
      title: 'Τα ματς σου',
      /** a line of «Τα ματς σου»: the partner in doubles (a label, so the name stays in the nominative) */
      with: 'Παρτενέρ: {name}',
      /** the other side, in full */
      vs: 'Απέναντι: {names}',
      win: 'Ν',
      loss: 'Η',
      next: 'Επόμενο ματς',
      nextEmpty: 'Εδώ θα δεις το επόμενο ματς σου.',
      add: '+ Βάλε ματς',
    },
    friends: {
      title: 'Οι φίλοι σου',
      empty: 'Εδώ θα δεις τους φίλους σου. Βρες κάποιους ›',
      all: 'Δες όλους τους παίκτες ›',
    },
    settings: 'Ρυθμίσεις',
    /** Ρυθμίσεις: an email to us, so every «γράψε μας» (claims, new players) has somewhere to go */
    contact: 'Γράψε μας',
    /** Baller's sounds (founder, 17 Oct) */
    sounds: 'Ήχοι',
    soundsLine: 'Μικροί ήχοι από τον Baller σου. Σωπαίνουν όταν το κινητό είναι στο αθόρυβο.',
    /** the push when someone reacts to your match (founder, 20 Oct); saved on the account, on unless switched off */
    reactionsPush: 'Αντιδράσεις στα ματς σου',
    reactionsPushLine: 'Σου λέμε όταν κάποιος αντιδρά σε ματς σου. Το πολύ μία ειδοποίηση ανά ματς κάθε 3 ώρες.',
    /** for everyone (21 Oct): the tournaments you follow */
    followedPush: 'Τουρνουά που ακολουθείς',
    followedPushLine: 'Η κλήρωση, το αυριανό πρόγραμμα και ο τελικός. Ποτέ από τις 23:00 ως τις 08:00.',
    /** Pro pushes (21 Oct), saved on the account, on unless switched off; never 23:00 to 08:00 */
    tournamentsPush: 'Τα τουρνουά σου',
    tournamentsPushLine: 'Η κλήρωση μόλις βγει, η μέρα και η ώρα σου, κάθε αλλαγή και οι δηλώσεις που κλείνουν. Ποτέ από τις 23:00 ως τις 08:00.',
    remindersPush: 'Πριν το ματς σου',
    remindersPushLine: 'Το βράδυ πριν και δύο ώρες πριν, με τον αντίπαλο. Ποτέ από τις 23:00 ως τις 08:00.',
    error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
  },
  pro: {
    title: 'Pro',
    /** {price} is «8,99€» */
    price: '{price} τον μήνα',
    /** notifications first (founder, 14 Oct: "include notifications about your tournaments, your draws, your matches") */
    features: ['Τα τουρνουά σου, με ειδοποίηση', 'Η κλήρωση, μόλις βγει', 'Τα ματς σου: μέρα, ώρα, αλλαγές', 'Ο αντίπαλος πριν το ματς', 'Τα στατιστικά σου'],
    join: 'Γίνε μέλος',
    notNow: 'Όχι τώρα',
    close: 'Κλείσιμο',
    listed: '✓ Είσαι στη λίστα',
    listedNote: 'Σου λέμε μόλις ανοίξει.',
    active: 'Ενεργό',
    /** {date} is «12 Νοε» */
    activeUntil: 'Ενεργό μέχρι {date}',
    /** the tag over the header's avatar and next to your name on Εγώ (founder, 20 Oct: "if I'm on Pro I need to see it") */
    badge: 'PRO',
    /** Εγώ, with Pro: the calm status row in place of the offer */
    youAre: 'Είσαι Pro',
    /** «Συνδρομή · μέχρι 12/11» */
    until: 'μέχρι {date}',
    sources: {
      subscription: 'Συνδρομή',
      trial: 'Δωρεάν εβδομάδα',
      promo: 'Δώρο από την ομάδα',
      gift: 'Δώρο',
      migration: 'Από την πρώτη έκδοση',
    },
    failed: 'Δεν έγινε. Ξαναδοκίμασε.',
    /** the row in Εγώ › Ρυθμίσεις */
    settingsLine: 'Ειδοποιήσεις για τουρνουά, κληρώσεις και τα ματς σου',
    /** the Pro screen (founder, 17 Oct: one promise, three outcomes, the plans and a free week); drafts for review */
    promise: 'Ο βοηθός της σεζόν σου',
    outcomes: [
      { title: 'Ξέρεις πρώτος πότε και με ποιον παίζεις.', sub: 'Κλήρωση, ώρα και αλλαγές, με ειδοποίηση.' },
      { title: 'Πας στο ματς ξέροντας τον αντίπαλο.', sub: 'Φόρμα, μεταξύ σας, τρίτα σετ και tie-break.' },
      { title: 'Βλέπεις πού κερδίζεις και πού χάνεις.', sub: 'Τα στατιστικά σου και η σεζόν σου, μήνα με μήνα.' },
    ],
    also: 'Και 12 ερωτήσεις της ημέρας, το επόμενο τουρνουά για σένα και μια κάρτα για κάθε νίκη.',
    plans: {
      pro_founding: 'Ιδρυτικό μέλος',
      pro_yearly: 'Ετήσιο',
      pro_monthly: 'Μηνιαίο',
      /** «49,99€ ο πρώτος χρόνος · μέχρι 31/12» */
      foundingNote: 'ο πρώτος χρόνος · μέχρι 31/12',
      yearlyNote: 'τον χρόνο',
      monthlyNote: 'τον μήνα, ακυρώνεις όποτε θες',
      /** «4,17€ τον μήνα» */
      perMonth: '{price} τον μήνα',
      best: 'Καλύτερη τιμή',
    },
    /** the blue button while the free week is yours (founder, 18 Oct: the store's trial, with a card) */
    trial: 'Ξεκίνα τη δωρεάν εβδομάδα',
    /** «Σήμερα 0€. Από 25/10, 8,99€ τον μήνα. Ακύρωσε πριν και δεν χρεώνεσαι.» */
    trialNote: 'Σήμερα 0€. Από {date}, {then}. Ακύρωσε πριν και δεν χρεώνεσαι.',
    /** what the plan costs after the week */
    trialThen: { pro_monthly: '{price} τον μήνα', pro_yearly: '{price} τον χρόνο', pro_founding: '{price} τον πρώτο χρόνο' },
    /** «Η δωρεάν εβδομάδα σου τρέχει μέχρι 24/10.» */
    trialOn: 'Η δωρεάν εβδομάδα σου τρέχει μέχρι {date}. Μετά συνεχίζει, εκτός αν την ακυρώσεις.',
    /** «Συνέχεια · 49,99€» */
    buy: 'Συνέχεια · {price}',
    unavailable: 'Οι πληρωμές ανοίγουν σύντομα. Σε κρατάμε στη λίστα με την τιμή του ιδρυτικού μέλους.',
    finishing: 'Ολοκληρώνεται…',
    welcome: 'Καλώς ήρθες στο Pro',
    /** a quiet line at the moments Pro helps (one a day at most) */
    nudge: {
      draw: 'Μάθε την κλήρωση μόλις βγει. Μια εβδομάδα Pro δωρεάν ›',
      before_match: 'Δες τον αντίπαλο πριν το ματς. Μια εβδομάδα Pro δωρεάν ›',
      after_loss: 'Δες πού χάθηκε το ματς. Μια εβδομάδα Pro δωρεάν ›',
      quiz: 'Θέλεις άλλες έξι; Μια εβδομάδα Pro δωρεάν ›',
      me: 'Μια εβδομάδα Pro δωρεάν ›',
    },
  },
  /** Pro «Η σεζόν σου» (17 Oct 2026, drafts for the founder): the month recap and a card for every win */
  season: {
    title: 'Η σεζόν σου',
    sub: 'Ό,τι έπαιξες κι ό,τι μάντεψες, σε έναν μήνα.',
    /** nominative; the accusative («τον Σεπτέμβριο») comes from accusativeWord */
    months: ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'],
    stats: {
      played: 'ματς',
      won: 'νίκες',
      lost: 'ήττες',
      points: 'πόντοι',
      sets: 'σετ',
      winRun: 'νίκες στη σειρά',
      deciding: 'στο τρίτο σετ',
      tiebreaks: 'στα tie-break',
      tournaments: 'τουρνουά',
      bestStreak: 'καλύτερο σερί',
      ladder: 'Ladder',
    },
    /** {month} is «τον Σεπτέμβριο» */
    vsLast: '↑ ↓ σε σχέση με {month}',
    /** names in a sentence take the article and the accusative («στον Νίκο Ψηλό») */
    grammar: true as boolean,
    and: ' και ',
    bestWin: 'Η καλύτερη νίκη',
    /** «νίκη απέναντι στον Νίκο Ψηλό»: {who} is «τον Νίκο Ψηλό», «τους Νίκο και Γιώργο» */
    against: 'Νίκη απέναντι σ{who}',
    /** «Ladder · Ασημένια» and «2ος από 20» */
    ladder: 'Ladder · {tier}',
    ladderValue: '{n}ος από {size}',
    locked: {
      title: 'Όλη η σεζόν σου, με Pro',
      line: 'Σετ, η καλύτερη νίκη, νίκες στη σειρά, tie-break, σερί, Ladder και η σύγκριση με τον προηγούμενο μήνα.',
      cta: 'Δες το Pro ›',
    },
    noPlayer: 'Βρες τον εαυτό σου στους παίκτες και θα μετράμε και τα ματς σου.',
    empty: 'Δεν έπαιξες ματς αυτόν τον μήνα ακόμα. Οι πόντοι σου μετράνε κανονικά.',
    /** the free card of the month, offered on the screen */
    freeCard: 'Η πρώτη σου νίκη του μήνα: μοιράσου την ›',
    share: 'Μοιράσου τη σεζόν',
    making: 'Ετοιμάζεται…',
    failed: 'Δεν έφυγε. Ξαναδοκίμασε.',
    /** on the picture: «Η σεζόν μου · Οκτώβριος» */
    cardTitle: 'Η σεζόν μου',
    /** {month} is «τον Οκτώβριο» */
    message: 'Η σεζόν μου στο NetProphet: {won} νίκες σε {played} ματς {month}. {url}',
    messageNoMatches: 'Η σεζόν μου στο NetProphet: {points} πόντοι {month}. {url}',
    /** the link on the month-end moment */
    monthEnd: 'Η σεζόν σου ›',
    error: 'Δεν φόρτωσε. Ξαναδοκίμασε.',
  },
  winCard: {
    /** on your own win in Αποτελέσματα */
    open: 'Μοιράσου τη νίκη ›',
    title: 'Μοιράσου τη νίκη',
    sub: 'Στείλ’ την στην παρέα ή βάλ’ την στο story σου.',
    label: 'Νίκη',
    /** {who} is «τον Νίκο Ψηλό» */
    against: 'απέναντι σ{who}',
    free: 'Η πρώτη νίκη κάθε μήνα μοιράζεται δωρεάν.',
    send: 'Στείλ’ την',
    making: 'Ετοιμάζεται…',
    failed: 'Δεν έφυγε. Ξαναδοκίμασε.',
    /** {score} is «7-6(4), 6-2» */
    message: 'Νίκη {score} απέναντι σ{who}. Παίξε κι εσύ: {url}',
    locked: {
      title: 'Κάρτα για κάθε νίκη, με Pro',
      line: 'Η πρώτη νίκη κάθε μήνα είναι δική σου, δωρεάν. Για όλες τις άλλες, Pro.',
      cta: 'Δες το Pro ›',
    },
    notYours: 'Αυτή η νίκη δεν είναι δική σου.',
    notShareable: 'Αυτό το ματς δεν μπαίνει σε κάρτα.',
    error: 'Δεν φόρτωσε. Ξαναδοκίμασε.',
  },
  scout: {
    title: 'Ο αντίπαλος πριν το ματς',
    /** the entry on Εγώ's next match */
    open: 'Ο αντίπαλος πριν το ματς ›',
    hands: { R: 'δεξί χέρι', L: 'αριστερό χέρι' },
    year: 'Φέτος {w}-{l}',
    h2h: 'Μεταξύ σας',
    h2hNone: 'Πρώτη φορά απέναντι.',
    lastWon: 'Την τελευταία φορά κέρδισες {score}.',
    lastLost: 'Την τελευταία φορά έχασες {score}.',
    deciding: 'Όταν πάει στο τρίτο σετ',
    tiebreaks: 'Στα tie-break',
    known: 'Απέναντι σε όσους ξέρεις',
    common: 'Κοινοί αντίπαλοι',
    you: 'Εσύ',
    none: 'Τίποτα ακόμα',
    noCommon: 'Δεν έχετε παίξει με τους ίδιους ακόμα.',
    fair: 'Το βλέπεις μόνο για το δικό σου ματς, ώστε οι ψήφοι να μένουν δίκαιες.',
    notYours: 'Αυτό δεν είναι δικό σου ματς.',
    over: 'Αυτό το ματς έχει παιχτεί.',
    error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
  },
  /** «Τα στατιστικά σου»: your real matches in numbers, never votes (founder, 18 Oct 2026) */
  matchStats: {
    title: 'Τα στατιστικά σου',
    sub: 'Τα ματς που έπαιξες, σε νούμερα. Οι ψήφοι σου είναι αλλού.',
    periods: { all: 'Όλα', year: 'Φέτος', last12: '12 μήνες' },
    /** the quiet period control: «Όλα ↓» */
    periodFold: '{label} {arrow}',
    formats: { singles: 'Μονά', doubles: 'Διπλά' },
    /** the format toggle with its matches: «Διπλά · 2» */
    formatCount: '{label} · {n}',
    hero: {
      played: { one: '1 ματς', many: '{n} ματς' },
      pct: 'νίκες',
      form: 'Φόρμα',
      runNow: 'Νίκες στη σειρά, τώρα',
      runBest: 'Οι περισσότερες στη σειρά',
    },
    sections: {
      sets: 'Σετ και γκέιμ',
      pressure: 'Στιγμές πίεσης',
      surface: 'Επιφάνεια',
      category: 'Κατηγορία',
      rounds: 'Γύρος',
      kinds: 'Τουρνουά και φιλικά',
      months: 'Η χρονιά σου',
      partners: 'Παρτενέρ',
      opponents: 'Αντίπαλοι',
      bestWins: 'Οι καλύτερες νίκες σου',
      tournaments: 'Τα τουρνουά σου',
    },
    /** one quiet line under a section title */
    notes: {
      rounds: 'Πόσο μακριά φτάνεις: νίκες και ήττες σε κάθε γύρο.',
      months: 'Οι μήνες που έπαιξες. Πάνω οι νίκες, κάτω οι ήττες.',
      opponents: 'Αυτούς βρίσκεις πιο συχνά απέναντι.',
      partners: 'Με ποιον παίζεις και πώς πάτε μαζί.',
      bestWins: 'Απέναντι στους πιο δυνατούς αντιπάλους σου.',
    },
    rows: {
      sets: 'Σετ',
      games: 'Γκέιμ',
      /** under the games: they come only from scores with games */
      gamesFrom: { one: 'Από 1 ματς με σκορ σε γκέιμ', many: 'Από {n} ματς με σκορ σε γκέιμ' },
      deciding: 'Καθοριστικό σετ',
      decidingNote: 'Ματς που πήγαν στο {n}ο σετ',
      tiebreaks: 'Tie-break',
      tiebreaksNote: 'Σετ που κρίθηκαν στο tie-break',
      superTiebreaks: 'Super tie-break',
      superTiebreaksNote: 'Στη θέση του τελευταίου σετ',
      comebacks: 'Ανατροπές',
      comebacksNote: 'Νίκες αφού έχασες το πρώτο σετ',
      holding: 'Κράτησες το προβάδισμα',
      holdingNote: 'Νίκες αφού πήρες το πρώτο σετ',
      straightWon: 'Καθαρές νίκες',
      straightWonNote: 'Χωρίς να χάσεις σετ',
      straightLost: 'Καθαρές ήττες',
      straightLostNote: 'Χωρίς να πάρεις σετ',
      retired: 'Εγκαταλείψεις',
      retiredNote: 'Νίκες: σταμάτησε ο αντίπαλος. Ήττες: σταμάτησες εσύ.',
      walkovers: 'Χωρίς να παιχτεί (w.o.)',
      walkoversNote: 'Νίκες και ήττες χωρίς παιχνίδι',
      tournament: 'Σε τουρνουά',
      friendly: 'Σε φιλικά',
      /** a person's line: «3 ματς μαζί», «4 ματς» */
      together: { one: '1 ματς μαζί', many: '{n} ματς μαζί' },
      met: { one: '1 ματς', many: '{n} ματς' },
      /** under a best win: the partner in doubles */
      partner: 'Παρτενέρ: {names}',
    },
    /** how far you went in a tournament: your last match there */
    tour: {
      champion: 'Το πήρες!',
      won: 'νίκη',
      lost: 'ήττα',
      count: { one: '1 τουρνουά', many: '{n} τουρνουά' },
      /** the list holds the twelve most recent */
      more: { one: 'Και 1 ακόμα', many: 'Και {n} ακόμα' },
    },
    pct: '{n}%',
    /** «Οκτ 2026» */
    monthsShort: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'],
    and: ' και ',
    empty: 'Δεν έχεις ματς εδώ ακόμα.',
    noPlayer: 'Βρες τον εαυτό σου στους παίκτες και θα μετράμε τα ματς σου.',
    locked: {
      title: 'Όλο το παιχνίδι σου, σαν επαγγελματίας',
      line: 'Σετ, γκέιμ, tie-break, ανατροπές, επιφάνειες, γύροι, αντίπαλοι, παρτενέρ και τα τουρνουά σου.',
      cta: 'Δες το Pro',
    },
    error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
  },
  winLoss: {
    title: 'Πού κερδίζεις, πού χάνεις',
    rows: {
      morning: 'Πρωινά ματς',
      evening: 'Βραδινά ματς',
      deciding: 'Στο τρίτο σετ',
      lost_first: 'Όταν χάνεις το πρώτο σετ',
      tiebreaks: 'Στα tie-break',
      lefties: 'Με αριστερόχειρες',
      singles: 'Στα μονά',
      doubles: 'Στα διπλά',
      tournament: 'Σε τουρνουά',
      friendly: 'Σε φιλικά',
    },
    /** the free teaser under the blurred rows */
    unlock: 'Δες πού χάνεις με το Pro ›',
    empty: 'Θέλει μερικά ματς ακόμα για να φανεί.',
  },
  /** push for results; the database sends these (core.take_push_batch), keep both in step */
  push: {
    one: { title: 'Βγήκε αποτέλεσμα', body: 'Το ’πες; Μπες να δεις.' },
    many: { title: 'Βγήκαν {n} αποτελέσματα', body: 'Πόσα το ’πες; Μπες να δεις.' },
    /** someone reacted to your match (core.reaction_notify; the founder edits the live text in admin /v2/notifications) */
    reaction: {
      one: { title: '{name}: «{reaction}»', body: 'Στο ματς σου με {opponent} · {tournament}' },
      many: { title: '{n} άτομα αντέδρασαν', body: 'Στο ματς σου με {opponent} · {tournament}' },
    },
  },
  confirm: {
    /** «Ο Βαγγέλης Καρδαμίτσης πέρασε ένα ματς σας» ({name} carries the article) */
    title: '{name} πέρασε ένα ματς σας',
    titleDoubles: '{name} πέρασε ένα ματς σας στο διπλό',
    ask: 'Έγινε έτσι;',
    yes: 'Έτσι έγινε',
    no: 'Όχι ακριβώς',
    how: 'Πώς έληξε;',
    notMe: 'Δεν έπαιξα εγώ',
    done: {
      confirmed: 'Έγινε. Μετράει για το level σου.',
      corrected: 'Το διορθώσαμε.',
      disputed: 'Το στείλαμε για έλεγχο.',
    },
    failed: 'Δεν έγινε. Ξαναδοκίμασε.',
  },
  /** the opponent link /m/<token> (prototype isOpv), for people not in the app */
  link: {
    /** «Ο Βαγγέλης Καρδαμίτσης πέρασε ένα ματς σας» */
    title: '{who} πέρασε ένα ματς σας',
    titleDoubles: '{who} πέρασε ένα ματς σας στο διπλό',
    ask: 'Έγινε έτσι;',
    yes: 'Έτσι έγινε',
    no: 'Όχι ακριβώς',
    how: 'Πώς έληξε;',
    notMe: 'Δεν έπαιξα εγώ',
    valid: { one: 'Το link ισχύει 1 μέρα ακόμα', many: 'Το link ισχύει {n} μέρες' },
    hide: 'Κρύψε με από το NetProphet',
    /** «Το διορθώσαμε. Ο Βαγγέλης θα το δει.» */
    corrected: 'Το διορθώσαμε. {who} θα το δει.',
    kudos: {
      title: 'Πες κι εσύ μια καλή κουβέντα',
      /** «Τι σου άρεσε περισσότερο στον Βαγγέλη;» ({to} is «τον Βαγγέλη») */
      ask: 'Τι σου άρεσε περισσότερο σ{to};',
      options: { serve: 'Σερβίς', backhand: 'Backhand', calm: 'Ψυχραιμία', feet: 'Πόδια', fair_play: 'Fair play', company: 'Καλή παρέα' },
      later: 'Άλλη φορά',
    },
    join: {
      pill: 'Έγινε',
      /** «Ο Βαγγέλης θα το δει.» */
      head: '{who} θα το δει.',
      sub: 'Μπες να μετρήσει το ματς στο level σου. Το προφίλ σου σε περιμένει ήδη.',
      cta: 'Κράτα το ματς στο προφίλ σου',
      later: 'Όχι τώρα',
    },
    hideAsk: {
      title: 'Θες να μη φαίνεσαι;',
      sub: 'Το όνομά σου δεν θα φαίνεται πουθενά. Το αλλάζεις όποτε θες από το ίδιο link.',
      yes: 'Κρύψε με',
      no: 'Άσε, μένω',
    },
    bye: {
      /** «Το είπαμε στον Βαγγέλη. Ευχαριστούμε.» */
      notMe: 'Το είπαμε σ{to}. Ευχαριστούμε.',
      disputed: 'Το είπαμε σ{to}. Θα το κοιτάξουμε.',
      later: 'Την απάντηση την κρατάμε 7 μέρες.',
      hidden: 'Έγινε. Δεν φαίνεσαι πια στο NetProphet.',
      claimed: 'Το ματς είναι ήδη σε ένα προφίλ. Το βλέπεις μέσα στο NetProphet.',
    },
    show: 'Θέλω να φαίνομαι ξανά',
    open: 'Δες το NetProphet',
    gone: 'Αυτό το link έληξε ή δεν υπάρχει.',
    failed: 'Δεν έγινε. Ξαναδοκίμασε.',
    /** someone who joined from a link, on the onboarding claim step */
    claimTitle: 'Αυτός είσαι;',
    claimTitleF: 'Αυτή είσαι;',
    claimSub: 'Από το ματς που σου έστειλαν. Το κρατάμε στο προφίλ σου.',
    claimYes: 'Ναι, εγώ είμαι',
    claimTaken: 'Αυτό το προφίλ το έχει ήδη άλλος λογαριασμός.',
    claimRequested: 'Το αίτημά σου στάλθηκε. Θα το δούμε σύντομα.',
    claimNo: 'Δεν είμαι εγώ',
    /** Ποιους ξέρεις after a link: one is enough, the logger is already picked */
    knownNote: 'Διάλεξε όσους ξέρεις. {who} είναι ήδη μέσα.',
  },
  /** «Πες μια καλή κουβέντα» (prototype isKudos), reactions on results and «Τι λένε για σένα» */
  kudos: {
    title: 'Πες μια καλή κουβέντα',
    ask: { m: 'Τι σου άρεσε περισσότερο στον αντίπαλο;', f: 'Τι σου άρεσε περισσότερο στην αντίπαλο;', plural: 'Τι σου άρεσε περισσότερο στους αντιπάλους;' },
    /** from Αποτελέσματα, to one player */
    askTo: { m: 'Τι θες να του πεις;', f: 'Τι θες να της πεις;' },
    later: 'Άλλη φορά',
    /** on the Done card */
    yours: 'Η καλή σου κουβέντα',
    /** «Πες κάτι στον Νίκο ›» ({to} is «τον Νίκο») */
    prompt: 'Πες κάτι σ{to} ›',
    sent: 'Το είπες',
    failed: 'Δεν έφυγε. Ξαναδοκίμασε.',
    me: {
      title: 'Τι λένε για σένα',
      all: 'Όλα',
      less: 'Λιγότερα',
      emptyTitle: 'Εδώ θα βλέπεις τα νέα της βδομάδας.',
      emptySub: 'Μετά το πρώτο ματς, οι αντίπαλοι σου λένε μια καλή κουβέντα.',
    },
  },
  /** «Πώς παίζει» on a profile and «Πώς σε βλέπουν» on Εγώ (prototype V2) */
  traits: {
    title: 'Πώς παίζει',
    plusOne: '+1',
    tapNote: 'Πάτα ό,τι ισχύει.',
    countedNote: 'Μέτρησε η ψήφος σου. Πάτα κι άλλα αν ισχύουν.',
    footer: 'Το βγάζουν οι ψήφοι όσων έπαιξαν απέναντί σου.',
    add: '+ Πρόσθεσε κάτι δικό σου',
    placeholder: 'Με δικά σου λόγια',
    submit: 'Πρόσθεσε',
    pending: 'Σε έλεγχο',
    pendingNote: 'Θα φανεί σε όλους μόλις το εγκρίνουμε.',
    sent: 'Το στείλαμε για έλεγχο',
    failed: 'Δεν έφυγε. Ξαναδοκίμασε.',
    badLabel: 'Γράψε από 3 μέχρι 40 γράμματα.',
    tooMany: 'Έχεις ήδη τρία σε έλεγχο. Περίμενε λίγο.',
    notPlayed: 'Ψηφίζουν όσοι έχουν παίξει μαζί.',
    me: {
      title: 'Πώς σε βλέπουν',
      unlock: 'Πόσοι σε ψήφισαν για το καθένα;',
      unlockPro: 'Pro',
      footer: 'Έτσι σε ψήφισαν όσοι έχουν παίξει απέναντί σου.',
      emptyTitle: 'Εδώ θα δεις τι λένε για σένα',
      emptySub: 'Το βγάζουν όσοι παίξουν απέναντί σου.',
    },
  },
  /** «Αναφορά» and «Μπλοκ» (App Store 1.2; not in the prototype) */
  safety: {
    report: 'Αναφορά',
    reportMatch: 'Αναφορά για αυτό το ματς',
    title: 'Τι συμβαίνει;',
    reasons: {
      wrong_result: 'Λάθος αποτέλεσμα',
      never_played: 'Δεν έγινε ποτέ',
      offensive: 'Προσβλητικό',
      fake: 'Ψεύτικο προφίλ',
      other: 'Κάτι άλλο',
    },
    note: 'Πες μας περισσότερα (αν θες)',
    send: 'Στείλ’ το',
    cancel: 'Άσε',
    sent: 'Το είδαμε. Θα το κοιτάξουμε.',
    block: 'Μπλοκ',
    /** «Μπλοκ τον Γιάννη;» ({to} is «τον Γιάννη») */
    blockTitle: 'Μπλοκ {to};',
    blockSub: 'Δεν θα βλέπεις τα ματς που περνάει και δεν μπορεί να σου αφήνει σχόλια. Δεν θα το μάθει.',
    blocked: 'Έγινε. Δεν θα τον ξαναδείς.',
    blockedF: 'Έγινε. Δεν θα την ξαναδείς.',
    list: 'Μπλοκαρισμένοι',
    unblock: 'Ξεμπλόκαρε',
    failed: 'Δεν έγινε. Ξαναδοκίμασε.',
    /** «Δεν είμαι εγώ;» on a profile an account holds: the account may not be that person (founder, 20 Oct 2026) */
    claim: {
      link: 'Δεν είμαι εγώ;',
      title: 'Κάτι δεν πάει καλά;',
      sub: 'Αν το προφίλ είναι δικό σου, ή ξέρεις ότι ο λογαριασμός του δεν είναι του ανθρώπου που δείχνει, πες μας.',
      note: 'Κάτι ακόμα που πρέπει να ξέρουμε (αν θες)',
      sent: 'Το είδαμε. Θα το ελέγξουμε.',
    },
    /** «Δεν είμαι εγώ» on your own player (Εγώ, your profile): staff unlink it, then you find the right one */
    claimOwn: {
      link: 'Δεν είμαι εγώ',
      title: 'Λάθος παίκτης;',
      sub: 'Αν αυτό το προφίλ δεν είσαι εσύ, πες μας. Θα το αποσυνδέσουμε από τον λογαριασμό σου.',
      sent: 'Το είδαμε. Θα το ελέγξουμε.',
    },
  },
  /** full-screen moments (prototype celOn): σερί milestones for now */
  celebrate: {
    label: 'Σερί',
    titles: { 3: 'Τρία στη σειρά!', 5: 'Πέντε στη σειρά!', 7: 'Επτά στη σειρά!', 10: 'Το δέκα το καλό' } as Record<number, string>,
    rewards: {
      freeze: 'Πάρε και μια Ασφάλεια για τις δύσκολες μέρες',
      frame: 'Κορνίζα «{name}»',
      both: 'Ασφάλεια και κορνίζα',
      gear: '«{name}» για τον παίκτη σου',
      /** two milestones in one go (3 and 5 from one batch of results): every gift, joined */
      short: { freeze: 'Ασφάλεια', frame: 'Κορνίζα «{name}»', gear: '{name}' },
      join: ' + ',
      none: 'Συνέχισε έτσι',
    },
    frames: { frame_seven: 'Επτά', frame_ten: 'Δέκα' } as Record<string, string>,
    gear: { gear_headband: 'Κορδέλα' } as Record<string, string>,
    /** «σερί» in the pill */
    unit: 'σερί',
    aria: 'Γιορτή',
    /** a new game level: «LEVEL» over «Ανέβηκες level!», the number in the pill, then the line */
    level: { label: 'Level', title: 'Ανέβηκες level!', line: 'Συνέχισε τις σωστές προβλέψεις' },
    /** σερί went past your ΠΡ (once a run): the number in the pill, {old} is the record it beat */
    record: { title: 'Νέο ρεκόρ!', line: 'Πέρασες το {old}. Πάμε για παραπάνω!' },
  },
  /** the unlock ladder's full-screen moments: the title and the line by step key (other steps get none) */
  unlocks: {
    label: 'Νέο',
    moments: {
      level_bar: { title: 'Το level σου', line: 'Κάθε σωστή ψήφος σε ανεβάζει. Δες το στο Εγώ.' },
      daily_quests: { title: 'Νέο: Αποστολές', line: 'Τρεις μικρές για σήμερα' },
      ladder_friends: { title: 'Μπήκες στην Κατάταξη!', line: 'Φέρε έναν φίλο να σε κυνηγάει' },
      kudos_reactions: { title: 'Το επιβεβαίωσε!', line: 'Πες μια καλή κουβέντα' },
      badges_shelf: { title: 'Πρώτο badge στο χέρι!', line: '' },
      pro_first_view: { title: 'Τριάντα ψήφοι!', line: '' },
      stats_area: { title: 'Τώρα βλέπεις τα στατιστικά σου και όλη την Αττική', line: '' },
    } as Record<string, { title: string; line: string }>,
  },
  quests: {
    title: 'Αποστολές',
    today: 'Σήμερα',
    todayReset: '· ανανεώνεται στις 00:00',
    week: 'Της εβδομάδας',
    weekReset: '· ανανεώνεται τη Δευτέρα',
    weekToggle: 'Της εβδομάδας · {n}/{total}',
    close: 'Κλείσιμο',
    doneOne: '✓ 1 έγινε',
    doneMany: '✓ {n} έγιναν',
    titles: {
      daily_vote_3_cards: 'Ψήφισε 3 κάρτες',
      daily_kudos_1: 'Δώσε ένα μπράβο',
      daily_vote_2_matches: 'Ψήφισε σε 2 ματς',
      weekly_log_2_matches: 'Πέρνα 2 αγώνες σου',
      weekly_vote_5_days: 'Ψήφισε 5 μέρες την εβδομάδα',
    } as Record<string, string>,
    frame: 'Frame',
    background: 'Φόντο',
    got: 'Το κέρδισες',
    cosmetics: { bg_night: 'Βραδινό ματς', bg_clay: 'Χωμάτινο γήπεδο', bg_grass: 'Γρασίδι', frame_week: 'Της εβδομάδας', frame_friends: 'Φίλοι' } as Record<string, string>,
    rewardFrame: 'Frame {name}',
    rewardBackground: 'Φόντο {name}',
    rewardBadge: '+{n} στο badge {name}',
    toast: 'Αποστολή ✓ · {reward}',
    celebrationOne: 'Αποστολή ✓',
    celebrationMany: 'Αποστολές ✓',
    titleMany: '{n} αποστολές',
    meRow: 'Αποστολές',
    meCount: '{n}/3 ›',
  },
  quiz: {
    label: 'Παιχνίδι της ημέρας',
    head: 'Οι ερωτήσεις της ημέρας',
    subSix: 'Έξι γρήγορες ερωτήσεις από τα γήπεδα και τους παίκτες που ξέρεις.',
    subTwelve: 'Δώδεκα γρήγορες ερωτήσεις από τα γήπεδα και τους παίκτες που ξέρεις.',
    progress: '{n} από {total}',
    done: '✓ Έχεις παίξει τις σημερινές ερωτήσεις.',
    /** done and not Pro (founder, 18 Oct): six more every day */
    more: 'Άλλες 6 κάθε μέρα με το Pro ›',
    play: 'Παίξε ›',
    resume: 'Συνέχισε ›',
    bonus: '+30',
    error: 'Δεν φόρτωσε. Ξαναδοκίμασε.',
    answerFailed: 'Η απάντηση δεν πέρασε. Ξαναδοκίμασε.',
    expired: 'Αυτές οι ερωτήσεις έληξαν. Φέρνουμε τις νέες.',
    back: '‹ Πίσω',
    next: 'Επόμενη ›',
    pick: 'Πάτα ένα.',
    pickWho: 'Εδώ υπάρχει σωστή απάντηση.',
    pickOpinion: 'Εδώ δεν υπάρχει σωστό και λάθος.',
    thisWeek: 'αυτή τη βδομάδα',
    right: 'Σωστά. ',
    wrong: 'Όχι αυτή τη φορά. ',
    counted: 'Μέτρησε. Δες τι είπαν οι άλλοι.',
    /** no split yet: it shows once five have answered */
    countedSoon: 'Μέτρησε. Τι είπαν οι άλλοι, θα το δεις μόλις απαντήσουν κι άλλοι.',
    end: {
      title: 'Αυτά για σήμερα.',
      points: 'πόντοι',
      next: 'Οι επόμενες έξι αύριο στις 9:00',
      nextPro: 'Οι επόμενες δώδεκα αύριο στις 9:00',
      quests: 'Οι αποστολές σου',
      allQuests: 'Δες όλες ›',
      pro: 'Θες κι άλλες; Με το Pro παίζεις 12 ›',
      toVotes: 'Πίσω στις ψήφους',
      toLadder: 'Δες την Κατάταξη',
    },
  },
  badges: {
    title: 'Badges',
    back: '‹ Εγώ',
    seeAll: 'Δες τα όλα ›',
    earned: 'Κερδισμένα',
    locked: 'Κλειδωμένα',
    lockedTier: 'Κλειδωμένο',
    tierOf: '{tier} · {n} από 3',
    more: 'Ακόμα {n}',
    tileTier: '{tier}\u00A0· ακόμα\u00A0{n}',
    leftFor: 'Ακόμα {n} για {tierLower}',
    maxed: 'Χρυσή Βαθμίδα. Τα έχεις όλα.',
    wear: 'Βάλ’ το στην κάρτα',
    worn: 'Φοριέται',
    wornToast: 'Μπήκε στην κάρτα σου',
    footer: 'Τα badges δεν δίνουν πόντους ούτε αλλάζουν level.',
    oneMore: 'Ένα ακόμα για το badge {name}',
    /** founder, 18 Oct */
    tiers: ['Χάλκινη Βαθμίδα', 'Ασημένια Βαθμίδα', 'Χρυσή Βαθμίδα'] as string[],
    /** the next tier with its article, for «Ακόμα 4 για τη …» */
    tiersLower: ['τη Χάλκινη Βαθμίδα', 'την Ασημένια Βαθμίδα', 'τη Χρυσή Βαθμίδα'] as string[],
    names: {
      first_serve: 'Πρώτο σερβίς',
      nice_player: 'Ωραίος ο παίχτης',
      gentleman: 'Ο ευγενικός',
      beloved: 'Αγαπητός',
      club_oracle: 'Μάντης του κλαμπ',
      upset: 'Ανατροπή',
      in_a_row: 'Στη σειρά',
      influencer: 'Ινφλουένσερ',
      whole_week: 'Όλη η βδομάδα',
      doubles_player: 'Ο διπλίστας',
      variety: 'Έχει ποικιλία',
      steady: 'Σταθερός',
      many_votes: 'Πολλά τα ψηφαλάκια',
      generous: 'Χουβαρντάς',
      season_veteran: 'Βετεράνος σεζόν',
      month_top: 'Κορυφαίος του μήνα',
    } as Record<string, string>,
    /** the rule line: «5 / 25 / 100 {unit}» */
    units: {
      first_serve: 'ματς καταγεγραμμένα',
      nice_player: 'αντίπαλοι που επιβεβαίωσαν το ματς σου',
      gentleman: 'kudos που έδωσες μετά από ματς',
      beloved: 'kudos από διαφορετικούς αντιπάλους',
      club_oracle: 'σωστές ψήφοι στο Ψήφισε',
      upset: 'ανατροπές που είπες σωστά',
      in_a_row: 'σωστές ψήφοι στη σειρά',
      influencer: 'φίλοι που έγιναν μέλη και έπαιξαν ματς',
      whole_week: 'βδομάδες με ψήφο και τις 7 ημέρες',
      doubles_player: 'διπλά ματς με επιβεβαίωση συμπαίκτη',
      variety: 'διαφορετικοί αντίπαλοι',
      steady: 'βδομάδες στη σειρά με ματς',
      many_votes: 'ψήφοι σε κάρτες',
      generous: 'φορές που κέρασες',
      season_veteran: 'σεζόν με ενεργή δραστηριότητα',
      month_top: 'μήνες στην πρώτη τριάδα',
    } as Record<string, string>,
    celebrationNew: 'Νέο badge',
    celebrationTier: 'Νέα βαθμίδα',
    reward: '{tier}',
    rewardGold: '{tier} · Frame Level',
    /** «Στη σειρά» is about your best σερί: the tier names its number, so it never reads as today's σερί */
    rewardAt: '{tier} · {n} {unit}',
    meBadges: 'Badges',
  },
  /** Baller, the ball person that is you (founder, 17 Oct: the trademark) */
  baller: {
    meet: 'Γνώρισε τον Baller σου',
    meetSub: 'Κάνε τον δικό σου. Αλλάζεις ό,τι θες όποτε θες.',
    swipe: 'Σύρε για άλλο στυλ',
    prev: 'Προηγούμενο στυλ',
    next: 'Επόμενο στυλ',
    nameTitle: 'Πώς τον λένε;',
    nameHint: 'Θα φαίνεται στο προφίλ σου και στην Κατάταξη.',
    go: 'Συνέχεια',
    later: 'Αργότερα',
    saving: 'Λίγο ακόμα…',
    problems: {
      short: 'Τουλάχιστον 2 γράμματα.',
      long: 'Μέχρι 16 γράμματα.',
      chars: 'Μόνο γράμματα, ελληνικά ή λατινικά.',
      notAllowed: 'Αυτό το όνομα δεν γίνεται. Διάλεξε άλλο.',
      failed: 'Δεν αποθηκεύτηκε. Ξαναδοκίμασε.',
    },
    edit: 'Ο Baller σου',
    rename: 'Μετονομασία',
    save: 'Αποθήκευση',
    /** the share card (drafts for the founder) */
    share: {
      open: 'Μοιράσου ›',
      title: 'Μοιράσου τον Baller σου',
      sub: 'Στείλ’ τον στην παρέα ή βάλ’ τον στο story σου.',
      send: 'Στείλ’ τον',
      making: 'Ετοιμάζεται…',
      failed: 'Δεν έφυγε. Ξαναδοκίμασε.',
      level: 'level',
      streak: 'σερί',
      points: 'πόντοι μήνα',
      message: 'Γνώρισε τον {name}, τον Baller μου στο NetProphet. Φτιάξε τον δικό σου: {url}',
      messageNoName: 'Γνώρισε τον Baller μου στο NetProphet. Φτιάξε τον δικό σου: {url}',
    },
  },
  look: {
    title: 'Εμφάνιση',
    sub: 'Κορνίζες, φόντα, ρούχα και ρακέτα',
    isNew: 'Νέο',
    back: '‹ Εγώ',
    tabs: { frame: 'Κορνίζες', background: 'Φόντα', kit: 'Ρούχα & ρακέτα', gear: 'Αξεσουάρ', win_effect: 'Πανηγυρισμός' },
    /** style and name live with Baller now (founder, 17 Oct) */
    ballerLink: 'Ο Baller σου ›',
    swipe: 'Σύρε τον Baller για το επόμενο',
    tagFree: 'Δωρεάν',
    tagEarned: 'Το κέρδισες',
    tagBought: 'Αγορά',
    /** «1,99€», the price in the grid */
    price: '{price}€',
    /** «1,99 €», the price on the button and in the sheet */
    priceSpaced: '{price} €',
    worn: 'Φοριέται',
    wear: 'Βάλ’ το',
    noFrame: 'Χωρίς frame',
    noBackground: 'Χωρίς φόντο',
    noGear: 'Χωρίς αξεσουάρ',
    noEffect: 'Χωρίς πανηγυρισμό',
    footnote: 'Μόνο στυλ. Δεν αλλάζει level, ψήφους ή Κατάταξη.',
    toast: 'Ο Baller σου το φοράει',
    error: 'Δεν έγινε. Δοκίμασε ξανά.',
    buy: 'Αγόρασε · {price}',
    soon: 'Σύντομα',
    soonLine: 'Οι αγορές ανοίγουν σύντομα.',
    bought: 'Δικό σου ✓',
    buyShort: 'Αγόρασε',
    buyFailed: 'Η αγορά δεν ολοκληρώθηκε. Δοκίμασε ξανά.',
    close: 'Κλείσιμο',
    sheet: {
      frame: 'Κορνίζα {name}',
      background: 'Φόντο {name}',
      kit: 'Ρούχα & ρακέτα',
      lineFrame: 'Γύρω από τον παίκτη σου στο Εγώ.',
      lineBackground: 'Στην κάρτα σου στο Εγώ.',
      lineKit: 'Ένα σετ για τον Baller σου, μαζί με το χρώμα της ρακέτας.',
      noteFrame: 'Μόνο στυλ. Δεν δείχνει πόσο καλός είσαι.',
      noteBackground: 'Μόνο στυλ. Δεν αλλάζει level.',
      noteKit: 'Μόνο στυλ. Ίδια πόζα, ίδια νούμερα. Δεν ξεκλειδώνει level ή badge.',
      gear: '{name} για τον παίκτη σου',
      effect: 'Πανηγυρισμός {name}',
      lineGear: 'Το φοράει ο παίκτης σου στο Εγώ.',
      lineEffect: 'Παίζει όταν ο παίκτης σου πανηγυρίζει.',
      noteGear: 'Μόνο στυλ. Δεν αλλάζει πόντους ή level.',
      noteEffect: 'Μόνο στυλ. Δεν αλλάζει πόντους ή level.',
    },
    stats: {
      open: 'Δες τα στατιστικά ›',
      pill: 'Τα στατιστικά σου',
      pending: 'Το level σου θα το βγάλει το κοινό',
      matches: '{n} ματς',
      votesOne: '1 ψήφος',
      votesMany: '{n} ψήφοι',
      toNext: 'Ως το level {next}: +{gap}',
      pro: 'Pro',
      back: '‹ Πίσω',
    },
  },
  tournaments: {
    title: 'Τα τουρνουά σου',
    /** under the title (founder, 21 Oct) */
    subtitle: 'Δες ταμπλό και πρόγραμμα αγώνων',
    /** Εγώ: «2 ›», in blue, at the end of the row */
    meCount: '{count} ›',
    /** the feed's link after the fifth card */
    feedLink: 'Τα τουρνουά σου · {count} ›',
    backMe: '‹ Εγώ',
    backFeed: '‹ Πίσω',
    /** the search entry on the Τουρνουά tab (Παίκτες is no longer a tab) */
    search: 'Ψάξε παίκτη',
    /** Παίκτες opened from it */
    backTournaments: '‹ Τουρνουά',
    /** the last line of Τουρνουά: back to the votes */
    toVotes: 'Στα σημερινά ματς ›',
    /** the Pro card: «Παίζεις Σάββατο 10:00» */
    program: 'Το πρόγραμμά σου',
    playing: 'Παίζεις {when}',
    playingToday: 'σήμερα',
    playingTomorrow: 'αύριο',
    /** «Open Γλυφάδας · Μ 40+» */
    mineWhat: '{tournament} · {level}',
    /** the Pro card on top of Τουρνουά (founder, 14 Oct: Pro high up, notifications first) */
    alerts: {
      title: 'Ειδοποιήσεις για τα ματς σου',
      /** the one line on Τουρνουά (founder, 16 Oct: one line + button) */
      short: 'Κλήρωση, ώρα και υπενθυμίσεις, στο κινητό σου.',
      lines: ['Μόλις βγει η κλήρωση', 'Η μέρα και η ώρα σου, και κάθε αλλαγή', 'Υπενθύμιση το βράδυ πριν και 2 ώρες πριν'],
      cta: 'Άνοιξέ τες με Pro ›',
      /** with Pro, at the bottom of «Το πρόγραμμά σου» */
      on: '✓ Οι ειδοποιήσεις σου είναι ανοιχτές',
      /** with Pro and no match yet */
      onEmpty: 'Σου λέμε μόλις μπεις σε κλήρωση.',
      /** the one quiet line under your own tournaments (founder, 19 Oct: Pro below your own things) */
      row: 'Ειδοποιήσεις για τα ματς σου, με Pro ›',
    },
    /** Pro: «Το επόμενο τουρνουά για σένα», tournaments still to come, your area first, entry closing soonest */
    next: {
      title: 'Το επόμενο τουρνουά για σένα',
      /** «Δηλώσεις έως Πεμ 23/10» */
      deadline: 'Δηλώσεις έως {day} {date}',
      closed: 'Οι δηλώσεις έκλεισαν',
      enter: 'Δήλωση ›',
      played: 'Το έχεις ξαναπαίξει',
      /** free: the rest open the Pro screen */
      moreOne: 'Άλλο ένα για σένα με Pro ›',
      moreMany: 'Άλλα {n} για σένα με Pro ›',
      /** free with nothing more to show: the reminder sells it */
      remind: 'Με Pro σου θυμίζουμε πριν κλείσουν οι δηλώσεις ›',
      /** Pro */
      remindOn: '✓ Σου θυμίζουμε 2 μέρες πριν κλείσουν οι δηλώσεις',
      empty: 'Δεν έχει βγει νέο τουρνουά ακόμα.',
    },
    sections: { mine: 'Τα δικά σου', ongoing: 'Τώρα', upcoming: 'Έρχονται', done: 'Τελείωσαν' },
    chipOngoing: 'σε εξέλιξη',
    chipTomorrow: 'αύριο',
    chipInDays: 'σε {n} μέρες',
    chipDone: 'τελείωσε',
    chipSoon: 'σύντομα',
    chipIn: 'παίζεις',
    /** a tournament you follow */
    chipFollowing: 'ακολουθείς',
    /** «Γήπεδα Γλυφάδας · 17/10 έως 18/10» */
    sub: '{venue} · {from} έως {to}',
    subDates: '{from} έως {to}',
    draws: '{n} ταμπλό',
    today: '{n} ματς σήμερα',
    empty: 'Δεν υπάρχει τουρνουά τώρα.',
    error: 'Δεν φόρτωσαν. Τράβα προς τα κάτω για ξανά.',
    /** short weekdays, Sunday first */
    weekdaysShort: ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'],
    /** full weekdays in the accusative, Sunday first: «Παίζεις Σάββατο» */
    weekdaysOn: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
    /** the tournament page: today first, your people, a player's run in it (21 Oct) */
    focus: {
      /** the strip above today's schedule, by court */
      now: 'Τώρα',
      next: 'Μετά',
      /** «Ροδίτης με Δεσύπρη»: who plays who, surnames only */
      pair: '{a} με {b}',
      /** a match with no time that follows another on the same court */
      after: 'μετά το {match}',
      /** the row at the top when your people play today */
      yoursToday: 'Οι δικοί σου σήμερα',
      /** «18:30 · με Ροδίτη» */
      against: 'με {name}',
      /** the hint, once per device */
      hint: 'Κράτα πατημένο ένα όνομα για την πορεία του στο τουρνουά',
      /** the full screen of one player in this tournament */
      close: '‹',
      closeLabel: 'Κλείσε',
      played: 'Ως τώρα',
      nextMatch: 'Το επόμενο ματς',
      nothingYet: 'Δεν έχει παίξει ακόμα σε αυτό το τουρνουά.',
      noNext: 'Κανένα ματς ακόμα στο πρόγραμμα.',
      drawTitle: 'Η πορεία στο ταμπλό',
      /** «Σήμερα 18:30», «Αύριο 10:00», «Σαβ 24/10 10:00» */
      when: '{day} {time}',
      playingNow: 'Παίζει τώρα',
      notFound: 'Δεν βρήκαμε αυτόν τον παίκτη σε αυτό το τουρνουά.',
      /** «Αν κερδίσει» (founder, 21 Oct): who waits in the next round, from the match the name was held on */
      ifWinsMatch: 'Αν κερδίσει αυτό το ματς ({round}): {who}',
      /** with no match to go by, the player's upcoming one */
      ifWinsNext: 'Αν κερδίσει: {who}',
      /** the match was played and won: the next one */
      nextIs: 'Επόμενος: {who}',
      /** both still to play each other: «ΡΟΔΙΤΗΣ ΝΙΚΟΣ ή ΜΕΜΜΟΣ ΗΛΙΑΣ» */
      either: '{a} ή {b}',
      playsFinal: 'Παίζει τον τελικό',
      title: 'Πήρε τον τίτλο',
      out: {
        final: 'Έχασε στον τελικό',
        semi: 'Έφυγε στα ημιτελικά',
        quarter: 'Έφυγε στα προημιτελικά',
        roundN: 'Έφυγε στον {n}ο γύρο',
      },
      /** a pair's title: «Καρδαμίτσης Βαγγέλης & Μέμμος Ηλίας» */
      pairTitle: '{name} & {partner}',
      /** a pill for one of their categories: «MD 40+ · με Μέμμο»; singles shows the category alone */
      entryPill: '{category} · με {partner}',
      /** the row that opens the path screen */
      openPath: 'Η πορεία στο ταμπλό',
      /** from the path screen to the whole draw, his path lit */
      wholeDraw: 'Όλο το ταμπλό',
      /** a step of the path */
      byeStep: 'Πέρασε χωρίς ματς',
      ifWinsStep: 'Αν κερδίσει',
      notYet: 'θα φανεί',
      /** the path of a round robin draw */
      groupStep: '{group}',
      /** no draw for this player (the sheet is not out, or their name is not in it) */
      noRun: 'Το ταμπλό του δεν βγήκε ακόμα.',
    },
    detail: {
      back: '‹ Τουρνουά',
      /** the follow pill in the header (21 Oct: free for everyone) */
      follow: 'Ακολούθησε',
      following: '✓ Ακολουθείς',
      followedToast: 'Θα σου πούμε για κλήρωση, πρόγραμμα και τελικό.',
      unfollowedToast: 'Δεν ακολουθείς πια',
      followFailed: 'Δεν έγινε. Δοκίμασε ξανά.',
      followTooMany: 'Ακολουθείς ήδη 100 τουρνουά. Άφησε κάποιο πρώτα.',
      schedule: 'Πρόγραμμα',
      bracket: 'Ταμπλό',
      postponed: 'Αναβλήθηκε',
      postponedTime: 'Αναβολή',
      movedFrom: 'από {when}',
      noMatchesDay: 'Δεν έχει ματς αυτή τη μέρα.',
      noDraws: 'Το ταμπλό δεν βγήκε ακόμα.',
      notFound: 'Δεν βρήκαμε αυτό το τουρνουά.',
      error: 'Δεν φόρτωσε. Τράβα προς τα κάτω για ξανά.',
      roundN: '{n}ος γύρος',
      quarter: 'Προημιτελικά',
      semi: 'Ημιτελικά',
      final: 'Τελικός',
      champion: 'Πρωταθλητής',
      bye: 'BYE',
      advances: 'προκρίνεται',
      until: 'έως {date}',
      tbd: 'θα φανεί',
      wins: 'Νίκες',
      notPlayed: 'Δεν έχει παίξει',
      masked: '–',
      /** «Μοιράσου» on the Πρόγραμμα tab: the day's schedule as a picture */
      share: {
        action: 'Μοιράσου το πρόγραμμα της ημέρας ›',
        making: 'Ετοιμάζεται…',
        failed: 'Δεν έφυγε. Ξαναδοκίμασε.',
        /** on the picture, above the list */
        cardTitle: 'Πρόγραμμα αγώνων',
        title: 'Πρόγραμμα {day}',
        more: '+{n} ακόμα',
        message: '{name} · {day}\nΠρόγραμμα στο NetProphet: {url}',
      },
      /** «(3)», the seed */
      seed: '({n})',
      disciplines: { MS: 'Απλό', WS: 'Απλό γυναικών', MD: 'Διπλό', WD: 'Διπλό γυναικών', XD: 'Μικτό' } as Record<string, string>,
    },
  },
  placeholder: {
    results: 'Τα αποτελέσματα έρχονται εδώ.',
    players: 'Οι παίκτες έρχονται εδώ.',
    me: 'Το προφίλ σου έρχεται εδώ.',
  },
  /** the first-visit tour on Σήμερα (founder, 20 Oct): once per account, replayable from Εγώ › Ρυθμίσεις */
  tour: {
    /** the overlay as a whole, for screen readers */
    label: 'Ξενάγηση',
    steps: {
      feed: { title: 'Ψήφισε τον νικητή', line: 'Πάτα τον παίκτη που πιστεύεις ότι θα κερδίσει. Αν το βρεις, παίρνεις πόντους και ξεκινάς το σερί.' },
      results: { title: 'Τι έγινε στα γήπεδα', line: 'Όλα τα αποτελέσματα. Ψάξε ανά παίκτη ή τουρνουά.' },
      tournaments: { title: 'Τα τουρνουά', line: 'Ταμπλό, πρόγραμμα, κληρώσεις και οι συμμετοχές σου.' },
      ladder: { title: 'Η Κατάταξη', line: 'Θα καταφέρεις να είσαι ο πρώτος στην παρέα; Μηνιαία κατάταξη.' },
      me: { title: 'Εσύ', line: 'Ο Baller σου, τα στατιστικά σου, οι αποστολές και το Pro.' },
    },
    next: 'Επόμενο ›',
    skip: 'Παράλειψη',
    /** the last step's button, the one blue on the tour */
    go: 'Πάμε να ψηφίσουμε',
    /** «2 από 5» */
    counter: '{n} από {total}',
    /** the row in Εγώ › Ρυθμίσεις */
    replay: 'Δες ξανά την ξενάγηση',
  },
};
