import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { areasOf, knownButton, KNOWN_MIN, KNOWN_MIN_LINK, primarySport, splitName, stepsFor, type Area } from './onboarding';

const t = getCopy('el');

describe('stepsFor', () => {
  it('a short first run: only what makes the game yours, then the first vote', () => {
    expect(stepsFor(false)).toEqual(['name', 'claim', 'area', 'known']);
    // a new player also answers «Πώς παίζεις;»
    expect(stepsFor(true)).toEqual(['name', 'claim', 'play', 'area', 'known']);
    // from an opponent link: confirm the player, pick who you know, done
    expect(stepsFor(false, true)).toEqual(['claim', 'known']);
    expect(stepsFor(true, true)).toEqual(['claim', 'known']);
  });

  it('no slides and no Baller in first run (Baller comes after the first vote)', () => {
    for (const s of [stepsFor(false), stepsFor(true), stepsFor(false, true)]) {
      expect(s.length).toBeLessThanOrEqual(5);
      expect(s).not.toContain('baller');
      expect(s.every((x) => ['name', 'claim', 'play', 'area', 'known'].includes(x))).toBe(true);
    }
  });
});

describe('knownButton', () => {
  it('never blocks someone who knows nobody yet', () => {
    expect(KNOWN_MIN).toBe(0);
    expect(knownButton(0, t)).toEqual({ label: 'Αργότερα', ready: true });
    expect(knownButton(1, t)).toEqual({ label: 'Συνέχεια · 1 φίλος', ready: true });
    expect(knownButton(3, t)).toEqual({ label: 'Συνέχεια · 3 φίλοι', ready: true });
  });

  it('after a link one is enough', () => {
    expect(knownButton(0, t, KNOWN_MIN_LINK)).toEqual({ label: 'Διάλεξε 1 ακόμα', ready: false });
    expect(knownButton(1, t, KNOWN_MIN_LINK)).toEqual({ label: 'Συνέχεια · 1 φίλος', ready: true });
  });

  it('a minimum still counts down', () => {
    expect(knownButton(1, t, 3)).toEqual({ label: 'Διάλεξε 2 ακόμα', ready: false });
  });

  it('speaks English too', () => {
    expect(knownButton(0, getCopy('en'))).toEqual({ label: 'Later', ready: true });
  });
});

describe('areasOf', () => {
  it('keeps one region, in order', () => {
    const areas: Area[] = [
      { id: 'b', region: 'south', name: 'Βούλα', sort: 8 },
      { id: 'k', region: 'north', name: 'Κηφισιά', sort: 1 },
      { id: 'g', region: 'south', name: 'Γλυφάδα', sort: 7 },
    ];
    expect(areasOf(areas, 'south').map((a) => a.id)).toEqual(['g', 'b']);
  });
});

describe('splitName', () => {
  it('splits a full name, ignores an email-like name', () => {
    expect(splitName('Βαγγέλης Καρδαμίτσης')).toEqual({ first: 'Βαγγέλης', surname: 'Καρδαμίτσης' });
    expect(splitName('kardamitsis.e')).toEqual({ first: '', surname: '' });
    expect(splitName('Νίκος')).toEqual({ first: 'Νίκος', surname: '' });
    expect(splitName(null)).toEqual({ first: '', surname: '' });
    // a new account's neutral name is not a name to fill in
    expect(splitName('Παίκτης 4821')).toEqual({ first: '', surname: '' });
  });
});

describe('primarySport', () => {
  it('«Και τα δύο» starts with tennis', () => {
    expect(primarySport('both')).toBe('tennis');
    expect(primarySport('padel')).toBe('padel');
  });
});
