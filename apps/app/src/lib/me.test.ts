import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { mockMe } from '../mock/me';
import { toMeView } from './me';

const t = getCopy('el');
const now = new Date('2026-10-12T09:00:00Z');
const areas = { glyfada: 'Γλυφάδα' };

describe('toMeView', () => {
  it('a player with a level: hero, record split, votes in the air', () => {
    const m = mockMe(now);
    const v = toMeView(m.me, m.page, m.player, areas, t, now);
    expect(v.isNew).toBe(false);
    expect(v.level).toBe('4');
    expect(v.direction).toEqual({ arrow: '↑', word: 'Ανεβαίνεις' });
    expect(v.sub).toBe('Γλυφάδα · δεξί χέρι · τένις');
    expect(v.best).toBe('ρεκόρ 9');
    expect(v.stats.map((s) => s.value)).toEqual(['12-7', '4-2', '21/30', '340']);
    expect(v.votes).toEqual({ title: '2 ψήφοι περιμένουν αποτέλεσμα', sub: 'Αν πέσεις μέσα παντού: +40 πόντοι' });
    expect(v.freezes.slots.map((s) => s.ready)).toEqual([true, false]);
    expect(v.freezes.line).toBe('Δωρεάν Ασφάλεια σε 11 ψήφους');
    expect(v.friends.initials).toEqual(['ΝΡ', 'ΚΛ', 'ΔΓ']);
  });

  it('no player yet: the new variant with ματς and ψήφοι progress', () => {
    const m = mockMe(now, true);
    const v = toMeView(m.me, m.page, m.player, areas, t, now);
    expect(v.isNew).toBe(true);
    expect(v.progress.matchesLabel).toBe('Ματς · 1 από 3');
    expect(v.progress.votesLabel).toBe('Ψήφοι · 4 από 10');
    expect(v.progress.cta).toBe('Βάλε ματς');
    expect(v.stats.map((s) => s.label)).toEqual(['Σωστές ψήφοι', 'Πόντοι αυτόν τον μήνα']);
    expect(v.last).toEqual([]);
    expect(v.next).toBeNull();
  });

  it('nothing waiting: how many votes so far and what is open', () => {
    const m = mockMe(now);
    const v = toMeView(m.me, { ...m.page, votes: { ...m.page.votes, waiting: 0 } }, m.player, areas, t, now);
    expect(v.votes).toEqual({ title: '34 ψήφοι μέχρι τώρα', sub: '3 ματς περιμένουν την ψήφο σου. Πάμε;' });
  });
});

describe('the game level on Εγώ', () => {
  it('reads the level from get_me: «Level 3», how far in, what is missing', () => {
    const m = mockMe(now);
    const v = toMeView(m.me, m.page, m.player, areas, t, now);
    expect(v.game).toEqual({ level: 3, fill: 40 / 300, title: 'Level 3', line: 'Ακόμα 260 πόντοι για το level 4' });
  });
  it('works it out from the points when an older server leaves it out', () => {
    const m = mockMe(now);
    const v = toMeView({ ...m.me, game: { ...m.me.game, level: undefined, total_points: 599 } }, m.page, m.player, areas, t, now);
    expect(v.game.title).toBe('Level 3');
    expect(v.game.line).toBe('Ακόμα 1 πόντος για το level 4');
  });
});
