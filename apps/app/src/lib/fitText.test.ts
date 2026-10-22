import { describe, expect, it } from 'vitest';
import { fitText, LINE_RATIO } from './fitText';

describe('fitText', () => {
  it('keeps the base size for a short answer', () => {
    expect(fitText('Ναι', 240, 48)).toMatchObject({ fontSize: 48, lines: 1 });
  });
  it('steps down for a long doubles pair so no word breaks', () => {
    const f = fitText('Ρακετάκης / Σερβίδης', 180, 48);
    expect(f.fontSize).toBeLessThan(48);
    expect(f.lines).toBeLessThanOrEqual(3);
  });
  it('fits a very long Greek name inside 3 lines at the given width', () => {
    const label = 'Παναγιώτης Παπαδόπουλος-Γεωργίου και Κωνσταντίνος Χατζηαντωνίου';
    const f = fitText(label, 220, 32);
    expect(f.lines).toBeLessThanOrEqual(3);
    expect(f.fontSize).toBeGreaterThanOrEqual(18);
    const longest = Math.max(...label.split(' ').map((w) => w.length));
    expect(longest * f.fontSize * 0.5).toBeLessThanOrEqual(220);
  });
  it('gives accents and descenders room', () => {
    expect(fitText('Όχι', 240, 48).lineHeight).toBe(Math.round(48 * LINE_RATIO));
  });
  it('never goes below the floor and still reports lines', () => {
    const f = fitText('Αλεξανδρούπολη'.repeat(4), 120, 32);
    expect(f.fontSize).toBe(18);
    expect(f.lines).toBeGreaterThan(1);
  });
});
