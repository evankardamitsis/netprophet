/**
 * The welcome and account emails (founder's email board, approved 17 Nov 2026). The database queues them
 * (core.emails, migration 20270422000000_email_core) and api.admin_emails_due hands them to the cron route with what
 * each needs; this file turns one row into subject, HTML and text, in Greek or, for a row in English (app 1.0.1), in
 * English. Each email keeps its copy in one object per language; the structure, art and buttons are shared.
 *
 * Gender is not known for anyone yet (profiles.gender is empty), so no line depends on it: «Αυτό είναι το προφίλ σου»,
 * not «Αυτός είσαι εσύ». Buttons open www.netprophetapp.com/open, which opens the app or the store.
 */
import { esc, SITE_URL, block } from '../emailLayout';
import { build, hello, langOf, OPEN_URL, t, type DueEmail, type Mail } from './core';

export type { DueEmail, Mail } from './core';

const playerName = (e: DueEmail) => (typeof e.payload.player_name === 'string' && e.payload.player_name.trim()) || null;

export function welcomeEmail(e: DueEmail): Mail {
  const name = hello(e.first_name, langOf(e));
  const c = t(
    e,
    {
      steps: [
        ['Ψήφισε σήμερα.', 'Ένα tap στο όνομα. Το αποτέλεσμα βγαίνει μέσα στη μέρα.'],
        ['Ακολούθησε την παρέα σου.', 'Δες τους αγώνες τους από όλα τα τουρνουά πρώτα και μάθε τα αποτελέσματα αμέσως.'],
        ['Βρες το προφίλ σου.', 'Αν παίζεις τουρνουά, δες τους αγώνες και τα αναλυτικά στατιστικά σου.'],
      ] as [string, string][],
      quizLead: 'Quiz της ημέρας:',
      quizRest: '6 ερωτήσεις κάθε μέρα. Τελείωσέ τες και παίρνεις +30 πόντους.',
      title: name ? `Μπήκες, ${name}. Πάμε!` : 'Μπήκες. Πάμε!',
      preheader: 'Ώρα να ανακαλύψεις το NetProphet.',
      kicker: 'ΚΑΛΩΣ ΗΡΘΕΣ',
      sub: 'Από σήμερα κάθε ματς είναι και μία ερώτηση: Ποιος θα το πάρει;',
      button: 'Ψήφισε το πρώτο σου ματς',
      why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet.',
    },
    {
      steps: [
        ['Vote today.', 'One tap on a name. The result is in the same day.'],
        ['Follow your crowd.', 'See their matches from every tournament first and get their results right away.'],
        ['Find your profile.', 'If you play tournaments, see your matches and your detailed stats.'],
      ] as [string, string][],
      quizLead: 'Quiz of the day:',
      quizRest: '6 questions every day. Finish them and you get +30 points.',
      title: name ? `You’re in, ${name}. Let’s go!` : 'You’re in. Let’s go!',
      preheader: 'Time to see what NetProphet is about.',
      kicker: 'WELCOME',
      sub: 'From today every match is also a question: who takes it?',
      button: 'Vote on your first match',
      why: 'You got this email because you made a NetProphet account.',
    },
  );
  return build(e, {
    subject: c.title,
    preheader: c.preheader,
    hero: { kicker: c.kicker, title: esc(c.title), sub: c.sub, art: 'welcome' },
    body: [block.steps(c.steps), block.button(OPEN_URL, c.button), block.tip(`<strong>${c.quizLead}</strong> ${c.quizRest}`)],
    text: [...c.steps.map(([a, b], i) => `${i + 1}. ${a} ${b}`), '', `${c.button}: ${OPEN_URL}`, '', `${c.quizLead} ${c.quizRest}`],
    why: c.why,
  });
}

export function claimOkEmail(e: DueEmail): Mail {
  const player = playerName(e);
  const c = t(
    e,
    {
      line: 'Τα ματς και τα αποτελέσματά σου είναι πια στην κάρτα σου, και όσοι σε ακολουθούν μαθαίνουν πώς πήγες.',
      subject: 'Τώρα έχεις το δικό σου προφίλ',
      preheader: 'Τα ματς σου είναι πια στην κάρτα σου.',
      kicker: 'ΤΟ ΠΡΟΦΙΛ ΣΟΥ',
      title: 'Αυτό είναι το προφίλ σου!',
      sub: player ? `Συνδέσαμε τον λογαριασμό σου με το προφίλ ${player}.` : 'Συνδέσαμε τον λογαριασμό σου με το προφίλ σου.',
      button: 'Δες την κάρτα σου',
      why: 'Πήρες αυτό το email επειδή ζήτησες να συνδέσεις το προφίλ σου στο NetProphet.',
    },
    {
      line: 'Your matches and results are on your card now, and everyone who follows you sees how you did.',
      subject: 'Now you have your own profile',
      preheader: 'Your matches are on your card now.',
      kicker: 'YOUR PROFILE',
      title: 'This is your profile!',
      sub: player ? `We linked your account to the profile ${player}.` : 'We linked your account to your profile.',
      button: 'See your card',
      why: 'You got this email because you asked to link your profile on NetProphet.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: c.kicker, title: c.title, sub: esc(c.sub), art: 'wave' },
    body: [block.paragraph(esc(c.line)), block.button(OPEN_URL, c.button)],
    text: [c.line, '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

export function claimNoEmail(e: DueEmail): Mail {
  const player = playerName(e);
  const c = t(
    e,
    {
      a: player ? `Δεν μπορέσαμε να επιβεβαιώσουμε ότι το προφίλ ${player} είναι δικό σου.` : 'Δεν μπορέσαμε να επιβεβαιώσουμε ότι το προφίλ είναι δικό σου.',
      b: 'Απάντησε σε αυτό το email με κάτι που το δείχνει, π.χ. το τελευταίο τουρνουά που έπαιξες. Θα το ξανακοιτάξουμε.',
      subject: 'Δεν βρήκαμε ότι το προφίλ είναι δικό σου',
      preheader: 'Αν είναι, απάντησε σε αυτό το email.',
      title: 'Δεν βρήκαμε το προφίλ',
      sub: 'Βοήθησέ μας να το βρούμε μαζί.',
      why: 'Πήρες αυτό το email επειδή ζήτησες να συνδέσεις ένα προφίλ στο NetProphet.',
    },
    {
      a: player ? `We couldn’t confirm that the profile ${player} is yours.` : 'We couldn’t confirm that the profile is yours.',
      b: 'Reply to this email with something that shows it, like the last tournament you played. We’ll take another look.',
      subject: 'We couldn’t confirm the profile is yours',
      preheader: 'If it is, reply to this email.',
      title: 'We couldn’t match the profile',
      sub: 'Help us sort it out together.',
      why: 'You got this email because you asked to link a profile on NetProphet.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { title: c.title, sub: c.sub, art: 'think' },
    body: [block.paragraph(esc(c.a)), block.tip(esc(c.b))],
    text: [c.a, '', c.b],
    why: c.why,
  });
}

export function newPlayerOkEmail(e: DueEmail): Mail {
  const name = hello(e.first_name, langOf(e));
  const c = t(
    e,
    {
      line: 'Κάθε ματς σου σε τουρνουά μπαίνει πια στην κάρτα σου, και οι φίλοι σου μπορούν να σε ακολουθήσουν.',
      subject: name ? `Καλώς ήρθες στο ρόστερ, ${name}!` : 'Καλώς ήρθες στο ρόστερ!',
      ready: 'Το προφίλ σου είναι έτοιμο.',
      kicker: 'ΝΕΟΣ ΣΤΟ ΡΟΣΤΕΡ',
      title: name ? `Καλώς ήρθες, ${name}!` : 'Καλώς ήρθες!',
      button: 'Δες την κάρτα σου',
      why: 'Πήρες αυτό το email επειδή ζήτησες προφίλ παίκτη στο NetProphet.',
    },
    {
      line: 'Every tournament match you play now lands on your card, and your friends can follow you.',
      subject: name ? `Welcome to the roster, ${name}!` : 'Welcome to the roster!',
      ready: 'Your profile is ready.',
      kicker: 'NEW ON THE ROSTER',
      title: name ? `Welcome, ${name}!` : 'Welcome!',
      button: 'See your card',
      why: 'You got this email because you asked for a player profile on NetProphet.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.ready,
    hero: { kicker: c.kicker, title: esc(c.title), sub: c.ready, art: 'wave' },
    body: [block.paragraph(esc(c.line)), block.button(OPEN_URL, c.button)],
    text: [c.line, '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

export function newPlayerNoEmail(e: DueEmail): Mail {
  const player = playerName(e);
  const c = t(
    e,
    {
      steps: [
        ['Ψάξε', player ? `«${player}» στο NetProphet.` : 'το όνομά σου στο NetProphet.'],
        ['Πάτα', '«Εγώ είμαι».'],
      ] as [string, string][],
      more: 'Δεν το βρίσκεις; Απάντησε σε αυτό το email και το βρίσκουμε μαζί.',
      subject: 'Μάλλον είσαι ήδη στο ρόστερ',
      preheader: 'Ψάξε το όνομά σου και πάτα «Εγώ είμαι».',
      title: 'Μάλλον είσαι ήδη εδώ',
      sub: 'Δεν φτιάξαμε νέο προφίλ, γιατί βρήκαμε ένα σαν το δικό σου.',
      why: 'Πήρες αυτό το email επειδή ζήτησες προφίλ παίκτη στο NetProphet.',
    },
    {
      // the app's English claim button is «That is me»
      steps: [
        ['Search', player ? `«${player}» on NetProphet.` : 'for your name on NetProphet.'],
        ['Tap', '«That is me».'],
      ] as [string, string][],
      more: 'Can’t find it? Reply to this email and we’ll find it together.',
      subject: 'You’re probably on the roster already',
      preheader: 'Search for your name and tap «That is me».',
      title: 'You’re probably here already',
      sub: 'We didn’t make a new profile, because we found one that looks like yours.',
      why: 'You got this email because you asked for a player profile on NetProphet.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { title: c.title, sub: c.sub, art: 'think' },
    body: [block.steps(c.steps), block.note(esc(c.more))],
    text: [...c.steps.map(([a, b], i) => `${i + 1}. ${a} ${b}`), '', c.more],
    why: c.why,
  });
}

export function deletedEmail(e: DueEmail): Mail {
  const c = t(
    e,
    {
      a: 'Σβήσαμε τον λογαριασμό σου στο NetProphet. Τι ακριβώς σβήσαμε, δες στο παρακάτω link:',
      link: `${SITE_URL}/delete-account`,
      linkText: 'Τι σβήνεται όταν διαγράφεις τον λογαριασμό σου ›',
      b: 'Είχες Pro; Η συνδρομή ακυρώνεται από το App Store ή το Google Play, όχι από εμάς. Αν αλλάξεις γνώμη, η πόρτα μένει ανοιχτή.',
      subject: 'Ο λογαριασμός σου διαγράφηκε',
      sub: 'Όπως ζήτησες.',
    },
    {
      a: 'We deleted your NetProphet account. The link below shows exactly what we deleted:',
      link: `${SITE_URL}/en/delete-account`,
      linkText: 'What goes when you delete your account ›',
      b: 'Had Pro? The subscription is cancelled in the App Store or Google Play, not by us. If you change your mind, the door stays open.',
      subject: 'Your account has been deleted',
      sub: 'As you asked.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.sub,
    hero: { title: c.subject, sub: c.sub, art: 'bye' },
    body: [block.paragraph(esc(c.a)), block.paragraph(block.link(c.link, c.linkText)), block.note(esc(c.b))],
    text: [c.a, c.link, '', c.b],
    why: '',
  });
}

/** the kinds of the first slice (20270422000000_email_core) */
export const LIFECYCLE_EMAILS: Record<string, (e: DueEmail) => Mail | null> = {
  welcome: welcomeEmail,
  claim_ok: claimOkEmail,
  claim_no: claimNoEmail,
  new_player_ok: newPlayerOkEmail,
  new_player_no: newPlayerNoEmail,
  deleted: deletedEmail,
};
