import { describe, expect, it } from 'vitest';
import { columnsFor, layoutFor } from './layoutRules';

describe('layoutFor', () => {
  it('a phone keeps the phone layout', () => {
    expect(layoutFor(390)).toMatchObject({ kind: 'phone', rail: false, dialogs: false, content: 390, gutter: 16 });
  });
  it('an iPad upright is a tablet: dialogs, no rail', () => {
    expect(layoutFor(834)).toMatchObject({ kind: 'tablet', rail: false, dialogs: true, content: 834 });
  });
  it('from 1024 the rail takes its width from the screens', () => {
    expect(layoutFor(1024)).toMatchObject({ kind: 'wide', rail: true, content: 1024 - 232 });
    expect(layoutFor(1194).content).toBe(1194 - 232);
  });
  it('the edges of the steps', () => {
    expect(layoutFor(599).kind).toBe('phone');
    expect(layoutFor(600).kind).toBe('tablet');
    expect(layoutFor(1023).kind).toBe('tablet');
  });
  it('a desktop browser is capped at the page width', () => {
    expect(layoutFor(2560).width).toBe(1440);
  });
});

describe('columnsFor', () => {
  it('fits as many as the room allows, up to the max', () => {
    expect(columnsFor(358, 300)).toBe(1);
    expect(columnsFor(720, 300)).toBe(2);
    expect(columnsFor(962 - 72, 280)).toBe(3);
    expect(columnsFor(5000, 200)).toBe(3);
    expect(columnsFor(5000, 200, 12, 4)).toBe(4);
  });
  it('never fewer than one', () => {
    expect(columnsFor(0, 300)).toBe(1);
    expect(columnsFor(100, 300)).toBe(1);
  });
});
