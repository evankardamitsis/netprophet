import { describe, expect, it } from 'vitest';
import { morningEmail, type Digest } from './morningEmail';

const base: Digest = {
  date: '2026-10-16',
  recipients: [],
  decisions: { people: 0, walkovers: 0, score_conflicts: 0 },
  results_for_you: 0,
  overdue: [],
  sheet_problems: [],
  postponed: 0,
  today: [],
  last_runs: 3,
};

describe('the morning email', () => {
  it('asks for the surface of a club that has none, with its matches and where it plays', () => {
    const e = morningEmail({ ...base, clubs_no_surface: [{ club: 'PRC', matches: 12, tournaments: ['Athens Tennis'] }] });
    expect(e.subject).toBe('NetProphet: 1 thing needs you today');
    expect(e.text).toContain('PRC has no surface yet (12 matches, Athens Tennis). Until you set it, its matches use the tournament’s surface.');
  });
  it('stays quiet when every club has its surface', () => {
    expect(morningEmail({ ...base, clubs_no_surface: [] }).subject).toBe('NetProphet: all quiet this morning');
  });
});
