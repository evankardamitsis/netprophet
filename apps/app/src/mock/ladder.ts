import type { Ladder, LadderRow, LadderScope } from '@netprophet/db';

/**
 * Sample Κατάταξη for mock mode and the dev guest. You have 340 this month (the header's sample), a σερί of 5,
 * Γιώργος Μέμμος is 20 points ahead (the prototype's line), one vote waits for a result.
 */
const ME = 'me';
const MY_POINTS = 340;

const FRIENDS: [string, string, number][] = [
  ['Μαρία', 'Καρρά', 610],
  ['Νίκος', 'Ροδίτης', 480],
  ['Γιώργος', 'Μέμμος', 360],
  ['Δημήτρης', 'Γκότσης', 290],
  ['Κατερίνα', 'Λαζάρου', 150],
  ['Γιώργος', 'Δεσύπρης', 0],
];

const OTHERS: [string, string, number][] = [
  ['Ελένη', 'Παπαδοπούλου', 920],
  ['Στέφανος', 'Βλάχος', 870],
  ['Άννα', 'Κωνσταντινίδη', 790],
  ['Πέτρος', 'Αλεξίου', 700],
  ['Σοφία', 'Μαυρίδου', 650],
  ['Αλέξανδρος', 'Σιμιτζής', 520],
  ['Χρήστος', 'Πράτσας', 410],
  ['Ιωάννα', 'Δημητρίου', 330],
  ['Θοδωρής', 'Νικολάου', 210],
  ['Βασίλης', 'Κουτσός', 120],
  ['Μαρίνα', 'Ζαχαρίου', 60],
];

function daysLeft(now: Date): number {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export function mockLadder(scope: LadderScope, now: Date = new Date()): Ladder {
  const pool = scope === 'friends' ? FRIENDS : FRIENDS.concat(OTHERS).filter(([, , p]) => p > 0);
  const people = pool
    .map(([first, surname, points], i) => ({ id: `${scope}-${i}`, first, surname, points }))
    .concat([{ id: ME, first: 'Βαγγέλης', surname: 'Καρδαμίτσης', points: MY_POINTS }])
    .sort((a, b) => b.points - a.points);
  const rows: LadderRow[] = people.map((p, i) => ({
    position: i + 1,
    user_id: p.id,
    first_name: p.first,
    surname: p.surname,
    display_name: `${p.first} ${p.surname}`,
    points: p.points,
    last_point_at: null,
    is_me: p.id === ME,
  }));
  const meIdx = rows.findIndex((r) => r.is_me);
  const me = rows[meIdx]!;
  const above = rows[meIdx - 1];
  return {
    scope,
    month_key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    days_left: daysLeft(now),
    total: rows.length,
    rows: rows.filter((r) => r.position <= 20 || r.is_me),
    me: {
      position: me.position,
      points: me.points,
      to_next: above ? above.points - me.points + 1 : null,
      above: above ? { first_name: above.first_name, surname: above.surname, display_name: above.display_name } : null,
    },
    streak: 5,
    pending: 10,
    open_votes: 3,
  };
}
