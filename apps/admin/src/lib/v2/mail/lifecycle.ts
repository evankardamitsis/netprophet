/**
 * The welcome and account emails (founder's email board, approved 17 Nov 2026). The database queues them
 * (core.emails, migration 20270422000000_email_core) and api.admin_emails_due hands them to the cron route with what
 * each needs; this file turns one row into subject, HTML and text. Greek only until the English app (1.0.1).
 *
 * Gender is not known for anyone yet (profiles.gender is empty), so no line depends on it: «Αυτό είναι το προφίλ σου»,
 * not «Αυτός είσαι εσύ». Buttons open www.netprophetapp.com/open, which opens the app or the store.
 */
import { esc, SITE_URL, block } from '../emailLayout';
import { build, hello, OPEN_URL, type DueEmail, type Mail } from './core';

export type { DueEmail, Mail } from './core';

const playerName = (e: DueEmail) => (typeof e.payload.player_name === 'string' && e.payload.player_name.trim()) || null;

export function welcomeEmail(e: DueEmail): Mail {
  const name = hello(e.first_name);
  const steps: [string, string][] = [
    ['Ψήφισε σήμερα.', 'Ένα tap στο όνομα. Το αποτέλεσμα βγαίνει μέσα στη μέρα.'],
    ['Ακολούθησε την παρέα σου.', 'Δες τους αγώνες τους πρώτα και μάθε τα αποτελέσματα αμέσως.'],
    ['Βρες το προφίλ σου.', 'Αν παίζεις τουρνουά, τα ματς σου μπαίνουν στην κάρτα σου.'],
  ];
  const quiz = 'Quiz της ημέρας: 6 ερωτήσεις κάθε μέρα. Τελείωσέ τες και παίρνεις +30 πόντους.';
  return build(e, {
    subject: name ? `Μπήκες, ${name}. Πάμε!` : 'Μπήκες. Πάμε!',
    preheader: 'Τρία taps και είσαι στο παιχνίδι.',
    hero: {
      kicker: 'ΚΑΛΩΣ ΗΡΘΕΣ',
      title: esc(name ? `Μπήκες, ${name}. Πάμε!` : 'Μπήκες. Πάμε!'),
      sub: 'Από σήμερα κάθε ματς είναι και μία ερώτηση: Ποιος θα το πάρει;',
      art: 'welcome',
    },
    body: [block.steps(steps), block.button(OPEN_URL, 'Ψήφισε το πρώτο σου ματς'), block.tip(`<strong>Quiz της ημέρας:</strong> 6 ερωτήσεις κάθε μέρα. Τελείωσέ τες και παίρνεις +30 πόντους.`)],
    text: [...steps.map(([a, b], i) => `${i + 1}. ${a} ${b}`), '', `Ψήφισε το πρώτο σου ματς: ${OPEN_URL}`, '', quiz],
    why: 'Πήρες αυτό το email επειδή έφτιαξες λογαριασμό στο NetProphet.',
  });
}

export function claimOkEmail(e: DueEmail): Mail {
  const player = playerName(e);
  const line = 'Τα ματς και τα αποτελέσματά σου είναι πια στην κάρτα σου, και όσοι σε ακολουθούν μαθαίνουν πώς πήγες.';
  return build(e, {
    subject: 'Τώρα έχεις το δικό σου προφίλ',
    preheader: 'Τα ματς σου είναι πια στην κάρτα σου.',
    hero: {
      kicker: 'ΤΟ ΠΡΟΦΙΛ ΣΟΥ',
      title: 'Αυτό είναι το προφίλ σου!',
      sub: esc(player ? `Συνδέσαμε τον λογαριασμό σου με το προφίλ ${player}.` : 'Συνδέσαμε τον λογαριασμό σου με το προφίλ σου.'),
      art: 'wave',
    },
    body: [block.paragraph(esc(line)), block.button(OPEN_URL, 'Δες την κάρτα σου')],
    text: [line, '', `Δες την κάρτα σου: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή ζήτησες να συνδέσεις το προφίλ σου στο NetProphet.',
  });
}

export function claimNoEmail(e: DueEmail): Mail {
  const player = playerName(e);
  const a = player ? `Δεν μπορέσαμε να επιβεβαιώσουμε ότι το προφίλ ${player} είναι δικό σου.` : 'Δεν μπορέσαμε να επιβεβαιώσουμε ότι το προφίλ είναι δικό σου.';
  const b = 'Απάντησε σε αυτό το email με κάτι που το δείχνει, π.χ. το τελευταίο τουρνουά που έπαιξες. Θα το ξανακοιτάξουμε.';
  return build(e, {
    subject: 'Δεν βρήκαμε ότι το προφίλ είναι δικό σου',
    preheader: 'Αν είναι, απάντησε σε αυτό το email.',
    hero: { title: 'Δεν βρήκαμε το προφίλ', sub: 'Βοήθησέ μας να το βρούμε μαζί.', art: 'think' },
    body: [block.paragraph(esc(a)), block.tip(esc(b))],
    text: [a, '', b],
    why: 'Πήρες αυτό το email επειδή ζήτησες να συνδέσεις ένα προφίλ στο NetProphet.',
  });
}

export function newPlayerOkEmail(e: DueEmail): Mail {
  const name = hello(e.first_name);
  const line = 'Κάθε ματς σου σε τουρνουά μπαίνει πια στην κάρτα σου, και οι φίλοι σου μπορούν να σε ακολουθήσουν.';
  return build(e, {
    subject: name ? `Καλώς ήρθες στο ρόστερ, ${name}!` : 'Καλώς ήρθες στο ρόστερ!',
    preheader: 'Το προφίλ σου είναι έτοιμο.',
    hero: { kicker: 'ΝΕΟΣ ΣΤΟ ΡΟΣΤΕΡ', title: esc(name ? `Καλώς ήρθες, ${name}!` : 'Καλώς ήρθες!'), sub: 'Το προφίλ σου είναι έτοιμο.', art: 'wave' },
    body: [block.paragraph(esc(line)), block.button(OPEN_URL, 'Δες την κάρτα σου')],
    text: [line, '', `Δες την κάρτα σου: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή ζήτησες προφίλ παίκτη στο NetProphet.',
  });
}

export function newPlayerNoEmail(e: DueEmail): Mail {
  const player = playerName(e);
  const steps: [string, string][] = [
    ['Ψάξε', player ? `«${player}» στο NetProphet.` : 'το όνομά σου στο NetProphet.'],
    ['Πάτα', '«Εγώ είμαι».'],
  ];
  const more = 'Δεν το βρίσκεις; Απάντησε σε αυτό το email και το βρίσκουμε μαζί.';
  return build(e, {
    subject: 'Μάλλον είσαι ήδη στο ρόστερ',
    preheader: 'Ψάξε το όνομά σου και πάτα «Εγώ είμαι».',
    hero: { title: 'Μάλλον είσαι ήδη εδώ', sub: 'Δεν φτιάξαμε νέο προφίλ, γιατί βρήκαμε ένα σαν το δικό σου.', art: 'think' },
    body: [block.steps(steps), block.note(esc(more))],
    text: [...steps.map(([a, b], i) => `${i + 1}. ${a} ${b}`), '', more],
    why: 'Πήρες αυτό το email επειδή ζήτησες προφίλ παίκτη στο NetProphet.',
  });
}

export function deletedEmail(e: DueEmail): Mail {
  const a = 'Σβήσαμε τον λογαριασμό σου στο NetProphet. Τι ακριβώς σβήσαμε, δες στο παρακάτω link:';
  const link = `${SITE_URL}/delete-account`;
  const b = 'Είχες Pro; Η συνδρομή ακυρώνεται από το App Store ή το Google Play, όχι από εμάς. Αν αλλάξεις γνώμη, η πόρτα μένει ανοιχτή.';
  return build(e, {
    subject: 'Ο λογαριασμός σου διαγράφηκε',
    preheader: 'Όπως ζήτησες.',
    hero: { title: 'Ο λογαριασμός σου διαγράφηκε', sub: 'Όπως ζήτησες.', art: 'bye' },
    body: [block.paragraph(esc(a)), block.paragraph(block.link(link, 'Τι σβήνεται όταν διαγράφεις τον λογαριασμό σου ›')), block.note(esc(b))],
    text: [a, link, '', b],
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
