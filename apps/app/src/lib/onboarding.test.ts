import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { areasOf, knownButton, primarySport, splitName, stepsFor, type Area } from './onboarding';

const t = getCopy('el');

describe('stepsFor', () => {
  it('a new player also answers «Πώς παίζεις;»', () => {
    expect(stepsFor(false)).toEqual(['name', 'claim', 'area', 'known']);
    expect(stepsFor(true)).toEqual(['name', 'claim', 'play', 'area', 'known']);
  });
});

describe('knownButton', () => {
  it('counts down to three, then continues', () => {
    expect(knownButton(0, t)).toEqual({ label: 'Διάλεξε 3 ακόμα', ready: false });
    expect(knownButton(2, t)).toEqual({ label: 'Διάλεξε 1 ακόμα', ready: false });
    expect(knownButton(3, t)).toEqual({ label: 'Συνέχεια · 3 φίλοι', ready: true });
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
  });
});

describe('primarySport', () => {
  it('«Και τα δύο» starts with tennis', () => {
    expect(primarySport('both')).toBe('tennis');
    expect(primarySport('padel')).toBe('padel');
  });
});
