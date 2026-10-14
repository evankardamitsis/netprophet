import { describe, expect, it } from 'vitest';
import type { PlayerProfile } from '@netprophet/db';
import { getCopy } from '@netprophet/copy';
import { myMatchOf } from './myMatch';
import { splitToday } from './feed';

const t = getCopy('el');
// 14 Oct 2026, 12:00 Athens
const now = new Date('2026-10-14T09:00:00Z');
const opp = { id: 'o', first_name: 'Γιάννης', surname: 'Πράτσας', gender: 'm', name_forms: {} } as unknown as PlayerProfile['last_matches'][number]['opponents'][number];
const player = (startsAt: string | null) =>
  ({ next_match: startsAt ? { match_id: 'm1', starts_at: startsAt, format: 'singles', partner: [], opponents: [opp] } : null }) as unknown as PlayerProfile;

describe('«Το ματς σου» on Σήμερα', () => {
  it('shows your match today, with the time and the opponent', () => {
    const v = myMatchOf(player('2026-10-14T17:37:00Z'), t, now);
    expect(v?.matchId).toBe('m1');
    expect(v?.today).toBe(true);
    expect(v?.line.startsWith('Σήμερα 20:37 με')).toBe(true);
  });
  it('shows tomorrow too, and nothing later or without a match', () => {
    expect(myMatchOf(player('2026-10-15T07:00:00Z'), t, now)?.today).toBe(false);
    expect(myMatchOf(player('2026-10-17T07:00:00Z'), t, now)).toBeNull();
    expect(myMatchOf(player(null), t, now)).toBeNull();
    expect(myMatchOf(null, t, now)).toBeNull();
  });
});

describe('splitToday', () => {
  it('keeps today in order and folds the later days', () => {
    const cards = [
      { kind: 'match', id: 'a' },
      { kind: 'match', id: 'b', later: true },
      { kind: 'sponsored', id: 's' },
      { kind: 'match', id: 'c', later: true },
    ];
    const s = splitToday(cards);
    expect(s.today.map((c) => c.id)).toEqual(['a', 's']);
    expect(s.later.map((c) => c.id)).toEqual(['b', 'c']);
  });
});
