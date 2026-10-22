import { describe, expect, it } from 'vitest';
import { NOTHING_HELD_POINTS, claim, land, landClaimed, pointsOffset, syncQueue, type PointsCard } from './hudPoints';

const c = (id: string, points: number, ok = points > 0): PointsCard => ({ id, ok, points });
const batch = [c('a', 10), c('b', 15), c('x', 0, false), c('d', 15)];

describe('hudPoints', () => {
  it('holds back every right call of the batch, so the header shows the total from before them', () => {
    const h = syncQueue(NOTHING_HELD_POINTS, batch);
    expect(pointsOffset(h, true)).toBe(40);
  });

  it('each landing gives back exactly that card, so the total climbs step by step', () => {
    let h = syncQueue(NOTHING_HELD_POINTS, batch);
    const steps: number[] = [];
    for (const id of ['a', 'b', 'x', 'd']) {
      h = land(h, id);
      steps.push(pointsOffset(h, true));
    }
    expect(steps).toEqual([30, 15, 15, 0]);
  });

  it('a card that played and left is not held back again when the queue refetches', () => {
    let h = syncQueue(NOTHING_HELD_POINTS, batch);
    h = land(h, 'a');
    h = syncQueue(h, batch.slice(1));
    expect(pointsOffset(h, true)).toBe(30);
    h = syncQueue(h, batch);
    expect(pointsOffset(h, true)).toBe(30);
  });

  it('a card dismissed without landing is let go, and an empty queue ends on the server total', () => {
    let h = syncQueue(NOTHING_HELD_POINTS, batch);
    h = syncQueue(h, batch.slice(1));
    expect(pointsOffset(h, true)).toBe(30);
    expect(pointsOffset(syncQueue(h, []), true)).toBe(0);
  });

  it('anywhere but the feed the header shows get_me as it is', () => {
    expect(pointsOffset(syncQueue(NOTHING_HELD_POINTS, batch), false)).toBe(0);
  });

  it('«Πάρε τους πόντους»: the rest stay held after the queue empties, until the one flight lands', () => {
    let h = syncQueue(NOTHING_HELD_POINTS, batch);
    h = land(h, 'a');
    h = claim(h, ['b', 'x', 'd']);
    h = syncQueue(h, []);
    expect(pointsOffset(h, true)).toBe(30);
    h = landClaimed(h);
    expect(pointsOffset(h, true)).toBe(0);
  });

  it('a new result after the batch is held back on its own', () => {
    let h = syncQueue(NOTHING_HELD_POINTS, batch);
    h = syncQueue(h, []);
    h = syncQueue(h, [c('e', 15)]);
    expect(pointsOffset(h, true)).toBe(15);
  });

  it('negative points never lift the header', () => {
    expect(pointsOffset(syncQueue(NOTHING_HELD_POINTS, [c('n', -5, true)]), true)).toBe(0);
  });

  it('syncQueue returns the same object when nothing changed', () => {
    const h = syncQueue(NOTHING_HELD_POINTS, batch);
    expect(syncQueue(h, batch)).toBe(h);
  });
});
