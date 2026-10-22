import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { RpcError, type FeedMatchCard, type FeedPlayer, type FeedPostponedCard, type FeedResultCard } from '@netprophet/db';
import { authErrorKind } from './authErrors';
import { feedDay, fromFeedCard, fromPostponedCard, postponedLast, splitToday, fromResultCard, fromSponsored, initials, toDbSide, toUiSide, voteErrorKind, when } from './feed';

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
    // the tournament heads its run of cards, so the card keeps the time and round
    expect(c.meta).toBe('Σήμερα 18:00 · Ημιτελικός');
    expect(c.group?.title).toBe('Open Γλυφάδας');
    expect(c.group?.logo).toBeNull();
    expect(c.place).toBeUndefined();
    expect(c.doubles).toBe(false);
    expect(c.tournamentId).toBe('t'); // a hold on a name opens the run in this tournament
    expect(c.a).toEqual({ people: [{ id: 'p', surname: 'Πράτσας', first: 'Νίκος', initials: 'ΝΠ', look: null }], sub: 'Γλυφάδα', level: null, area: 'Γλυφάδα' }); // players' levels are hidden (14 Oct)
    // unknown area and no level: no sub line
    expect(c.b).toEqual({ people: [{ id: 'p', surname: 'Βλάχος', first: 'Γιώργος', initials: 'ΓΒ', look: null }], sub: null, level: null, area: null });
    expect(c.myVote).toBeUndefined();
  });

  it('carries when voting closes: a match with no time stays open on its day until the lock', () => {
    const untimed = fromFeedCard(card({ starts_at: '2026-10-08T21:00:00Z', lock_at: '2026-10-09T11:00:00Z' }), areas, t, NOW);
    expect(untimed.lockAt).toBe('2026-10-09T11:00:00Z');
    expect(untimed.closed).toBeUndefined();
    expect(fromFeedCard(card(), areas, t, NOW).lockAt).toBeUndefined();
  });

  it('carries the tournament logo to its group head', () => {
    const c = fromFeedCard(card({ tournament: { id: 't1', name: 'Open Γλυφάδας', logo: 'tournaments/t1/k1.png' } }), areas, t, NOW);
    expect(c.group?.logo).toBe('tournaments/t1/k1.png');
  });

  it('gives the surface its own pill on the group head, out of the place line', () => {
    const c = fromFeedCard(card({ club: 'Γήπεδα Γλυφάδας', surface: 'clay' }), areas, t, NOW);
    expect(c.group?.surface).toBe('clay');
    expect(c.group?.sub).toBe('Γήπεδα Γλυφάδας');
  });

  it('puts a friendly the prototype way: round text, then the venue', () => {
    const c = fromFeedCard(card({ round: 'Φιλικό', tournament: null }), areas, t, NOW);
    expect(c.meta).toBe('Σήμερα 18:00 · Φιλικό · Γλυφάδα');
    expect(c.group).toBeUndefined();
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
    expect(c.meta).toBe('Σήμερα 18:00 · Φιλικό · Γλυφάδα');
    expect(c.category).toBe('Μικτό');
    expect(c.doubles).toBe(true);
    expect(c.a.people.map((p) => p.initials)).toEqual(['ΜΚ', 'ΝΠ']);
    expect(c.a.sub).toBeNull(); // players' levels are hidden (14 Oct)
    // a missing level hides the line rather than printing «null»
    expect(c.b.sub).toBeNull();
  });

  it('shows an organiser sheet\'s capital category in a normal case, on the card and so on its head', () => {
    expect(fromFeedCard(card({ level: 'MEDIUM' }), areas, t, NOW).category).toBe('Medium');
    expect(fromFeedCard(card({ level: 'Μ 50+' }), areas, t, NOW).category).toBe('Μ 50+');
  });

  it('carries an earlier vote and its split, so the card starts folded', () => {
    const c = fromFeedCard(card({ my_vote: 2, split: { total: 10, side1: 3, side2: 7, pct1: 30, pct2: 70 } }), areas, t, NOW);
    expect(c.myVote).toBe('b');
    expect(c.split).toEqual({ pctA: 30, pctB: 70 });
  });
  it('a closed match keeps its card, with the split and no voting', () => {
    const c = fromFeedCard(card({ closed: true, split: { total: 4, side1: 1, side2: 3, pct1: 25, pct2: 75 } }), areas, t, NOW);
    expect(c.closed).toBe(true);
    expect(c.split).toEqual({ pctA: 25, pctB: 75 });
    expect(fromFeedCard(card(), areas, t, NOW).closed).toBeUndefined();
  });

  it('maps a sponsored card', () => {
    expect(
      fromSponsored({ kind: 'sponsored', id: 's1', label: 'Χορηγούμενο', sponsor: 'X', title: 'Πλέξιμο ρακέτας από 12€', subtitle: null, cta_url: null, image_url: null, art: 'strings' }),
    ).toEqual({ kind: 'sponsored', id: 's1', label: 'Χορηγούμενο', sponsor: 'X', title: 'Πλέξιμο ρακέτας από 12€', subtitle: null, ctaUrl: null, imageUrl: null, art: 'strings' });
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

describe('put-off matches', () => {
  it('moved_from adds the «Νέα μέρα» chip and the old day after the time', () => {
    const c = fromFeedCard(card({ moved_from: '2026-10-06T15:30:00Z' }), { glyfada: 'Γλυφάδα' }, t, NOW);
    expect(c.moved).toEqual({ chip: 'Νέα μέρα', was: '(ήταν Τρι 6/10)', head: 'Σήμερα 18:00', tail: 'Ημιτελικός' });
    expect(fromFeedCard(card(), {}, t, NOW).moved).toBeUndefined();
  });
  const postponed = (over: Partial<FeedPostponedCard> = {}): FeedPostponedCard => ({
    kind: 'postponed',
    match_id: 'p1',
    format: 'singles',
    starts_at: '2026-10-13T15:30:00Z',
    tournament: { id: 't', name: 'Open Γλυφάδας' },
    sides: card().sides,
    my_vote: null,
    ...over,
  });
  it('a postponed card names the tournament and the original time', () => {
    const c = fromPostponedCard(postponed(), {}, t);
    expect(c.chip).toBe('Αναβλήθηκε');
    expect(c.meta).toBe('Open Γλυφάδας · ήταν Τρι 13/10 18:30');
    expect(c.note).toBe('Θα δεις τη νέα μέρα εδώ.');
    expect(c.a.people[0]!.surname).toBe('Πράτσας');
  });
  it('says the vote stays when the user voted', () => {
    expect(fromPostponedCard(postponed({ my_vote: 1 }), {}, t).note).toBe('Η ψήφος σου μένει. Θα δεις τη νέα μέρα εδώ.');
  });
  it('copes with no tournament and no time', () => {
    expect(fromPostponedCard(postponed({ tournament: null, starts_at: null }), {}, t).meta).toBe('');
    expect(fromPostponedCard(postponed({ tournament: null }), {}, t).meta).toBe('ήταν Τρι 13/10 18:30');
  });
  it('postponed cards go last, order kept', () => {
    const k = (kind: string, id: string) => ({ kind, id });
    expect(postponedLast([k('postponed', 'a'), k('match', 'b'), k('sponsored', 'c'), k('postponed', 'd'), k('match', 'e')]).map((x) => x.id)).toEqual(['b', 'c', 'e', 'a', 'd']);
  });
});

describe('splitToday', () => {
  const c = (id: string, later: boolean, startsAt?: string) => ({ kind: 'match', id, later, startsAt });
  it('runs today and the later days in time order', () => {
    const cards = [
      c('t2', false, '2026-10-18T19:00:00Z'),
      c('wed', true, '2026-10-21T08:00:00Z'),
      c('t1', false, '2026-10-18T09:00:00Z'),
      c('mon-late', true, '2026-10-19T17:00:00Z'),
      c('tue', true, '2026-10-20T10:00:00Z'),
      c('mon-early', true, '2026-10-19T07:00:00Z'),
    ];
    const s = splitToday(cards);
    expect(s.today.map((x) => x.id)).toEqual(['t1', 't2']);
    expect(s.later.map((x) => x.id)).toEqual(['mon-early', 'mon-late', 'tue', 'wed']);
  });
  it('puts a later match without a time last, keeping the rest stable', () => {
    const s = splitToday([c('x', true), c('a', true, '2026-10-20T10:00:00Z'), c('b', true, '2026-10-20T10:00:00Z')]);
    expect(s.later.map((x) => x.id)).toEqual(['a', 'b', 'x']);
  });
});

describe('splitToday, by tournament', () => {
  const m = (id: string, g: string | null, at: string, closed = false, later = false) =>
    ({ kind: 'match', id, startsAt: `2026-10-19T${at}:00Z`, closed, later, group: g ? { key: g } : undefined });
  it('keeps each tournament together, led by its next match to vote', () => {
    const s = splitToday([
      m('aok-1', 'aok', '09:00'),
      m('glyf-1', 'glyf', '10:00'),
      m('aok-2', 'aok', '12:00'),
      m('solo', null, '11:00'),
      m('glyf-0', 'glyf', '08:00', true),
      { kind: 'sponsored', id: 'ad' },
      m('done-1', 'done', '07:00', true),
    ]);
    expect(s.today.map((x) => x.id)).toEqual(['aok-1', 'aok-2', 'glyf-1', 'glyf-0', 'solo', 'ad', 'done-1']);
  });
  it('keeps each tournament together on later days too, led by its first match', () => {
    const s = splitToday([
      { ...m('b-tue', 'b', '09:00', false, true), startsAt: '2026-10-20T09:00:00Z' },
      { ...m('a-tue', 'a', '18:00', false, true), startsAt: '2026-10-20T18:00:00Z' }, m('a-mon-2', 'a', '18:00', false, true),
      m('b-mon', 'b', '10:00', false, true),
      m('a-mon-1', 'a', '08:00', false, true),
    ]);
    expect(s.later.map((x) => x.id)).toEqual(['a-mon-1', 'a-mon-2', 'a-tue', 'b-mon', 'b-tue']);
  });
});

describe('feedDay', () => {
  it('is today until 23:00 in Athens, then tomorrow', () => {
    expect(feedDay(new Date('2026-10-18T19:59:00Z'))).toBe('2026-10-18'); // 22:59 Athens
    expect(feedDay(new Date('2026-10-18T20:00:00Z'))).toBe('2026-10-19'); // 23:00 Athens
    expect(feedDay(new Date('2026-10-18T21:30:00Z'))).toBe('2026-10-19'); // 00:30 Athens, already the 19th
  });
});

describe('splitToday, today', () => {
  it('puts the matches to vote first in time order, then ads, then the started ones', () => {
    const s = splitToday([
      { kind: 'match', id: 'started', closed: true, startsAt: '2026-10-18T07:00:00Z' },
      { kind: 'sponsored', id: 'ad' },
      { kind: 'match', id: 'late', startsAt: '2026-10-18T18:00:00Z' },
      { kind: 'match', id: 'early', startsAt: '2026-10-18T09:00:00Z' },
    ]);
    expect(s.today.map((x) => x.id)).toEqual(['early', 'late', 'ad', 'started']);
  });
});

describe('voting made obvious (founder, 18 Oct)', () => {
  it('carries the start time on the card', () => {
    expect(fromFeedCard(card(), {}, t, NOW).startsAt).toBe('2026-10-09T15:00:00Z');
    expect(fromFeedCard(card({ starts_at: null }), {}, t, NOW).startsAt).toBeUndefined();
  });
});
