import { describe, expect, it } from 'vitest';
import { sourceKind } from './sheets';

describe('sourceKind', () => {
  it('an organiser site is a site, anything else a sheet', () => {
    expect(sourceKind('https://www.athenstennis.gr/el/schedule')).toBe('site');
    expect(sourceKind('https://itfmasters.tournamentsoftware.com/tournament/68cb54ac-6b10-4c39-905b-9b38cdaa4dd2/Matches')).toBe('site');
    expect(sourceKind('https://docs.google.com/spreadsheets/d/abc/edit')).toBe('sheet');
  });
});
