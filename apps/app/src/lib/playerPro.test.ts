import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { mockPlayerProTeaser, teaserRows, teaserTitle } from './playerPro';

describe('player card, Pro teaser', () => {
  it('lists what there is to see, with the counts', () => {
    const rows = teaserRows(mockPlayerProTeaser(), true, getCopy('el'));
    expect(rows.map((r) => [r.label, r.count])).toEqual([
      ['Όλα τα ματς', '23 ματς'],
      ['Μεταξύ σας', '3 ματς'],
      ['Χώμα', '14 ματς'],
      ['Σκληρό', '9 ματς'],
      ['Στο τρίτο σετ', '6 ματς'],
      ['Με tie-break', '8 ματς'],
    ]);
  });

  it('leaves out between you without a player of your own, and empty rows', () => {
    const rows = teaserRows({ matches: 1, meetings: 2, surfaces: [], deciding: 0, tiebreaks: 0 }, false, getCopy('el'));
    expect(rows).toEqual([{ key: 'all', label: 'Όλα τα ματς', count: '1 ματς' }]);
  });

  it('names the player in the accusative', () => {
    expect(teaserTitle('Γιώργος', 'm', getCopy('el'))).toBe('Όλα για τον Γιώργο');
    expect(teaserTitle('Μαρία', null, getCopy('el'))).toBe('Όλα για την Μαρία');
  });
});
