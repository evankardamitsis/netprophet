import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-constants', () => ({ default: {}, ExecutionEnvironment: {} }));
vi.mock('expo-device', () => ({ isDevice: false }));
vi.mock('./analytics', () => ({ track: () => undefined }));

describe('pushRoute', async () => {
  const { pushRoute } = await import('./push');
  it('a match reminder opens Σήμερα', () => expect(pushRoute({ type: 'reminder', match_id: 'm1' })).toBe('/'));
  it('an entry deadline opens Τουρνουά', () => expect(pushRoute({ type: 'entry', tournament_id: 't1' })).toBe('/tournaments'));
  it('a draw alert opens its draw', () => expect(pushRoute({ type: 'draw', tournament_id: 't1', tab: 'M OPEN' })).toBe('/tournament/t1?draw=M%20OPEN'));
  it('a schedule alert opens its tournament', () => expect(pushRoute({ type: 'schedule', tournament_id: 't1' })).toBe('/tournament/t1'));
  it('results open Αποτελέσματα', () => expect(pushRoute({ type: 'results', count: 2 })).toBe('/results'));
  it('anything else stays put', () => expect(pushRoute({ type: 'other' })).toBeNull());
});
