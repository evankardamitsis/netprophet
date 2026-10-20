import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { FeedPlayer, ResultRow } from '@netprophet/db';
import { dayLabel, eventLabel, eventParts, groupResults, toResultItem } from './results';

const t = getCopy('el');
// Saturday 10 Oct 2026, 15:00 Athens (UTC+3)
const NOW = new Date('2026-10-10T12:00:00Z');

const P = (first: string, surname: string): FeedPlayer => ({
  id: `${first}-${surname}`,
  first_name: first,
  surname,
  photo_path: null,
  area_id: null,
  level_tier: null,
  level_direction: null,
});

const row = (over: Partial<ResultRow> = {}): ResultRow => ({
  match_id: 'm1',
  sport_id: 'tennis',
  format: 'singles',
  starts_at: '2026-10-09T16:00:00Z',
  round: 'quarter',
  venue: null,
  area_id: null,
  tournament: 'Open Γλυφάδας',
  sides: [
    { side: 1, players: [P('Ηλίας', 'Μέμμος')] },
    { side: 2, players: [P('Γιάννης', 'Πράτσας')] },
  ],
  winner_side: 1,
  sets: [{ w: 4, l: 6 }, { w: 6, l: 3 }, { w: 7, l: 5 }],
  retired: false,
  walkover: false,
  split: { side1: 9, side2: 20, total: 29 },
  upset: true,
  my: { pick: 1, outcome: 'correct', points: 30 },
  ...over,
});

describe('dayLabel (Athens days)', () => {
  it('today, yesterday, the day before, a weekday, then a date', () => {
    expect(dayLabel('2026-10-10T08:00:00Z', NOW, t)).toBe('Σήμερα');
    expect(dayLabel('2026-10-09T16:00:00Z', NOW, t)).toBe('Χθες');
    expect(dayLabel('2026-10-08T16:00:00Z', NOW, t)).toBe('Προχθές');
    expect(dayLabel('2026-10-04T16:00:00Z', NOW, t)).toBe('Την Κυριακή');
    expect(dayLabel('2026-09-30T16:00:00Z', NOW, t)).toBe('30/9');
  });
  it('a match at 01:00 Athens belongs to that Athens day, not the UTC one', () => {
    // 9 Oct 22:30 UTC is 10 Oct 01:30 in Athens: today
    expect(dayLabel('2026-10-09T22:30:00Z', NOW, t)).toBe('Σήμερα');
  });
});

describe('eventLabel', () => {
  it('tournament and the plural round', () => {
    expect(eventLabel(row(), t)).toBe('Open Γλυφάδας · Προημιτελικά');
  });
  it('friendlies, doubles say so', () => {
    expect(eventLabel(row({ tournament: null, round: null }), t)).toBe('Φιλικά');
    expect(eventLabel(row({ tournament: null, round: null, format: 'doubles' }), t)).toBe('Φιλικά · Διπλό');
  });
});

describe('toResultItem', () => {
  it('an upset the viewer called', () => {
    const it1 = toResultItem(row(), t);
    expect(it1.upset).toBe(true);
    expect(it1.tag).toBe('ΑΝΑΤΡΟΠΗ');
    expect(it1.line).toBe('Το 69% έλεγε Πράτσας');
    expect(it1.calledIt).toBe('Το ’πες · +30');
    expect([it1.winnerSets, it1.loserSets]).toEqual(['2', '1']);
    expect(it1.score).toBe('4-6, 6-3, 7-5');
    expect(it1.winner[0]).toEqual({ first: 'Ηλίας', surname: 'Μέμμος' });
  });
  it('reactions and «Πες κάτι στον …»', () => {
    const r = { options: [{ key: 'bravo', label: 'Μπράβο' }, { key: 'rematch', label: 'Ρεβάνς' }], counts: { bravo: 2 }, mine: null };
    const it0 = toResultItem(row({ reactions: r, kudo_to: { player_id: 'p', first_name: 'Νίκος', gender: null } }), t);
    expect(it0.reactions).toEqual(r);
    expect(it0.thank).toMatchObject({ label: 'Πες κάτι στον Νίκο ›', playerId: 'p' });
    const none = toResultItem(row({ reactions: { options: [], counts: {}, mine: null }, kudo_to: null }), t);
    expect(none.reactions).toBeNull();
    expect(none.thank).toBeNull();
  });
  it('your own result staff have not checked: «ΣΕ ΕΛΕΓΧΟ», nothing to react to yet', () => {
    const r = { options: [{ key: 'bravo', label: 'Μπράβο' }], counts: {}, mine: null };
    const it0 = toResultItem(row({ review: 'pending', reactions: r, kudo_to: { player_id: 'p', first_name: 'Νίκος', gender: null } }), t);
    expect(it0.review).toBe('ΣΕ ΕΛΕΓΧΟ');
    expect(it0.reactions).toBeNull();
    expect(it0.thank).toBeNull();
    expect(toResultItem(row({ review: 'approved' }), t).review).toBeNull();
  });
  it('no votes, no line; a wrong call, no pill', () => {
    const it2 = toResultItem(row({ split: null, upset: false, my: { pick: 2, outcome: 'wrong', points: 0 } }), t);
    expect(it2.line).toBeNull();
    expect(it2.calledIt).toBeNull();
    expect(it2.tag).toBeNull();
  });
  it('doubles name both surnames; a walkover has no set numbers', () => {
    const it3 = toResultItem(
      row({
        format: 'doubles',
        sides: [
          { side: 1, players: [P('Γιώργος', 'Δεσύπρης'), P('Ηλίας', 'Μέμμος')] },
          { side: 2, players: [P('Γιώργος', 'Μέμμος'), P('Γιώργος', 'Χαμάμης')] },
        ],
        split: { side1: 7, side2: 5, total: 12 },
        walkover: true,
        sets: [],
      }),
      t,
    );
    expect(it3.line).toBe('Το 58% έλεγε Δεσύπρης & Μέμμος');
    expect(it3.score).toBe('w/o');
    expect(it3.winnerSets).toBe('');
  });
});

describe('groupResults', () => {
  it('groups by Athens day and event, keeping the order', () => {
    const groups = groupResults(
      [
        row({ match_id: 'a' }),
        row({ match_id: 'b' }),
        row({ match_id: 'c', tournament: null, round: null }),
        row({ match_id: 'd', starts_at: '2026-10-08T16:00:00Z' }),
      ],
      t,
      NOW,
    );
    expect(groups.map((g) => [g.day, g.firstOfDay, g.title, g.items.map((i) => i.id)])).toEqual([
      ['ΧΘΕΣ', true, 'Open Γλυφάδας', ['a', 'b']],
      ['ΧΘΕΣ', false, 'Φιλικά', ['c']],
      ['ΠΡΟΧΘΕΣ', true, 'Open Γλυφάδας', ['d']],
    ]);
    expect(groups[0]!.detail).toContain('Προημιτελικά');
    expect(groups[1]!.detail).toBeNull();
    // a tournament shows its logo (or its letter); friendlies show none
    expect(groups[0]!.logo).toEqual({ path: null });
    expect(groups[1]!.logo).toBeNull();
  });

  it('carries the tournament logo', () => {
    const [g] = groupResults([row({ match_id: 'a', tournament_logo: 'tournaments/t/k1.webp' })], t, NOW);
    expect(g!.logo).toEqual({ path: 'tournaments/t/k1.webp' });
  });
});

describe('eventParts category case', () => {
  it('shows organiser capitals in normal case, acronyms as they are', () => {
    const base = { tournament: 'Open Γλυφάδας', round: null, format: 'singles' as const, discipline: 'singles' };
    expect(eventParts({ ...base, level: 'MEDIUM' } as never, t).detail).toMatch(/^Medium/);
    expect(eventParts({ ...base, level: 'ITF' } as never, t).detail).toMatch(/^ITF/);
  });
});
