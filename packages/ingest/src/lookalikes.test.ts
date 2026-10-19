import { describe, expect, it } from 'vitest';
import { greekLookalikes, parseSheet, parseSheetSide } from './index';

/** «ΖΑΝNΗΣ» with a Latin N (18 Oct 2026) is the same player as «ΖΑΝΝΗΣ», and the same row. */
describe('Latin look-alike letters in Greek names', () => {
  it('a Latin capital inside a Greek word becomes Greek', () => {
    expect(greekLookalikes('ΖΑΝNΗΣ ΓΙΩΡΓΟΣ')).toBe('ΖΑΝΝΗΣ ΓΙΩΡΓΟΣ');
    expect(greekLookalikes('AΦΑΛΩΝΙΑΤΗΣ ΣΤΡΑΤΟΣ')).toBe('ΑΦΑΛΩΝΙΑΤΗΣ ΣΤΡΑΤΟΣ');
    expect(greekLookalikes('KAKKABHΣ')).toBe('ΚΑΚΚΑΒΗΣ');
  });

  it('a Latin word stays Latin, also next to a Greek one', () => {
    expect(greekLookalikes('BINJAKU')).toBe('BINJAKU');
    expect(greekLookalikes('JELACIC DRAGANA')).toBe('JELACIC DRAGANA');
    expect(greekLookalikes('BINJAKU ΑΛΕΞ')).toBe('BINJAKU ΑΛΕΞ');
  });

  it('a side reads the same with either letter, and is no longer flagged latin', () => {
    const a = parseSheetSide('ΖΑΝNΗΣ ΓΙΩΡΓΟΣ');
    const b = parseSheetSide('ΖΑΝΝΗΣ ΓΙΩΡΓΟΣ');
    expect(a.people).toEqual(b.people);
    expect(a.flags).not.toContain('latin_name');
    expect(parseSheetSide('BINJAKU').flags).toContain('latin_name');
  });

  it('the row keeps one fingerprint whichever N the organiser typed', () => {
    const head = ['ΩΡΑ', 'ΚΑΤΗΓΟΡΙΑ', 'PLAYER 1', 'PLAYER 2', 'ΑΠΟΤΕΛΕΣΜΑ'];
    const tab = (name: string) => ({ name: 'ΚΥΡ 18/10', rows: [head, ['16.30', 'M -40', name, 'ΜΟΥΡΙΚΗΣ ΔΗΜΗΤΡΗΣ', '']] });
    const [latin] = parseSheet([tab('ΖΑΝNΗΣ ΓΙΩΡΓΟΣ')], 2026);
    const [greek] = parseSheet([tab('ΖΑΝΝΗΣ ΓΙΩΡΓΟΣ')], 2026);
    expect(latin!.fingerprint).toBe(greek!.fingerprint);
  });
});
