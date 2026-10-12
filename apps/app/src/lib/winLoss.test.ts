import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { winLossRows } from './winLoss';

const t = getCopy('el');

describe('winLossRows', () => {
  it('two strengths above your rate, two weaknesses below, each with enough matches', () => {
    const rows = winLossRows(
      {
        total: { w: 12, l: 8 },
        rows: [
          { key: 'morning', w: 7, l: 3 },
          { key: 'evening', w: 3, l: 5 },
          { key: 'deciding', w: 5, l: 1 },
          { key: 'lefties', w: 2, l: 5 },
          { key: 'tiebreaks', w: 2, l: 0 },
          { key: 'singles', w: 9, l: 6 },
        ],
      },
      t,
    );
    expect(rows.map((r) => `${r.label} ${r.value}`)).toEqual([
      'Στο τρίτο σετ ↑ 5-1',
      'Πρωινά ματς ↑ 7-3',
      'Με αριστερόχειρες ↓ 2-5',
      'Βραδινά ματς ↓ 3-5',
    ]);
  });

  it('nothing without results', () => {
    expect(winLossRows({ total: null, rows: [] }, t)).toEqual([]);
    expect(winLossRows({ total: { w: 0, l: 0 }, rows: [] }, t)).toEqual([]);
  });
});
