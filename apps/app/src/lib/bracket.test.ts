import { describe, expect, it } from 'vitest';
import { CARD_GAP, CARD_H, CONN_W, centerY, championOf, layoutBracket, startRound } from './bracket';
import { parseSets } from './tournaments';

const unit = CARD_H + CARD_GAP;

describe('layoutBracket', () => {
  it('an 8 draw: 4, 2, 1 cards, each match midway between its feeders', () => {
    const l = layoutBracket([4, 2, 1], 200);
    expect(l.cards).toHaveLength(7);
    const at = (r: number, i: number) => l.cards.find((c) => c.round === r && c.index === i)!;
    expect(at(0, 0).y + CARD_H / 2).toBe(0.5 * unit);
    expect(at(1, 0).y + CARD_H / 2).toBe(unit);
    expect(at(2, 0).y + CARD_H / 2).toBe(2 * unit);
    for (const [r, i] of [[1, 0], [1, 1], [2, 0]] as const) {
      const mid = (centerY(r - 1, 2 * i) + centerY(r - 1, 2 * i + 1)) / 2;
      expect(centerY(r, i)).toBe(mid);
    }
    expect(at(1, 0).x).toBe(200 + CONN_W);
    expect(l.height).toBe(4 * unit);
    expect(l.width).toBe(3 * 200 + 2 * CONN_W);
    expect(l.champion).toBeNull();
  });

  it('a 32 draw: 16, 8, 4, 2, 1 and the final sits at the middle of the tree', () => {
    const l = layoutBracket([16, 8, 4, 2, 1], 220, 150);
    expect(l.cards).toHaveLength(31);
    expect(l.height).toBe(16 * unit);
    const final = l.cards.find((c) => c.round === 4)!;
    expect(final.y + CARD_H / 2).toBe(l.height / 2);
    expect(l.champion).toEqual({ x: 4 * (220 + CONN_W) + 220 + CONN_W, cy: l.height / 2 });
    expect(l.width).toBe(5 * 220 + 4 * CONN_W + CONN_W + 150);
  });

  it('connectors: per feeding pair two horizontals, a vertical and one into the next card', () => {
    const l8 = layoutBracket([4, 2, 1], 200);
    // 3 pairs * 4 segments
    expect(l8.connectors).toHaveLength(12);
    const l32 = layoutBracket([16, 8, 4, 2, 1], 200);
    expect(l32.connectors).toHaveLength(15 * 4);
    // with a champion slot there is one more run out of the final
    expect(layoutBracket([4, 2, 1], 200, 150).connectors).toHaveLength(13);
    // every connector is a thin box
    for (const b of l8.connectors) expect(Math.min(b.w, b.h)).toBeCloseTo(1.5);
  });

  it('a lone final has no connectors', () => {
    expect(layoutBracket([1], 200).connectors).toHaveLength(0);
  });
});

describe('startRound', () => {
  const m = (winner: 1 | 2 | null, advances: 1 | 2 | null = null) => ({ winner, advances });
  it('is the earliest round with something left to play, else the last', () => {
    expect(startRound([{ matches: [m(1), m(null, 1)] }, { matches: [m(null)] }])).toBe(1);
    expect(startRound([{ matches: [m(1), m(null)] }, { matches: [m(null)] }])).toBe(0);
    expect(startRound([{ matches: [m(1)] }, { matches: [m(2)] }])).toBe(1);
    expect(startRound([])).toBe(0);
  });
});

describe('parseSets and championOf', () => {
  it('turns the winner-first score into side 1 first games', () => {
    expect(parseSets('64 63', 1)).toEqual([[6, 4], [6, 3]]);
    expect(parseSets('64 63', 2)).toEqual([[4, 6], [3, 6]]);
    expect(parseSets('67(4) 62 10-8', 1)).toEqual([[6, 7], [6, 2], [10, 8]]);
    expect(parseSets('6-4, 3-6', 2)).toEqual([[4, 6], [6, 3]]);
    expect(parseSets('', 1)).toEqual([]);
  });
  it('the champion is the winner of a decided final', () => {
    const side = (t: string) => ({ parts: [{ text: t, playerId: null }], seed: null, bye: false, empty: false });
    const final = { winner: 2 as const, sides: [side('A'), side('B')] as [ReturnType<typeof side>, ReturnType<typeof side>] };
    expect(championOf([{ matches: [final] }])?.parts[0]?.text).toBe('B');
    expect(championOf([{ matches: [{ ...final, winner: null }] }])).toBeNull();
  });
});
