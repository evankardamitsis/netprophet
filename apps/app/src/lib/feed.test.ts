import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { RpcError, type FeedMatchCard, type FeedPlayer, type FeedResultCard } from '@netprophet/db';
import { authErrorKind } from './authErrors';
import { fromFeedCard, fromResultCard, fromSponsored, initials, toDbSide, toUiSide, voteErrorKind, when } from './feed';

const t = getCopy('el');
// 9 Oct 2026, 12:00 Athens (UTC+3)
const NOW = new Date('2026-10-09T09:00:00Z');

const player = (over: Partial<FeedPlayer> = {}): FeedPlayer => ({
  id: 'p',
  first_name: 'Νίκος',
  surname: 'Πράτσας',
  photo_path: null,
  area_id: 'glyfada',
  level_tier: 4,
  level_direction: null,
  ...over,
});

const card = (over: Partial<FeedMatchCard> = {}): FeedMatchCard => ({
  kind: 'match',
  match_id: 'm1',
  format: 'singles',
  starts_at: '2026-10-09T15:00:00Z',
  venue: 'Γλυφάδα',
  round: 'semi',
  status: 'scheduled',
  tournament: { id: 't', name: 'Open Γλυφάδας' },
  sides: [
    { side: 1, players: [player()] },
    { side: 2, players: [player({ first_name: 'Γιώργος', surname: 'Βλάχος', area_id: 'unknown', level_tier: null })] },
  ],
  in_circle: false,
  my_vote: null,
  split: null,
  ...over,
});

describe('sides', () => {
  it('maps database 1/2 to ui a/b and back', () => {
    expect(toUiSide(1)).toBe('a');
    expect(toUiSide(2)).toBe('b');
    expect(toDbSide('a')).toBe(1);
    expect(toDbSide('b')).toBe(2);
  });
});

describe('when', () => {
  it('labels today and tomorrow in Athens time', () => {
    expect(when('2026-10-09T15:00:00Z', NOW, t)).toEqual({ label: 'Σήμερα 18:00', learn: t.match.learnTonight });
    expect(when('2026-10-10T07:30:00Z', NOW, t)).toEqual({ label: 'Αύριο 10:30', learn: t.match.learnTomorrow });
  });
  it('uses the Athens day, not the UTC day', () => {
    // 22:30 UTC on the 9th is 01:30 on the 10th in Athens
    expect(when('2026-10-09T22:30:00Z', NOW, t).label).toBe('Αύριο 01:30');
  });
  it('uses the weekday further out (prototype: Σήμερα, Αύριο, Κυριακή), and «μετά το ματς» without a time', () => {
    // 11 Oct 2026 is a Sunday, 12 Oct a Monday
    expect(when('2026-10-11T08:00:00Z', NOW, t).label).toBe('Κυριακή 11:00');
    expect(when('2026-10-12T16:00:00Z', NOW, t)).toEqual({ label: 'Δευτέρα 19:00', learn: t.match.learnAfter });
    expect(when(null, NOW, t)).toEqual({ label: null, learn: t.match.learnAfter });
  });
});

describe('initials', () => {
  it('takes first letters as capitals without accents', () => {
    expect(initials('Νίκος', 'Ροδίτης')).toBe('ΝΡ');
    expect(initials('Άννα', 'Μάνου')).toBe('ΑΜ');
    expect(initials('Έλενα Ίριδα')).toBe('ΕΙ');
    expect(initials(null, undefined)).toBe('');
    expect(initials('kostas@test.gr')).toBe('K');
  });
});

describe('fromFeedCard', () => {
  const areas = { glyfada: 'Γλυφάδα' };

  it('builds the meta line and both sides', () => {
    const c = fromFeedCard(card(), areas, t, NOW);
    expect(c.meta).toBe('Σήμερα 18:00 · Open Γλυφάδας · Ημιτελικός');
    expect(c.doubles).toBe(false);
    expect(c.a).toEqual({ people: [{ surname: 'Πράτσας', first: 'Νίκος', initials: 'ΝΠ' }], sub: 'level 4 · Γλυφάδα' });
    // unknown area and no level: no sub line
    expect(c.b).toEqual({ people: [{ surname: 'Βλάχος', first: 'Γιώργος', initials: 'ΓΒ' }], sub: null });
    expect(c.myVote).toBeUndefined();
  });

  it('puts a friendly the prototype way: round text, then the venue', () => {
    const c = fromFeedCard(card({ round: 'Φιλικό', tournament: null }), areas, t, NOW);
    expect(c.meta).toBe('Σήμερα 18:00 · Φιλικό · Γλυφάδα');
  });

  it('marks doubles and mixed, stacks partners and joins levels', () => {
    const c = fromFeedCard(
      card({
        format: 'mixed',
        round: 'Φιλικό',
        tournament: null,
        sides: [
          { side: 1, players: [player({ first_name: 'Μαρία', surname: 'Καρρά', level_tier: 5 }), player({ level_tier: 5 })] },
          { side: 2, players: [player(), player({ level_tier: null })] },
        ],
      }),
      areas,
      t,
      NOW,
    );
    expect(c.meta).toBe('Σήμερα 18:00 · Μικτό · Φιλικό · Γλυφάδα');
    expect(c.doubles).toBe(true);
    expect(c.a.people.map((p) => p.initials)).toEqual(['ΜΚ', 'ΝΠ']);
    expect(c.a.sub).toBe('level 5 & 5');
    // a missing level hides the line rather than printing «null»
    expect(c.b.sub).toBeNull();
  });

  it('carries an earlier vote and its split, so the card starts folded', () => {
    const c = fromFeedCard(card({ my_vote: 2, split: { total: 10, side1: 3, side2: 7, pct1: 30, pct2: 70 } }), areas, t, NOW);
    expect(c.myVote).toBe('b');
    expect(c.split).toEqual({ pctA: 30, pctB: 70 });
  });

  it('maps a sponsored card', () => {
    expect(
      fromSponsored({ kind: 'sponsored', id: 's1', label: 'Χορηγούμενο', sponsor: 'X', title: 'Πλέξιμο ρακέτας από 12€', subtitle: null, cta_url: null }),
    ).toEqual({ kind: 'sponsored', id: 's1', label: 'Χορηγούμενο', title: 'Πλέξιμο ρακέτας από 12€', subtitle: null });
  });
});

describe('error mapping', () => {
  it('tells closed votes apart from other failures', () => {
    expect(voteErrorKind(new RpcError('cast_vote', 'voting_closed', 'P0001', 'voting_closed'))).toBe('votingClosed');
    expect(voteErrorKind(new RpcError('cast_vote', 'already_voted', '23505', 'already_voted'))).toBe('votingClosed');
    expect(voteErrorKind(new Error('network'))).toBe('voteFailed');
  });
  it('maps auth errors to what the sign-in screen shows', () => {
    expect(authErrorKind({ status: 429, message: 'rate limit' })).toBe('tooMany');
    expect(authErrorKind({ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' })).toBe('badCode');
    expect(authErrorKind({ status: 400, code: 'email_address_invalid', message: 'bad' })).toBe('invalidEmail');
    expect(authErrorKind({ status: 500, message: 'boom' })).toBe('generic');
    expect(authErrorKind({ status: 500, message: 'Error sending magic link OTP to provider' })).toBe('generic');
  });
});

describe('fromResultCard', () => {
  const sides = (dbl = false) => [
    { side: 1 as const, players: [player(), ...(dbl ? [player({ first_name: 'Ηλίας', surname: 'Μέμμος' })] : [])] },
    { side: 2 as const, players: [player({ first_name: 'Γιώργος', surname: 'Δεσύπρης' }), ...(dbl ? [player({ first_name: 'ΑΝΝΑ', surname: 'ΜΑΝΟΥ' })] : [])] },
  ];
  const result = (payload: Partial<FeedResultCard['payload']>): FeedResultCard => ({
    kind: 'result',
    id: 'inbox-1',
    created_at: '2026-10-09T20:00:00Z',
    payload: {
      match_id: 'm1', vote_id: 'v1', outcome: 'correct', points: 10, upset: false, streak: 4, freeze_used: false,
      winner_side: 1, score: '2-0', sets: [{ w: 6, l: 3 }, { w: 7, l: 5 }], sides: sides(),
      streak_event: { kind: 'advanced', milestone: null }, ...payload,
    },
  });

  it('a right call: who won, against whom, the sets and the pill', () => {
    const c = fromResultCard(result({}), t);
    expect(c).toMatchObject({
      ok: true, points: 10, streakBefore: 3, streak: 4, frozen: false,
      winnerSurname: 'Πράτσας', winnerFirst: 'Νίκος', line: 'κέρδισε τον Γιώργο Δεσύπρη', sets: '6-3, 7-5',
      pill: '+10 · σερί 4',
    });
  });

  it('an upset pays what the server says', () => {
    expect(fromResultCard(result({ points: 30, upset: true }), t).pill).toBe('+30 · σερί 4');
  });

  it('a wrong call saved by a freeze keeps the σερί', () => {
    const c = fromResultCard(result({ outcome: 'wrong', points: 0, streak: 4, streak_event: { kind: 'frozen', freezeUsed: 'free' } }), t);
    expect(c).toMatchObject({ ok: false, frozen: true, streakBefore: 4, streak: 4, pill: 'κράτησες το σερί' });
  });

  it('a wrong call that breaks the σερί shows no pill and remembers what was lost', () => {
    const c = fromResultCard(result({ outcome: 'wrong', points: 0, streak: 0, streak_event: { kind: 'broken', lostStreak: 6 } }), t);
    expect(c).toMatchObject({ ok: false, frozen: false, streakBefore: 6, streak: 0, pill: null });
  });

  it('doubles: both winners and the plural line', () => {
    const c = fromResultCard(result({ sides: sides(true) }), t);
    expect(c.winnerSurname).toBe('Πράτσας & Μέμμος');
    expect(c.line).toBe('κέρδισαν τους Γιώργο Δεσύπρη & ΑΝΝΑ ΜΑΝΟΥ');
  });
});
