import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-constants', () => ({ default: {}, ExecutionEnvironment: {} }));
vi.mock('expo-device', () => ({ isDevice: false }));
vi.mock('./analytics', () => ({ track: () => undefined }));

/**
 * Every kind of push the server sends (core.push_url, 20270320000000_push_landing), with the url it now carries and
 * without one (a push sent before, still in the notification centre): both land on the same place.
 */
const T = 't1';
const M = 'm1';
const KINDS: { kind: string; data: Record<string, unknown>; url: string; place: string }[] = [
  { kind: 'results (Βγήκαν αποτελέσματα)', data: { type: 'results', count: 2 }, url: '/?results=1', place: '/?results=1' },
  { kind: 'schedule new / moved / postponed', data: { type: 'schedule', tournament_id: T, match_id: M }, url: `/tournament/${T}?match=${M}`, place: `/tournament/${T}?match=${M}` },
  { kind: 'draw (Pro: opponent, bye, group)', data: { type: 'draw', tournament_id: T, tab: 'M OPEN' }, url: `/tournament/${T}?draw=M%20OPEN`, place: `/tournament/${T}?draw=M%20OPEN` },
  { kind: 'follow draw', data: { type: 'follow', tournament_id: T, tab: 'Α ΑΠΛΟ' }, url: `/tournament/${T}?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F`, place: `/tournament/${T}?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F` },
  { kind: 'follow final', data: { type: 'follow', tournament_id: T, tab: 'W' }, url: `/tournament/${T}?draw=W`, place: `/tournament/${T}?draw=W` },
  { kind: 'follow schedule (tomorrow)', data: { type: 'follow', tournament_id: T, day: '2027-03-21' }, url: `/tournament/${T}?day=2027-03-21`, place: `/tournament/${T}?day=2027-03-21` },
  { kind: 'entry deadline', data: { type: 'entry', tournament_id: T }, url: `/tournament/${T}`, place: `/tournament/${T}` },
  { kind: 'reminder eve / soon', data: { type: 'reminder', tournament_id: T, match_id: M }, url: `/scout/${M}`, place: `/scout/${M}` },
  { kind: 'reaction (kudos)', data: { type: 'reaction', tournament_id: T, match_id: M }, url: `/results?tournament=${T}`, place: `/results?tournament=${T}` },
  { kind: 'reaction on a friendly', data: { type: 'reaction', tournament_id: null, match_id: M }, url: '/results', place: '/results' },
  { kind: 'claim approved', data: { type: 'claim', player_id: 'p1', decision: 'approved' }, url: '/me', place: '/me' },
  { kind: 'claim rejected', data: { type: 'claim', player_id: 'p1', decision: 'rejected' }, url: '/players?focus=1', place: '/players?focus=1' },
  { kind: 'new player rejected', data: { type: 'claim', player_id: 'p1', decision: 'rejected' }, url: '/players?focus=1', place: '/players?focus=1' },
  { kind: 'claim_report_rejected («Είμαι εγώ» dismissed)', data: { type: 'claim', player_id: 'p1', decision: 'rejected' }, url: '/players?focus=1', place: '/players?focus=1' },
  { kind: 'claim_report_rejected (own player kept)', data: { type: 'claim', player_id: 'p1', decision: 'rejected' }, url: '/me', place: '/me' },
  { kind: 'claim_released', data: { type: 'claim', player_id: 'p1', decision: 'released' }, url: '/players?focus=1', place: '/players?focus=1' },
];

/** without a url: the app's own table (claims all go to Εγώ, which leads to the players when there is none) */
const WITHOUT_URL: Record<string, string> = {
  results: '/?results=1',
  schedule: `/tournament/${T}?match=${M}`,
  reminder: `/scout/${M}`,
  entry: `/tournament/${T}`,
  claim: '/me',
};

describe('pushRoute: every kind, with the url the server sets', async () => {
  const { pushRoute } = await import('./push');
  for (const k of KINDS) {
    it(`${k.kind} opens ${k.place}`, () => expect(pushRoute({ ...k.data, url: k.url })).toBe(k.place));
  }
});

describe('pushRoute: every kind, sent before the url (by type)', async () => {
  const { pushRoute } = await import('./push');
  for (const k of KINDS) {
    const want = WITHOUT_URL[k.data.type as string] ?? k.place;
    it(`${k.kind} opens ${want}`, () => expect(pushRoute(k.data)).toBe(want));
  }
  it('a schedule push with no tournament opens the home', () => expect(pushRoute({ type: 'schedule', match_id: M })).toBe('/'));
  it('a schedule push with no match opens the tournament', () => expect(pushRoute({ type: 'schedule', tournament_id: T })).toBe(`/tournament/${T}`));
  it('a draw push with no tournament opens the home', () => expect(pushRoute({ type: 'draw', tab: 'M' })).toBe('/'));
  it('a reminder for a friendly with no match opens the home', () => expect(pushRoute({ type: 'reminder' })).toBe('/'));
  it('ids are encoded', () => expect(pushRoute({ type: 'schedule', tournament_id: 'a/b', match_id: 'c d' })).toBe('/tournament/a%2Fb?match=c%20d'));
});

describe('pushRoute: unknown and old places fall back to the home', async () => {
  const { pushRoute } = await import('./push');
  it('an unknown kind, or no data', () => {
    expect(pushRoute({ type: 'other' })).toBe('/');
    expect(pushRoute({})).toBe('/');
    expect(pushRoute(undefined)).toBe('/');
    expect(pushRoute(null)).toBe('/');
  });
  it('an old url the app no longer has falls back to the type, else the home', () => {
    expect(pushRoute({ type: 'results', url: '/today' })).toBe('/?results=1');
    expect(pushRoute({ type: 'other', url: '/feed' })).toBe('/');
    expect(pushRoute({ type: 'other', url: '/tournament/undefined' })).toBe('/');
    expect(pushRoute({ type: 'other', url: '/tournament/' })).toBe('/');
  });
  it('never sign-in, onboarding or another site', () => {
    expect(pushRoute({ type: 'other', url: '/sign-in' })).toBe('/');
    expect(pushRoute({ type: 'other', url: '/onboarding' })).toBe('/');
    expect(pushRoute({ type: 'results', url: 'https://evil.example' })).toBe('/?results=1');
    expect(pushRoute({ type: 'results', url: '//evil.example/x' })).toBe('/?results=1');
    expect(pushRoute({ type: 'claim', url: 'javascript:alert(1)' })).toBe('/me');
    expect(pushRoute({ type: 'other', url: '/javascript:alert(1)' })).toBe('/');
    expect(pushRoute({ type: 'other', url: 42 })).toBe('/');
  });
  it('a new kind can carry any screen the app has', () => {
    expect(pushRoute({ type: 'pro_stats', url: '/match-stats?from=push' })).toBe('/match-stats?from=push');
    expect(pushRoute({ type: 'x', url: '/quiz' })).toBe('/quiz');
    expect(pushRoute({ type: 'x', url: '/pro?from=push' })).toBe('/pro?from=push');
    expect(pushRoute({ type: 'x', url: '/player/p1' })).toBe('/player/p1');
    expect(pushRoute({ type: 'x', url: '/tournament-player?tournament=t&player=p&match=m' })).toBe('/tournament-player?tournament=t&player=p&match=m');
  });
});

describe('safeAppPath', async () => {
  const { safeAppPath } = await import('./push');
  it('keeps queries and trims', () => {
    expect(safeAppPath(' /tournament/t1?draw=M ')).toBe('/tournament/t1?draw=M');
    expect(safeAppPath('/a\\b')).toBeNull();
    expect(safeAppPath('/results?at=10:00')).toBe('/results?at=10:00');
  });
});

describe('a tapped push waits for the app, then opens once', async () => {
  const { handlePushTap, takePendingPush, onPendingPush, setPendingPush } = await import('./push');
  const tap = (id: string, data: Record<string, unknown>) => ({ notification: { request: { identifier: id, content: { data } } } });
  it('the place waits until the main layout takes it, once', () => {
    expect(handlePushTap(tap('n1', { type: 'draw', tournament_id: T, tab: 'M', url: `/tournament/${T}?draw=M` }))).toBe(`/tournament/${T}?draw=M`);
    expect(takePendingPush()).toBe(`/tournament/${T}?draw=M`);
    expect(takePendingPush()).toBeNull();
  });
  it('the same notification read again (the launch tap) opens nothing more', () => {
    expect(handlePushTap(tap('n1', { type: 'draw', tournament_id: T }))).toBeNull();
    expect(takePendingPush()).toBeNull();
  });
  it('a newer tap replaces one still waiting (signed out, onboarding)', () => {
    handlePushTap(tap('n2', { type: 'claim', url: '/me' }));
    handlePushTap(tap('n3', { type: 'results', count: 1, url: '/?results=1' }));
    expect(takePendingPush()).toBe('/?results=1');
  });
  it('a tap with no data still opens the home', () => {
    handlePushTap(tap('n4', {}));
    expect(takePendingPush()).toBe('/');
  });
  it('the layout hears a new place while it is up', () => {
    let heard = 0;
    const off = onPendingPush(() => heard++);
    setPendingPush('/me');
    off();
    setPendingPush('/results');
    expect(heard).toBe(1);
    expect(takePendingPush()).toBe('/results');
  });
  it('no tap, nothing', () => expect(handlePushTap(null)).toBeNull());
});
