// TODO(core): replace with the domain types from @netprophet/core once they land.
import type { FeedPlayer, FeedPostponedCard } from '@netprophet/db';
import type { Side } from '../lib/votes';

export interface MockPlayer {
  firstName: string;
  surname: string;
  level: number;
  area: string;
}

export interface MockMatch {
  id: string;
  day: 'today' | 'tomorrow';
  time: string;
  event: string;
  round?: 'round16' | 'quarter' | 'semi' | 'final';
  a: MockPlayer;
  b: MockPlayer;
  /** doubles partners */
  a2?: MockPlayer;
  b2?: MockPlayer;
  /** moved to this day from three days ago: shows «Νέα μέρα» */
  movedBack?: boolean;
  /** Votes already cast, before the viewer's. */
  votes: Record<Side, number>;
  /** where it is played */
  club?: string;
  surface?: string;
}

export const MOCK_MATCHES: MockMatch[] = [
  {
    id: 'm1',
    club: 'Γήπεδα Γλυφάδας',
    surface: 'clay',
    day: 'today',
    time: '18:00',
    event: 'Open Γλυφάδας',
    round: 'semi',
    a: { firstName: 'Νίκος', surname: 'Πράτσας', level: 4, area: 'Γλυφάδα' },
    b: { firstName: 'Γιώργος', surname: 'Κωνσταντινίδης', level: 4, area: 'Βούλα' },
    votes: { a: 69, b: 31 },
  },
  {
    id: 'm2',
    day: 'today',
    time: '20:00',
    event: 'Open Γλυφάδας',
    round: 'semi',
    a: { firstName: 'Δημήτρης', surname: 'Αλεξίου', level: 5, area: 'Αθήνα' },
    b: { firstName: 'Στέφανος', surname: 'Παπαδάκης', level: 5, area: 'Μαρούσι' },
    votes: { a: 22, b: 41 },
  },
  {
    id: 'm3',
    day: 'tomorrow',
    movedBack: true,
    time: '10:30',
    event: 'Κύπελλο Βορείων',
    round: 'quarter',
    a: { firstName: 'Μιχάλης', surname: 'Βλάχος', level: 3, area: 'Κηφισιά' },
    b: { firstName: 'Αντώνης', surname: 'Σιμιτζής', level: 3, area: 'Χαλάνδρι' },
    votes: { a: 12, b: 12 },
  },
  {
    id: 'm3d',
    day: 'tomorrow',
    time: '12:00',
    event: 'Φιλικό',
    a: { firstName: 'Γιάννης', surname: 'Καραγιάννης', level: 5, area: 'Κηφισιά' },
    a2: { firstName: 'Πέτρος', surname: 'Δημόπουλος', level: 4, area: 'Μαρούσι' },
    b: { firstName: 'Άκης', surname: 'Ρόκας', level: 5, area: 'Χαλάνδρι' },
    b2: { firstName: 'Σπύρος', surname: 'Παπαθανασίου', level: 5, area: 'Κηφισιά' },
    votes: { a: 9, b: 14 },
  },
  {
    id: 'm4',
    day: 'tomorrow',
    time: '17:00',
    event: 'Φιλικό',
    a: { firstName: 'Ελένη', surname: 'Μαυρομάτη', level: 6, area: 'Βάρη' },
    b: { firstName: 'Μαρία', surname: 'Οικονόμου', level: 6, area: 'Γλυφάδα' },
    votes: { a: 5, b: 18 },
  },
  {
    id: 'm5',
    day: 'tomorrow',
    time: '19:30',
    event: 'Master Αττικής',
    round: 'final',
    a: { firstName: 'Θάνος', surname: 'Ιωαννίδης', level: 7, area: 'Πειραιάς' },
    b: { firstName: 'Κώστας', surname: 'Λαμπρινός', level: 7, area: 'Νέα Σμύρνη' },
    votes: { a: 140, b: 97 },
  },
];

/** One put-off match for the guest feed: it was on yesterday at 18:30 and has no new day yet. */
export function mockPostponed(now: Date = new Date()): FeedPostponedCard {
  const p = (id: string, first_name: string, surname: string): FeedPlayer => ({
    id, first_name, surname, photo_path: null, area_id: null, level_tier: 4, level_direction: null,
  });
  return {
    kind: 'postponed',
    match_id: 'mock-postponed',
    format: 'singles',
    starts_at: new Date(now.getTime() - 86_400_000).toISOString(),
    tournament: { id: 'tour-open', name: 'Open Γλυφάδας' },
    sides: [
      { side: 1, players: [p('mp1', 'Νίκος', 'Ροδίτης')] },
      { side: 2, players: [p('mp2', 'Γιώργος', 'Δεσύπρης')] },
    ],
    my_vote: 1,
  };
}
