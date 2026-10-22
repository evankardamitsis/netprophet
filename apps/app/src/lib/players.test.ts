import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { PlayerCard, PlayerProfile, PlayerRef } from '@netprophet/db';
import { thousands, toPlayerRow, toProfile } from './players';

const t = getCopy('el');
// Saturday 10 Oct 2026, 15:00 Athens (UTC+3)
const NOW = new Date('2026-10-10T12:00:00Z');
const AREAS = { glyfada: 'Γλυφάδα' };

const ref = (first: string, surname: string, gender: 'm' | 'f' | null = null): PlayerRef => ({
  id: `${first}-${surname}`,
  first_name: first,
  surname,
  gender,
  name_forms: {},
});

const card = (over: Partial<PlayerCard> = {}): PlayerCard => ({
  ...ref('Κατερίνα', 'Λαζάρου', 'f'),
  area_id: 'glyfada',
  level_tier: 4,
  level_direction: 'same',
  is_followed: true,
  relation: 'friend',
  form: ['W', 'L', 'W'],
  ...over,
});

const profile = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  ...card(),
  is_me: false,
  claimed: false,
  record_year: { w: 1, l: 6 },
  last_matches: [],
  next_match: null,
  ...over,
});

describe('toPlayerRow', () => {
  it('«Γλυφάδα · φίλη» for a followed woman (levels hidden)', () => {
    const row = toPlayerRow(card(), AREAS, t);
    expect(row.name).toBe('Κατερίνα Λαζάρου');
    expect(row.initials).toBe('ΚΛ');
    expect(row.sub).toBe('Γλυφάδα · φίλη');
    expect(row.form).toEqual(['W', 'L', 'W']);
  });
  it('leaves out what is not known', () => {
    expect(toPlayerRow(card({ level_tier: null, area_id: null, is_followed: false }), AREAS, t).sub).toBe('');
  });
});

describe('toProfile', () => {
  it('no level or direction while levels are hidden; record uses singulars', () => {
    const p = toProfile(profile(), AREAS, t, NOW);
    expect(p.sub).toBe('Γλυφάδα');
    expect(p.record).toBe('1 νίκη · 6 ήττες');
    expect(p.level).toBeNull(); // players' levels are hidden (14 Oct)
  });
  it('next match: «με» and the accusative for singles', () => {
    const p = toProfile(
      profile({
        next_match: { match_id: 'n', starts_at: '2026-10-10T15:00:00Z', format: 'singles', partner: [], opponents: [ref('Δημήτρης', 'Γκότσης', 'm')] },
      }),
      AREAS,
      t,
      NOW,
    );
    expect(p.next).toBe('Σήμερα 18:00 με Δημήτρη Γκότση');
  });
  it('next match: «απέναντι» both names for doubles', () => {
    const p = toProfile(
      profile({
        next_match: {
          match_id: 'n',
          starts_at: '2026-10-10T15:00:00Z',
          format: 'doubles',
          partner: [ref('Ηλίας', 'Μέμμος')],
          opponents: [ref('Γιώργος', 'Μέμμος'), ref('Γιώργος', 'Χαμάμης')],
        },
      }),
      AREAS,
      t,
      NOW,
    );
    expect(p.next).toBe('Σήμερα 18:00 · απέναντι Γιώργος Μέμμος & Γιώργος Χαμάμης');
  });
  it('last matches: ✓ for a win, who, the score from this side, then day, tournament, category and round', () => {
    const p = toProfile(
      profile({
        last_matches: [
          {
            match_id: 'a', starts_at: '2026-10-09T16:00:00Z', format: 'singles', won: true, score: '2-1',
            sets: [{ w: 6, l: 4 }, { w: 3, l: 6 }, { w: 10, l: 8, stb: true }],
            retired: false, walkover: false, partner: [], opponents: [ref('Άννα', 'Μάνου', 'f')],
            tournament: 'Open Γλυφάδας', level: 'Γ 40+', round: 'semi',
          },
          // an untimed import (00:00 Athens) never shows a time
          {
            match_id: 'b', starts_at: '2026-10-03T21:00:00Z', format: 'doubles', won: false, score: '2-0',
            sets: [{ w: 6, l: 4 }, { w: 7, l: 6, tb: [7, 5] }],
            retired: false, walkover: false, partner: [ref('Μαρία', 'Καρρά')], opponents: [ref('Α', 'Β'), ref('Γ', 'Δ')],
          },
        ],
      }),
      AREAS,
      t,
      NOW,
    );
    expect(p.last[0]).toEqual({
      key: 'a',
      won: true,
      score: '6-4, 3-6, 10-8',
      against: 'Άννα Μάνου',
      partner: null,
      meta: 'Χθες · Open Γλυφάδας · Γ 40+ · Ημιτελικός',
      when: 'Χθες · Γ 40+',
    });
    expect(p.last[1]).toEqual({
      key: 'b',
      won: false,
      score: '4-6, 6-7(5)',
      against: 'Α Β & Γ Δ',
      partner: 'με Μαρία Καρρά',
      meta: 'Την Κυριακή',
      when: 'Την Κυριακή',
    });
  });
  it('last matches: sets only turn round for a loss, a walkover says so, another year shows it', () => {
    const p = toProfile(
      profile({
        last_matches: [
          { match_id: 'c', starts_at: '2026-09-01T16:00:00Z', format: 'singles', won: false, score: '2-1', sets: [], retired: false, walkover: false, partner: [], opponents: [ref('Χ', 'Ψ')] },
          { match_id: 'd', starts_at: '2025-06-01T16:00:00Z', format: 'singles', won: true, score: null, retired: false, walkover: true, partner: [], opponents: [ref('Χ', 'Ψ')] },
        ],
      }),
      AREAS,
      t,
      NOW,
    );
    expect(p.last[0]!.score).toBe('1-2');
    expect(p.last[0]!.meta).toBe('1/9');
    expect(p.last[1]!.score).toBe(t.results.walkover);
    expect(p.last[1]!.meta).toBe('1/6/25');
  });
});

describe('thousands', () => {
  it('uses the Greek separator', () => {
    expect(thousands(1632)).toBe('1.632');
    expect(thousands(980)).toBe('980');
  });
});
