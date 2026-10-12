import type { MePage, MeResult, PlayerProfile } from '@netprophet/db';
import { mockPlayer } from './players';

/**
 * Sample Εγώ for mock mode and the dev guest: «ΒΚ» with σερί 5 and 340 πόντοι like the header, level 4
 * going up, one free freeze. `fresh` is the account without a level yet.
 */
export function mockMe(now: Date = new Date(), fresh = false): { me: MeResult; page: MePage; player: PlayerProfile | null } {
  const base = mockPlayer('gio', now)!;
  const player: PlayerProfile = { ...base, id: 'me', first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης', is_me: true, is_followed: false, level_tier: 4, level_direction: 'up' };
  const me: MeResult = {
    user_id: 'me',
    profile: {
      first_name: 'Βαγγέλης',
      surname: 'Καρδαμίτσης',
      display_name: 'Βαγγέλης Καρδαμίτσης',
      gender: 'm',
      area_id: 'glyfada',
      area_ids: ['glyfada'],
      primary_sport: 'tennis',
      hand: 'R',
      locale: 'el',
      tz: 'Europe/Athens',
      hidden: false,
      role: 'user',
      onboarding_state: { done: true },
      claim_status: fresh ? 'creation_requested' : 'claimed',
    },
    player: fresh
      ? null
      : {
          id: 'me',
          first_name: 'Βαγγέλης',
          surname: 'Καρδαμίτσης',
          photo_path: null,
          level_tier: 4,
          level_direction: 'up',
          level_status: 'active',
          level_value: null,
          record: null,
          form: null,
        },
    game: {
      total_points: 340,
      month_points: fresh ? 30 : 340,
      streak: fresh ? 1 : 5,
      streak_best: fresh ? 1 : 9,
      chain: 0,
      votes_cast: fresh ? 4 : 34,
      votes_correct: fresh ? 3 : 21,
      votes_to_next_free_freeze: 11,
      freezes: { free: fresh ? 0 : 1, paid: 0, max: 2 },
    },
    pro: false,
    unlocks: [],
    inbox_unseen: 0,
    circle_count: 3,
  };
  const page: MePage = {
    record_year: fresh ? null : { singles: { w: 12, l: 7 }, doubles: { w: 4, l: 2 } },
    matches: fresh ? 1 : 25,
    votes: { resolved: fresh ? 4 : 30, correct: fresh ? 3 : 21, waiting: 2, pending_points: 40, open: 3 },
    friends: {
      count: 3,
      first: [
        { id: 'nik', first_name: 'Νίκος', surname: 'Ροδίτης', gender: 'm', name_forms: {} },
        { id: 'kat', first_name: 'Κατερίνα', surname: 'Λαζάρου', gender: 'f', name_forms: {} },
        { id: 'ste', first_name: 'Δημήτρης', surname: 'Γκότσης', gender: 'm', name_forms: {} },
      ],
    },
  };
  return { me, page, player: fresh ? null : player };
}
