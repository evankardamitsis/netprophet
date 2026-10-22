import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { mockScout } from '../mock/scout';
import { record, sideScore, toScoutView } from './scout';

const t = getCopy('el');
// Thursday 22 Oct 2026, 15:00 Athens
const NOW = new Date('2026-10-22T12:00:00Z');

describe('toScoutView', () => {
  it('turns the results into lines', () => {
    const v = toScoutView(mockScout('m', NOW)!.opponents[0]!, { glyfada: 'Γλυφάδα' }, t, NOW);
    expect(v.sub).toBe('Γλυφάδα · αριστερό χέρι');
    expect(v.year).toBe('Φέτος 11-4');
    // the last meeting from my side, with its games
    expect(v.h2h.record).toBe('1-2');
    expect(v.h2h.line).toBe('Την τελευταία φορά έχασες 4-6, 6-3, 7-10.');
    expect(v.common[0]).toEqual({ id: 'nik', name: 'Νίκος Ροδίτης', me: '2-1', them: '0-2' });
  });

  it('a first meeting and empty records', () => {
    const p = { ...mockScout('m', NOW).opponents[0]!, h2h: { w: 0, l: 0, last: null, meetings: [] }, deciding: { w: 0, l: 0 } };
    const v = toScoutView(p, {}, t, NOW);
    expect(v.h2h.record).toBeNull();
    expect(v.h2h.line).toBe('Πρώτη φορά απέναντι.');
    expect(v.h2h.meetings).toEqual([]);
    expect(v.deciding).toBe('Τίποτα ακόμα');
    expect(record({ w: 3, l: 0 }, t)).toBe('3-0');
  });
});

describe('the scout shows more than the free card', () => {
  const v = toScoutView(mockScout('m', NOW).opponents[0]!, {}, t, NOW);

  it('the last ten, every meeting, from my side', () => {
    expect(v.form).toHaveLength(10);
    expect(v.h2h.count).toBe('3 ματς μεταξύ σας');
    expect(v.h2h.meetings.map((m) => [m.won, m.score])).toEqual([
      [false, '4-6, 6-3, 7-10'],
      [true, '7-6(4), 6-2'],
      [false, '0-2'],
    ]);
  });

  it('singles and doubles, the one they play most first, in the stats blocks said about them', () => {
    expect(v.formats.map((f) => f.format)).toEqual(['singles', 'doubles']);
    expect(v.formats[0]!.label).toBe('Μονά · 22');
    expect(v.formats[0]!.record).toBe('16-6');
    expect(v.formats[0]!.blocks.length).toBeGreaterThan(3);
    const titles = v.formats[0]!.blocks.map((b) => b.title);
    expect(titles).not.toContain('Η χρονιά σου');
    const doubles = v.formats[1]!.blocks.find((b) => b.key === 'partners');
    expect(doubles && 'note' in doubles ? doubles.note : null).toBe('Με ποιον παίζει και πώς τα πάνε μαζί.');
  });

  it('every match: their side, partner in the accusative, day, tournament, category and round', () => {
    expect(v.history[0]).toEqual({
      key: 'mock-h0',
      won: true,
      score: '6-3, 6-4',
      against: 'Κώστας Λιάπης',
      partner: null,
      meta: expect.any(String),
    });
    expect(v.history[0]!.meta).toContain('Open Γλυφάδας · Μ 40+ · Απλό · Προημιτελικός');
    expect(v.history[2]!.score).toBe('0-2');
    expect(v.history[3]!.partner).toBe('με Πέτρο Δρόσο');
    expect(v.historyCap).toBe('Τα 4 πιο πρόσφατα από 28.');
  });

  it('this tournament so far and how they play', () => {
    expect(v.path.map((m) => m.meta.split(' · ')[0])).toEqual(['Δεύτερος γύρος', 'Προημιτελικός']);
    expect(v.traits[0]).toEqual({ id: 'mock-t1', label: 'Κόβει πολύ την μπάλα', count: 9 });
  });

  it('a score from either side', () => {
    const m = { sets: [{ w: 6, l: 4 }, { w: 7, l: 6, tb: [7, 5] as [number, number] }], score: '2-0', retired: false, walkover: false };
    expect(sideScore(m, true, t)).toBe('6-4, 7-6(5)');
    expect(sideScore(m, false, t)).toBe('4-6, 6-7(5)');
    expect(sideScore({ ...m, sets: [] }, false, t)).toBe('0-2');
    expect(sideScore({ ...m, walkover: true }, false, t)).toBe(t.results.walkover);
  });
});
