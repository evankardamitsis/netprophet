import type { GetQuestsResult } from '@netprophet/db';

/** what a new player sees (mock mode and the dev guest): nothing done yet, rewards as the server gives them */
export function mockQuests(): GetQuestsResult {
  return {
    daily: [
      { key: 'daily_vote_3_cards', target: 3, progress: 2, done: false, reward: { kind: 'badge', key: 'many_votes', amount: 5 } },
      { key: 'daily_kudos_1', target: 1, progress: 0, done: false, reward: { kind: 'badge', key: 'gentleman', amount: 1 } },
      { key: 'daily_vote_2_matches', target: 2, progress: 1, done: false, reward: { kind: 'cosmetic', key: 'bg_night', category: 'background' } },
    ],
    weekly: [
      { key: 'weekly_log_2_matches', target: 2, progress: 1, done: false, reward: { kind: 'cosmetic', key: 'frame_week', category: 'frame' } },
      { key: 'weekly_vote_5_days', target: 5, progress: 3, done: false, reward: { kind: 'cosmetic', key: 'bg_grass', category: 'background' } },
    ],
  };
}
