import { describe, expect, it } from 'vitest';
import { cleanName, nameProblem, suggestedName } from './ballerName';

describe('Baller names', () => {
  it('cleans spaces', () => {
    expect(cleanName('  Ace   Rocket ')).toBe('Ace Rocket');
  });
  it('takes 2 to 16 Greek or Latin letters', () => {
    expect(nameProblem('Σερβίτσας')).toBeNull();
    expect(nameProblem('Ace Rocket')).toBeNull();
    expect(nameProblem('Α')).toBe('short');
    expect(nameProblem('Ρακετούληςπουπετάει')).toBe('long');
    expect(nameProblem('R2D2')).toBe('chars');
    expect(nameProblem('Ace-Rocket')).toBe('chars');
  });
  it('suggests the same name for the same person, and a valid one', () => {
    expect(suggestedName('abc', 'el')).toBe(suggestedName('abc', 'el'));
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      expect(nameProblem(suggestedName(id, 'el'))).toBeNull();
      expect(nameProblem(suggestedName(id, 'en'))).toBeNull();
    }
  });
});
