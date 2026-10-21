import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-constants', () => ({ default: {}, ExecutionEnvironment: {} }));
vi.mock('expo-device', () => ({ isDevice: false }));
vi.mock('./analytics', () => ({ track: () => undefined }));

describe('pushRoute', async () => {
  const { pushRoute } = await import('./push');
  it('a match reminder opens its tournament', () => expect(pushRoute({ type: 'reminder', match_id: 'm1', tournament_id: 't1' })).toBe('/tournament/t1'));
  it('a reminder for a friendly opens Σήμερα', () => expect(pushRoute({ type: 'reminder', match_id: 'm1', tournament_id: null })).toBe('/'));
  it('an entry deadline opens its tournament', () => expect(pushRoute({ type: 'entry', tournament_id: 't1' })).toBe('/tournament/t1'));
  it('an entry with no tournament opens Τουρνουά', () => expect(pushRoute({ type: 'entry' })).toBe('/tournaments'));
  it('a draw alert opens its draw', () => expect(pushRoute({ type: 'draw', tournament_id: 't1', tab: 'M OPEN' })).toBe('/tournament/t1?draw=M%20OPEN'));
  it('a schedule alert opens its tournament', () => expect(pushRoute({ type: 'schedule', tournament_id: 't1' })).toBe('/tournament/t1'));
  it('results open Αποτελέσματα', () => expect(pushRoute({ type: 'results', count: 2 })).toBe('/results'));
  it('a reaction opens Αποτελέσματα on its tournament', () =>
    expect(pushRoute({ type: 'reaction', match_id: 'm1', tournament_id: 't1' })).toBe('/results?tournament=t1'));
  it('a reaction to a friendly opens Αποτελέσματα', () => expect(pushRoute({ type: 'reaction', match_id: 'm1', tournament_id: null })).toBe('/results'));
  it('a claim decision opens Εγώ', () => expect(pushRoute({ type: 'claim', player_id: 'p1', decision: 'approved' })).toBe('/me'));
  it('anything else stays put', () => {
    expect(pushRoute({ type: 'other' })).toBeNull();
    expect(pushRoute(undefined)).toBeNull();
    expect(pushRoute(null)).toBeNull();
  });
});

describe('pushRoute with data.url', async () => {
  const { pushRoute, safeAppPath } = await import('./push');
  it('a route the push carries wins over its type', () => {
    expect(pushRoute({ type: 'pro_stats', url: '/match-stats?from=push' })).toBe('/match-stats?from=push');
    expect(pushRoute({ type: 'results', url: '/me' })).toBe('/me');
  });
  it('only an app path counts; anything else falls back to the type', () => {
    expect(pushRoute({ type: 'results', url: 'https://evil.example' })).toBe('/results');
    expect(pushRoute({ type: 'results', url: '//evil.example/x' })).toBe('/results');
    expect(pushRoute({ type: 'claim', url: 'javascript:alert(1)' })).toBe('/me');
    expect(pushRoute({ type: 'other', url: '/javascript:alert(1)' })).toBeNull();
    expect(pushRoute({ type: 'other', url: 42 })).toBeNull();
  });
  it('safeAppPath keeps queries and trims', () => {
    expect(safeAppPath(' /tournament/t1?draw=M ')).toBe('/tournament/t1?draw=M');
    expect(safeAppPath('/a\\b')).toBeNull();
    expect(safeAppPath('/results?at=10:00')).toBe('/results?at=10:00');
  });
});
