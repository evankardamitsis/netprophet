import { describe, expect, it } from 'vitest';
import { isOpenSpot, parseDraw, parseSheet, parseSheetSide } from './index';

/** test vectors: [as written, an open spot] */
const SPOTS: [string, boolean][] = [
  ['ΠΡΟΚΡΙΜΑΤΙΚΑ 1', true],
  ['Προκριματικά 2', true],
  ['ΠΡΟΚΡΙΜΑΤΙΚΑ 1 ΔΕΥ 21.30', true],
  ['ΠΡΟΚΡΙΜΑΤΙΚΟΣ 3', true],
  ['Q1', true],
  ['Q 2', true],
  ['QUALIFIER 4', true],
  ['LL', true],
  ['Lucky Loser', true],
  ['ΝΙΚΗΤΗΣ ΑΓΩΝΑ 3', true],
  ['TBD', true],
  ['ΔΙΑΜΑΝΤΟΠΟΥΛΟΥ LL', false],
  ['Παπαδόπουλος Γιώργος', false],
  ['QUINN JOHN', false],
  ['Qualls Mary', false],
  ['ΛΛΑΜΑ Νίκος', false],
  ['', false],
];

describe('open spots (qualifier, lucky loser, winner of a match)', () => {
  it.each(SPOTS)('%s', (raw, spot) => expect(isOpenSpot(raw)).toBe(spot));

  it('an open spot is no one: no people, flagged', () => {
    expect(parseSheetSide('ΠΡΟΚΡΙΜΑΤΙΚΑ 1')).toEqual({ people: [], flags: ['open_spot'], pair: false });
    expect(parseSheetSide('ΔΙΑΜΑΝΤΟΠΟΥΛΟΥ LL').people).toHaveLength(1);
  });

  it('a draw keeps the spot as written but links no one to it', () => {
    const rows = [
      ['', '', '', '', 'WS MEDIUM MAIN DRAW (4)'],
      ['1', '', '1', '', 'ΠΑΠΑΔΟΠΟΥΛΟΥ ΜΑΡΙΑ'],
      ['2', '', '', '', 'ΠΡΟΚΡΙΜΑΤΙΚΑ 1'],
      ['3', '', '', '', 'ΓΕΩΡΓΙΟΥ ΕΛΕΝΗ'],
      ['4', '', '', '', 'ΠΡΟΚΡΙΜΑΤΙΚΑ 2'],
    ];
    const d = parseDraw({ name: 'WS MEDIUM', rows }, 2026);
    expect(d.entrants[1]).toMatchObject({ pos: 2, raw: 'ΠΡΟΚΡΙΜΑΤΙΚΑ 1', people: [], bye: false });
    expect(d.entrants[3]!.people).toEqual([]);
    expect(d.entrants[0]!.people).toHaveLength(1);
  });

  it('a schedule row against a qualifier spot waits until the name is written', () => {
    const tab = (p2: string) => ({
      name: 'ΔΕΥ 13/10',
      rows: [
        ['ΩΡΑ', 'ΚΑΤΗΓΟΡΙΑ', 'PLAYER 1', 'PLAYER 2', 'ΑΠΟΤΕΛΕΣΜΑ'],
        ['21.30', 'WS MEDIUM', 'ΠΑΠΑΔΟΠΟΥΛΟΥ ΜΑΡΙΑ', p2, ''],
      ],
    });
    expect(parseSheet([tab('ΠΡΟΚΡΙΜΑΤΙΚΑ 1')], 2026)).toHaveLength(0);
    expect(parseSheet([tab('ΓΕΩΡΓΙΟΥ ΕΛΕΝΗ')], 2026)).toHaveLength(1);
  });
});
