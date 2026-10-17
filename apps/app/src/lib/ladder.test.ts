import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { Ladder } from '@netprophet/db';
import { boardItems, motivation, nextLine, pickScope, podiumOf, pointRules, rowName, scopeLabel, scopeTabs, votesToPass } from './ladder';

const t = getCopy('el');

const base: Ladder = {
  scope: 'friends',
  has_league: false,
  league: null,
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

describe('scopes', () => {
  it('«Κατηγορία» only with a league, «Όλη η Αττική» only once open, in prototype order', () => {
    expect(scopeTabs(true, true)).toEqual(['league', 'friends', 'all']);
    expect(scopeTabs(false, false)).toEqual(['friends']);
    expect(scopeTabs(true, false)).toEqual(['league', 'friends']);
  });
  it('defaults to the league when there is one, else the people you know', () => {
    expect(pickScope(null, true, false)).toBe('league');
    expect(pickScope(null, false, true)).toBe('friends');
    expect(pickScope('all', true, false)).toBe('league');
    expect(pickScope('all', true, true)).toBe('all');
    expect(pickScope('league', false, true)).toBe('friends');
  });
});

const row = (position: number) => ({ position, user_id: `u${position}`, first_name: 'Α', surname: 'Β', display_name: null, points: 100 - position, last_point_at: null, is_me: false });
const lgLadder = (tier: 'bronze' | 'silver' | 'gold'): Ladder => ({
  ...base,
  scope: 'league',
  has_league: true,
  league: { tier, group_no: 1, size: 20, promote_top: 5, relegate_from: 16, award_top: 3 },
  rows: Array.from({ length: 20 }, (_, i) => row(i + 1)),
});

describe('league board', () => {
  const bands = (l: Ladder) => boardItems(l, t).flatMap((x, i) => (x.kind === 'band' ? [[i, x.label] as const] : []));
  it('silver has both lines: above row 1 and before row 16', () => {
    expect(bands(lgLadder('silver'))).toEqual([[0, '↑ Ανεβαίνουν κατηγορία'], [16, '↓ Αλλάζουν κατηγορία']]);
  });
  it('gold has no up line, bronze no down line', () => {
    expect(bands(lgLadder('gold')).map((b) => b[1])).toEqual(['↓ Αλλάζουν κατηγορία']);
    expect(bands(lgLadder('bronze')).map((b) => b[1])).toEqual(['↑ Ανεβαίνουν κατηγορία']);
  });
  it('other scopes are plain rows', () => {
    expect(bands({ ...lgLadder('silver'), scope: 'friends' })).toEqual([]);
  });
  it('the pill says the tier and the player count', () => {
    expect(scopeLabel(lgLadder('bronze'), t)).toBe('Χάλκινη · 20 παίκτες');
    expect(scopeLabel(base, t)).toBe('Όσοι ξέρεις · αυτόν τον μήνα');
  });
});

describe('podiumOf', () => {
  const r = (position: number, points: number) => ({ position, points });
  it('lays out second, first, third', () => {
    expect(podiumOf([r(1, 90), r(2, 70), r(3, 50), r(4, 10)])?.map((x) => x.position)).toEqual([2, 1, 3]);
  });
  it('needs two with points', () => {
    expect(podiumOf([r(1, 90), r(2, 0)])).toBeNull();
    expect(podiumOf([r(1, 90), r(2, 10)])?.map((x) => x.position)).toEqual([2, 1]);
  });
});
