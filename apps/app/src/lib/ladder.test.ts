import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { Ladder } from '@netprophet/db';
import { motivation, nextLine, pointRules, rowName, votesToPass } from './ladder';

const t = getCopy('el');

const base: Ladder = {
  scope: 'friends',
  month_key: '2026-10',
  days_left: 12,
  total: 3,
  rows: [],
  me: { position: 2, points: 340, to_next: 21, above: { first_name: 'Γιώργος', surname: 'Μέμμος', display_name: null } },
  streak: 5,
  pending: 0,
  open_votes: 3,
};

describe('rowName', () => {
  it('first name and surname, the display name as a fallback, «Εσύ» for you', () => {
    expect(rowName({ first_name: 'Μαρία', surname: 'Καρρά', display_name: 'x' }, t)).toBe('Μαρία Καρρά');
    expect(rowName({ first_name: null, surname: null, display_name: 'maria' }, t)).toBe('maria');
    expect(rowName({ first_name: 'Β', surname: 'Κ', display_name: null, is_me: true }, t)).toBe('Εσύ');
  });
});

describe('nextLine', () => {
  it('points to the next place, or hold the top', () => {
    expect(nextLine(base, t)).toEqual({ label: 'Για την επόμενη θέση', value: '21 πόντοι ακόμα' });
    expect(nextLine({ ...base, me: { ...base.me!, to_next: 1 } }, t).value).toBe('1 πόντος ακόμα');
    expect(nextLine({ ...base, me: { ...base.me!, to_next: null, above: null } }, t)).toEqual({ label: 'Στην κορυφή', value: 'Κράτα τη θέση' });
  });
});

describe('motivation', () => {
  it('points in the air come first', () => {
    const m = motivation({ ...base, pending: 40 }, t);
    expect(m.head).toBe('Έχεις +40 στον αέρα.');
    expect(m.sub).toBe('Αν πέσεις μέσα, ανεβαίνεις θέση. 3 ματς ακόμα περιμένουν την ψήφο σου.');
    expect(m.button).toBe('Ψήφισε τώρα · 3 ματς');
  });

  it('then who is right above and how many correct votes pass them', () => {
    const m = motivation(base, t);
    expect(m.head).toBe('Γιώργος Μέμμος: 21 πόντοι μπροστά σου.');
    expect(m.sub).toBe('3 σωστές και περνάς μπροστά. Σερί 5, μην το αφήσεις να κρυώσει.');
  });

  it('or that you lead, with everything voted', () => {
    const m = motivation({ ...base, me: { position: 1, points: 900, to_next: null, above: null }, open_votes: 0 }, t);
    expect(m).toEqual({ head: 'Είσαι στην κορυφή.', sub: 'Κράτα το σερί σου για να μείνεις εκεί.', button: 'Πίσω στις ψήφους' });
  });
});

describe('votesToPass', () => {
  it('at +10 a vote', () => {
    expect(votesToPass(1)).toBe(1);
    expect(votesToPass(10)).toBe(1);
    expect(votesToPass(21)).toBe(3);
  });
});

describe('pointRules', () => {
  it('reads the numbers from core', () => {
    expect(pointRules(t).map((r) => r.value)).toEqual(['+10', '+30', '+5 ακόμα']);
  });
});
