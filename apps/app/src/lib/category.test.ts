import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { categoryLabel } from './category';
import { fromFeedCard } from './feed';
import { eventLabel } from './results';

const t = getCopy('el');

describe('the category on the players matches', () => {
  it('reads the event and the discipline, or nothing outside an event', () => {
    expect(categoryLabel('Μ 40+', 'MS', t)).toBe('Μ 40+ · Απλό');
    expect(categoryLabel('Μ 40+', null, t)).toBe('Μ 40+');
    expect(categoryLabel(null, null, t)).toBeNull();
  });
  it('follows the tournament on a feed card; in doubles the discipline names the format', () => {
    const base = {
      kind: 'match' as const, match_id: 'm', starts_at: null, venue: null, round: null, status: 'scheduled',
      tournament: { id: 't', name: 'Open Γλυφάδας' }, sides: [], in_circle: false, my_vote: null, split: null,
    };
    expect(fromFeedCard({ ...base, format: 'singles', level: 'Μ 40+', discipline: 'MS' }, {}, t).meta).toBe('Open Γλυφάδας · Μ 40+');
    expect(fromFeedCard({ ...base, format: 'doubles', level: 'Γ Open', discipline: 'WD' }, {}, t).meta).toBe('Διπλό γυναικών · Open Γλυφάδας · Γ Open');
  });
  it('sits between the tournament and the round on a result', () => {
    expect(eventLabel({ tournament: 'Open Γλυφάδας', round: null, format: 'singles', level: 'Μ 40+', discipline: 'MS' }, t)).toBe('Open Γλυφάδας · Μ 40+ · Απλό');
  });
});
