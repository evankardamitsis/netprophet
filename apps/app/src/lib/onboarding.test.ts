import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { areasOf, AUTO_FOLLOW, autoFollowIds, knownButton, KNOWN_MIN, KNOWN_MIN_LINK, playLine, primarySport, splitName, stepsFor, type Area } from './onboarding';

const t = getCopy('el');

describe('stepsFor', () => {
  it('four steps for everyone, then the first vote', () => {
    // «Πώς παίζεις;» left the first run (founder, 19 Oct): new players walk the same four steps
    expect(stepsFor()).toEqual(['name', 'claim', 'area', 'known']);
    expect(stepsFor(false)).toEqual(['name', 'claim', 'area', 'known']);
    // from an opponent link: confirm the player, pick who you know, done
    expect(stepsFor(true)).toEqual(['claim', 'known']);
  });

  it('no slides, no Baller and no «Πώς παίζεις;» in first run', () => {
    for (const s of [stepsFor(false), stepsFor(true)]) {
      expect(s.length).toBeLessThanOrEqual(4);
      expect(s).not.toContain('baller');
      expect(s).not.toContain('play');
      expect(s.every((x) => ['name', 'claim', 'area', 'known'].includes(x))).toBe(true);
    }
  });
});

describe('autoFollowIds', () => {
  const pool = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));

  it('follows exactly who was picked', () => {
    expect(autoFollowIds(['a', 'b'], pool(10))).toEqual(['a', 'b']);
  });

  it('nobody picked: the first 6 suggestions, in the server order', () => {
    expect(AUTO_FOLLOW).toBe(6);
    expect(autoFollowIds([], pool(30))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('fewer suggestions than 6: all of them, and none is fine too', () => {
    expect(autoFollowIds([], pool(4))).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(autoFollowIds([], [])).toEqual([]);
  });

  it('never your own player, never twice', () => {
    expect(autoFollowIds([], [{ id: 'me' }, ...pool(6)], 'me')).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(autoFollowIds([], [{ id: 'p1' }, { id: 'p1' }, { id: 'p2' }])).toEqual(['p1', 'p2']);
  });
});

describe('the known step says what «Αργότερα» does', () => {
  it('names the 6, Greek first, English too', () => {
    expect(t.onboarding.known.noteOptional).toContain('6 πιο δημοφιλείς της περιοχής σου');
    expect(getCopy('en').onboarding.known.noteOptional).toContain('6 most popular');
  });
});

describe('playLine', () => {
  it('shows the hand and the tournaments, or asks for them', () => {
    expect(playLine('R', 'few', t)).toBe('Δεξιόχειρας · Ένα δυο, για την εμπειρία');
    expect(playLine('L', null, t)).toBe('Αριστερόχειρας');
    expect(playLine(null, 'trophies', t)).toBe('Έχω κούπες στο σπίτι');
    expect(playLine(null, null, t)).toBe(t.onboarding.play.unset);
    expect(playLine('X', 'nope', t)).toBe(t.onboarding.play.unset);
    expect(playLine('R', 'monthly', getCopy('en'))).toBe('Right-handed · One every month');
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
