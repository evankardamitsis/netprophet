import type { Copy } from './types';

export const en: Copy = {
  common: {
    continue: 'Continue',
    back: 'Back',
  },
  streak: {
    label: 'streak',
  },
  level: {
    label: 'level',
  },
  ladder: {
    title: 'Ladder',
  },
  tabs: {
    vote: 'Vote',
    results: 'Results',
    players: 'Players',
    ladder: 'Ladder',
    me: 'Me',
  },
  header: {
    points: 'points',
  },
  match: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    levelArea: 'level {level} · {area}',
    learnTonight: 'You find out tonight',
    learnTomorrow: 'You find out tomorrow',
    learnAfter: 'You find out after the match',
    rounds: {
      round16: 'Second round',
      quarter: 'Quarterfinal',
      semi: 'Semifinal',
      final: 'Final',
    },
  },
  addMatch: {
    cta: '+ Match',
    title: 'Got a match?',
    soon: 'Coming soon.',
  },
  auth: {
    title: 'Get in the game',
    emailLabel: 'Your email',
    emailPlaceholder: 'you@email.com',
    sendCode: 'Send me a code',
    or: 'or',
    google: 'Continue with Google',
    codeTitle: 'Check your email',
    codeSent: 'We sent a 6-digit code to {email}.',
    codeLabel: 'Code',
    verify: 'Let me in',
    resend: 'Send it again',
    changeEmail: 'Different email',
    signOut: 'Sign out',
    errors: {
      invalidEmail: 'That does not look like an email.',
      badCode: 'Wrong or expired code. Try again.',
      tooMany: 'Too many tries. Give it a minute.',
      generic: 'Something went wrong. Try again.',
    },
  },
  feed: {
    empty: 'No matches to vote on right now. Come back later.',
    error: 'Could not load. Pull down to try again.',
    voteFailed: 'Your vote did not go through. Try again.',
    votingClosed: 'Voting has closed.',
  },
  placeholder: {
    results: 'Results will show up here.',
    players: 'Players will show up here.',
    ladder: 'The Ladder opens soon.',
    me: 'Your profile will show up here.',
  },
};
