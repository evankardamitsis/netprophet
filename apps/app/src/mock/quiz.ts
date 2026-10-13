import type { AnswerCardResult, GetQuizResult, QuizCard, QuizPlayer } from '@netprophet/db';

/**
 * «Οι 6 της ημέρας» for mock mode and the dev guest: the prototype's day-0 cards (qs6), in the shape the server
 * sends, with the prototype's fixed percentages as the split after answering. The prototype's «Η ώρα της αλήθειας»
 * card (a result teaser) is a plain two-name vote here. Answers live in memory for the session; the sixth pays +30.
 */
const pl = (id: string, first_name: string, surname: string, gender: 'm' | 'f'): QuizPlayer => ({ id, first_name, surname, gender });

const nikos = pl('mock-nikos', 'Νίκος', 'Ροδίτης', 'm');
const dimitris = pl('mock-dimitris', 'Δημήτρης', 'Γκότσης', 'm');
const ilias = pl('mock-ilias', 'Ηλίας', 'Μέμμος', 'm');
const giorgosD = pl('mock-giorgos-d', 'Γιώργος', 'Δεσύπρης', 'm');
const giorgosM = pl('mock-giorgos-m', 'Γιώργος', 'Μέμμος', 'm');
const maria = pl('mock-maria', 'Μαρία', 'Καρρά', 'f');
const ioanna = pl('mock-ioanna', 'Ιωάννα', 'Τσάκου', 'f');
const anna = pl('mock-anna', 'Άννα', 'Μάνου', 'f');

const labels = (...l: string[]) => l.map((label) => ({ label }));

const CARDS: Omit<QuizCard, 'my_option' | 'split'>[] = [
  { id: 'mock-card-1', position: 1, family: 's', content: { tag: 'Σενάριο · μονό', q: 'Κλειστό ματς, τρίτο σετ. Ποιος το παίρνει;', options: labels('{p1}', '{p2}'), players: [nikos, dimitris] } },
  { id: 'mock-card-2', position: 2, family: 's', content: { tag: 'Κυριακή · μικτό', q: 'Παίζουν την Κυριακή στη Γλυφάδα. Ποιο ζευγάρι το παίρνει;', options: labels('Μαρία & Νίκος', 'Άννα & Γιώργος'), players: [] } },
  { id: 'mock-card-3', position: 3, family: 's', content: { tag: 'Η ώρα της αλήθειας', q: 'Έπαιξαν την Πέμπτη. Ποιος νίκησε;', options: labels('{p1}', '{p2}'), players: [nikos, ilias] } },
  { id: 'mock-card-4', position: 4, family: 'c', content: { tag: 'Διάλεξε έναν', q: 'Tie-break στο 6-6. Ποιον δεν θες απέναντι;', options: labels('{p1}', '{p2}', '{p3}', '{p4}'), players: [giorgosD, ilias, giorgosM, dimitris] } },
  {
    id: 'mock-card-5',
    position: 5,
    family: 'q',
    content: {
      tag: 'Ποια είναι;',
      q: 'Τρία στοιχεία, μία παίκτρια.',
      clues: ['Παίζει στη Βούλα', 'Level 5 και ανεβαίνει', '4 νίκες στα 5 τελευταία'],
      options: labels('{p1}', '{p2}', '{p3}'),
      right: 1,
      players: [maria, ioanna, anna],
    },
  },
  { id: 'mock-card-6', position: 6, family: 'o', content: { tag: 'Άποψη', q: 'Μια καλή λόμπα κερδίζει ένα καλό smash.', options: labels('Συμφωνώ', 'Με τίποτα'), players: [] } },
];

const SPLITS: Record<string, number[]> = {
  'mock-card-1': [58, 42],
  'mock-card-2': [55, 45],
  'mock-card-3': [62, 38],
  'mock-card-4': [41, 27, 19, 13],
  'mock-card-6': [46, 54],
};

function fresh(): GetQuizResult {
  return {
    quiz_day: '2026-10-13',
    required: 6,
    pro: false,
    awarded: false,
    next_at: '2026-10-14T06:00:00Z',
    answered: 0,
    cards: CARDS.map((c) => ({ ...c, my_option: null, split: null })),
  };
}

let state = fresh();

export function mockQuiz(): GetQuizResult {
  return state;
}

export function mockAnswer(cardId: string, option: number): AnswerCardResult {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card || card.my_option !== null) return { option, right: null, split: null, answered: state.answered, awarded: 0 };
  const answered = state.answered + 1;
  const pays = answered >= state.required && !state.awarded;
  const split = SPLITS[cardId] ?? null;
  state = {
    ...state,
    answered,
    awarded: state.awarded || pays,
    cards: state.cards.map((c) => (c.id === cardId ? { ...c, my_option: option, split } : c)),
  };
  return { option, right: card.content.right ?? null, split, answered, awarded: pays ? 30 : 0 };
}

/** dev only: play the day again */
export function resetMockQuiz() {
  state = fresh();
}
