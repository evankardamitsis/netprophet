import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { copy, currentLocale, onLocaleChange, setLocale, startLocale } from '../i18n';
import { parseChoice, resolveLocale } from './locale';
import { shortDay } from './logMatch';

describe('the app language (founder, 23 Nov 2026)', () => {
  it('nothing picked reads Greek, whatever the phone speaks', () => {
    expect(resolveLocale('auto')).toBe('el');
  });
  it('a pick in Ρυθμίσεις wins', () => {
    expect(resolveLocale('el')).toBe('el');
    expect(resolveLocale('en')).toBe('en');
  });
  it('only el and en are saved picks; anything else is no pick (Greek)', () => {
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
    startLocale('auto', (c) => saved.push(c));
    expect(currentLocale()).toBe('el');
    setLocale('en');
    expect(currentLocale()).toBe('en');
    setLocale('el');
    expect(currentLocale()).toBe('el');
    // no pick is Greek too: saved, but nothing to reset
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
