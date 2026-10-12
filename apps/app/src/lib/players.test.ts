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
  record_year: { w: 1, l: 6 },
  last_matches: [],
  next_match: null,
  ...over,
});

describe('toPlayerRow', () => {
  it('«level 4 · Γλυφάδα · φίλη» for a followed woman', () => {
    const row = toPlayerRow(card(), AREAS, t);
    expect(row.name).toBe('Κατερίνα Λαζάρου');
    expect(row.initials).toBe('ΚΛ');
    expect(row.sub).toBe('level 4 · Γλυφάδα · φίλη');
    expect(row.form).toEqual(['W', 'L', 'W']);
  });
  it('leaves out what is not known', () => {
    expect(toPlayerRow(card({ level_tier: null, area_id: null, is_followed: false }), AREAS, t).sub).toBe('');
  });
});

describe('toProfile', () => {
  it('direction follows gender, record uses singulars', () => {
    const p = toProfile(profile(), AREAS, t, NOW);
    expect(p.sub).toBe('Γλυφάδα · = Σταθερή');
    expect(p.record).toBe('1 νίκη · 6 ήττες');
    expect(p.level).toBe('level 4');
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
  it('last matches: result, opponent and day', () => {
    const p = toProfile(
      profile({
        last_matches: [
          { match_id: 'a', starts_at: '2026-10-09T16:00:00Z', format: 'singles', won: true, score: '2-1', retired: false, walkover: false, partner: [], opponents: [ref('Άννα', 'Μάνου', 'f')] },
          { match_id: 'b', starts_at: '2026-10-04T16:00:00Z', format: 'doubles', won: false, score: '2-0', retired: false, walkover: false, partner: [ref('Μαρία', 'Καρρά')], opponents: [ref('Α', 'Β'), ref('Γ', 'Δ')] },
        ],
      }),
      AREAS,
      t,
      NOW,
    );
    expect(p.last[0]).toEqual({ result: 'Νίκη 2-1', against: '· Άννα Μάνου', when: 'Χθες' });
    expect(p.last[1]).toEqual({ result: 'Ήττα 2-0', against: '· παρτενέρ Μαρία Καρρά, απέναντι Α Β & Γ Δ', when: 'Την Κυριακή' });
  });
});

describe('thousands', () => {
  it('uses the Greek separator', () => {
    expect(thousands(1632)).toBe('1.632');
    expect(thousands(980)).toBe('980');
  });
});
