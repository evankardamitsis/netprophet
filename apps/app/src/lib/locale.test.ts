import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { copy, currentLocale, onLocaleChange, setLocale, startLocale } from '../i18n';
import { deviceLocale, parseChoice, resolveLocale } from './locale';
import { shortDay } from './logMatch';

describe('the app language (founder, 16 Nov 2026)', () => {
  it('Αυτόματα: a Greek phone reads Greek, any other phone English', () => {
    expect(resolveLocale('auto', 'el')).toBe('el');
    expect(resolveLocale('auto', 'EL')).toBe('el');
    expect(resolveLocale('auto', 'en')).toBe('en');
    expect(resolveLocale('auto', 'de')).toBe('en');
    expect(resolveLocale('auto', null)).toBe('en');
    expect(deviceLocale(undefined)).toBe('en');
  });
  it('a pick in Ρυθμίσεις wins over the phone', () => {
    expect(resolveLocale('el', 'en')).toBe('el');
    expect(resolveLocale('en', 'el')).toBe('en');
  });
  it('only el and en are saved picks; anything else is Αυτόματα', () => {
    expect(parseChoice('el')).toBe('el');
    expect(parseChoice('en')).toBe('en');
    expect(parseChoice(null)).toBe('auto');
    expect(parseChoice('fr')).toBe('auto');
    expect(parseChoice('auto')).toBe('auto');
  });
  it('the store: switches, saves the pick and empties word caches only on a real change', () => {
    const saved: string[] = [];
    let resets = 0;
    const off = onLocaleChange(() => {
      resets += 1;
    });
    startLocale('el', 'auto', (c) => saved.push(c));
    expect(currentLocale()).toBe('el');
    setLocale('en');
    expect(currentLocale()).toBe('en');
    setLocale('el');
    expect(currentLocale()).toBe('el');
    // «Αυτόματα» on a Greek phone is still Greek: saved, but nothing to reset
    setLocale('auto');
    expect(currentLocale()).toBe('el');
    expect(saved).toEqual(['en', 'el', 'auto']);
    expect(resets).toBe(2);
    off();
  });
  it('the tests keep their Greek dictionary', () => {
    expect(copy.locale).toBe('el');
  });
  it('short days follow the language', () => {
    expect(shortDay('2026-10-02')).toBe('Παρ 2/10');
    expect(shortDay('2026-10-02', getCopy('el'))).toBe('Παρ 2/10');
    expect(shortDay('2026-10-02', getCopy('en'))).toBe('Fri 2/10');
  });
});
