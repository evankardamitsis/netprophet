/**
 * The player emails in English (app 1.0.1, profiles.locale = 'en'): every kind renders in English, with no Greek left
 * in it except the player names (as written, Greek script, undeclined) and the data that is Greek by nature
 * (tournament names). The Greek emails are covered, unchanged, by the tests next to this one.
 */
import { describe, expect, it } from 'vitest';
import { KNOWN_KINDS, renderDue, type DueEmail } from './index';
import { launchEmail } from './list';
import { dayMonth, euro, planPrice } from './pro';
import { mondayStreakLines } from './streak';

const TOKEN = '11111111-2222-3333-4444-555555555555';
const base: DueEmail = {
  id: '00000000-0000-0000-0000-000000000009',
  kind: 'welcome',
  group: 'game',
  to: 'nikos@example.com',
  payload: {},
  first_name: 'Νίκος',
  gender: null,
  lang: 'en',
  unsubscribe_token: TOKEN,
};

const ENDS = '2026-11-24T13:00:00+00:00';
const PRO = { product_id: 'pro_founding', price: 49.99, renews: 69.99, period: 'year', store: 'APP_STORE', trial: true, ends_at: ENDS };
const match = { date: '2027-03-11', time: '17:00', a: 'Γιώργος Μέμμος', b: 'Ηλίας Λάππας', tournament: 'Athens Tennis' };
const result = { date: '2027-03-05', winner: 'Σπύρος Σαπουντζής', loser: 'Παύλος Κλαμπάνης', score: '2-1', walkover: false, tournament: 'Taf Open' };

/** the payloads of the Greek tests, per kind and branch */
const CASES: [string, Partial<DueEmail>][] = [
  ['welcome', {}],
  ['claim_ok', { group: 'account', payload: { player_name: 'Νίκος Παπαχρήστος' } }],
  ['claim_no', { group: 'account', payload: { player_name: 'Νίκος Παπαχρήστος' } }],
  ['new_player_ok', { group: 'account' }],
  ['new_player_no', { group: 'account', payload: { player_name: 'Νίκος Παπαχρήστος' } }],
  ['deleted', { group: 'account' }],
  ['pro_welcome', { group: 'pro', payload: PRO }],
  ['pro_trial_day5', { group: 'pro', payload: { ...PRO, store: 'PLAY_STORE' } }],
  ['pro_trial_day5', { group: 'pro', payload: { ends_at: ENDS, store: 'STRIPE' } }],
  ['pro_cancel', { group: 'pro', payload: PRO }],
  ['pro_winback', { group: 'pro', payload: { store: 'APP_STORE', code: 'ABC12345', code_expires_at: '2027-01-15T21:59:59+00:00' } }],
  ['site_confirm', { group: 'list' }],
  ['site_weekly', { group: 'list', payload: { played: 5, next: 9, next_tournament: 'Taf Open', next_tournament_n: 6 } }],
  ['launch_v1', { group: 'list' }],
  ['day1_vote', { payload: { open: 14, matches: [match, { ...match, time: null, tournament: null }] } }],
  ['day3_follow', { payload: { players: [{ name: 'Γιώργος Μέμμος', matches: 12 }] } }],
  ['day7_week', { payload: { votes: 15, resolved: 14, correct: 9, streak: 4, points: 1210, ladder: { tier: 'bronze', place: 6, size: 20 } } }],
  ['day7_week', { payload: { resolved: 14, correct: 5, ladder: { tier: 'gold', place: 2, size: 20 } } }],
  ['day14_missed', { payload: { upsets: 3, upset_list: [{ ...result, share: 18 }], followed: [{ ...result, player: 'Σπύρος Σαπουντζής', won: true }] } }],
  ['monday', { payload: { date: '2027-03-08', votes: 0, streak: 6, ladder: { place: 21 }, followed: [match], days: { n: 6, played: 6, frozen: ['2027-03-04'] } } }],
  ['month_close', { payload: { month: '2026-11', tier: 'silver', place: 5, size: 20, points: 140, outcome: 'promoted', next_tier: 'gold', next_month: '2026-12' } }],
  ['month_close', { payload: { month: '2026-04', tier: 'silver', place: 18, outcome: 'relegated', next_tier: 'bronze', next_month: '2026-05' } }],
  ['month_close', { payload: { month: '2026-11', place: 5, outcome: 'stayed', next_tier: 'silver', next_month: '2026-12' } }],
  ['away30', { payload: { days: 30, near: true, tournaments: 2, matches: 1312 } }],
  ['streak_lost', { payload: { n: 7, best: 12, freezes: 0 } }],
  ['streak_lost', { payload: { n: 7, freezes: 2 } }],
  ['streak_milestone', { payload: { n: 30, frame: 'frame_month' } }],
  ['streak_milestone', { payload: { n: 100, frame: 'frame_hundred' } }],
  ['streak_milestone', { payload: { n: 50 } }],
  ['streak_reminder_email', { payload: { n: 6, freezes: 1, next_frame: 'frame_seven' } }],
  ['streak_reminder_email', { payload: { n: 1 } }],
];
const render = (kind: string, over: Partial<DueEmail> = {}) => renderDue({ ...base, kind, ...over })!;
const all = () => CASES.map(([kind, over]) => [kind, render(kind, over)] as const);

/** the names and Greek data in the payloads above; everything else must be English */
const DATA = /Νίκος Παπαχρήστος|Νίκος|Γιώργος Μέμμος|Ηλίας Λάππας|Σπύρος Σαπουντζής|Παύλος Κλαμπάνης/g;
const GREEK = /[Ͱ-Ͽἀ-῿]/;
const preheader = (html: string) => html.match(/opacity:0">([^&]*)&#8199;/)?.[1] ?? '';

describe('the emails in English', () => {
  it('cover every kind this build renders', () => {
    expect(new Set(CASES.map(([k]) => k))).toEqual(new Set(KNOWN_KINDS));
  });

  it.each(all())('%s: no Greek in the subject, preheader, body or footer, except the names', (_kind, m) => {
    for (const part of [m.subject, m.html, m.text]) expect(part.replace(DATA, '')).not.toMatch(GREEK);
    expect(preheader(m.html).length).toBeGreaterThan(5);
    expect(m.html).toContain('<html lang="en"');
  });

  it.each(KNOWN_KINDS)('%s renders in English with an empty payload («Send me a test»)', (kind) => {
    const m = renderDue({ ...base, kind, first_name: null, payload: { test: true, ends_at: ENDS, code: 'ABC12345' } })!;
    expect(m).not.toBeNull();
    for (const part of [m.subject, m.html, m.text]) {
      expect(part).not.toMatch(GREEK);
      expect(part).not.toMatch(/undefined|null|NaN/);
    }
  });

  it.each(all())('%s follows the English copy rules', (_kind, m) => {
    for (const part of [m.subject, m.html, m.text]) {
      expect(part).not.toContain('\u2014');
      expect(part).not.toMatch(/\b(bets?|betting|odds|wager\w*|stakes?|winnings|punt\w*)\b/i);
      expect(part).not.toMatch(/league/i);
    }
  });

  it('keeps names as written: Greek script, not declined, not transliterated', () => {
    expect(render('welcome').subject).toBe('You’re in, Νίκος. Let’s go!');
    expect(render('away30').subject).toBe('It’s been a while, Νίκος');
    expect(render('claim_ok', { group: 'account', payload: { player_name: 'Νίκος Παπαχρήστος' } }).text).toContain(
      'We linked your account to the profile Νίκος Παπαχρήστος.',
    );
    expect(render('day1_vote', { payload: { open: 1, matches: [match] } }).html).toContain('Γιώργος Μέμμος - Ηλίας Λάππας');
  });

  it('the footer, the Unsubscribe link and the account deletion page are in English', () => {
    const m = render('welcome');
    expect(m.html).toContain('Unsubscribe');
    expect(m.unsubscribeUrl).toBe(`https://www.netprophetapp.com/email/unsubscribe?t=${TOKEN}&l=en`);
    expect(m.html).not.toContain('Διαγραφή');
    expect(m.html).toContain('/en/privacy');
    expect(m.html).toContain('You got this email because you made a NetProphet account.');
    expect(render('deleted', { group: 'account' }).html).toContain('https://www.netprophetapp.com/en/delete-account');
  });

  it('writes numbers, prices and dates the English way', () => {
    expect(euro(8.99, 'en')).toBe('€8.99');
    expect(dayMonth(ENDS, 'en')).toBe('24 November');
    expect(dayMonth('2026-12-31T23:30:00Z', 'en')).toBe('1 January');
    expect(planPrice({ price: 49.99, renews: 69.99, period: 'year' }, 'en')?.full).toBe('€49.99 for the first year, €69.99 a year after that');
    expect(planPrice({ price: 8.99, period: 'month' }, 'en')?.full).toBe('€8.99 a month');
    expect(render('day7_week', CASES[16]![1]).html).toContain('1,210');
    expect(render('away30', CASES[23]![1]).text).toContain('1,312 matches have been played since.');
  });

  it('pro: the dates, the prices and the store in English', () => {
    expect(render('pro_welcome', { group: 'pro', payload: PRO }).text).toContain(
      'Your free week ends on 24 November. Then €49.99 for the first year, €69.99 a year after that.',
    );
    const day5 = render('pro_trial_day5', { group: 'pro', payload: { ...PRO, price: 8.99, renews: null, period: 'month' } });
    expect(day5.subject).toBe('2 more days free');
    expect(day5.text).toContain('Staying? Do nothing. Your subscription starts on 24 November: €8.99 a month.');
    expect(day5.text).toContain('Cancel it in your App Store subscriptions before 24 November. You pay nothing.');
    const winback = render('pro_winback', CASES[10]![1]);
    expect(winback.html).toContain('<s>€8.99</s>');
    expect(winback.html).toContain('€4.49');
    expect(winback.text).toContain('good until 15 January');
    expect(render('pro_cancel', { group: 'pro', payload: { ...PRO, ends_at: '2026-12-24T10:00:00Z' } }).subject).toBe('Your Pro ends on 24 December');
  });

  it('series: places as English ordinals, Ladder tiers, the month and the weekday', () => {
    const week = render('day7_week', CASES[16]![1]);
    expect(week.subject).toBe('Your first week: 9 of 14');
    expect(week.html).toContain('You’re 3 places from a medal.');
    expect(week.html).toContain('You’re 6th.');
    expect(week.html).toContain('Bronze · 20 players');
    expect(week.html).toContain('YOUR LADDER');
    const monday = render('monday', { payload: { date: '2027-03-08', resolved: 16, correct: 11, votes: 17, ladder: { place: 4 }, followed: [match] } });
    expect(monday.subject).toBe('11 of 16. Have a good week!');
    expect(monday.html).toContain('MONDAY · 8 MARCH');
    expect(monday.html).toContain('4th');
    expect(monday.html).toContain('THURSDAY · 17:00 · ATHENS TENNIS');
    const close = render('month_close', CASES[20]![1]);
    expect(close.subject).toBe('November is over: 5th of 20');
    expect(close.text).toContain('You’re moving up! In December you play in Gold ↑.');
    expect(render('month_close', CASES[22]![1]).text).toContain('In December you stay in Silver. New month, new Ladder.');
    expect(render('day14_missed', CASES[18]![1]).html).toContain('Σπύρος Σαπουντζής: won');
  });

  it('streak: the σερί is the streak, the Ασφάλεια the Streak Freeze, Frames by their English names', () => {
    const lost = render('streak_lost', { payload: { n: 7, best: 12, freezes: 0 } });
    expect(lost.subject).toBe('Your streak ended at 7 days');
    expect(lost.html).toContain('YOUR STREAK');
    expect(lost.html).toContain('A free Streak Freeze');
    const milestone = render('streak_milestone', { payload: { n: 30, frame: 'frame_month' } });
    expect(milestone.subject).toBe('A whole month in a row!');
    expect(milestone.html).toContain('ACHIEVEMENT');
    expect(milestone.html).toContain('You earned: Frame «Month»');
    const reminder = render('streak_reminder_email', { payload: { n: 6, freezes: 1, next_frame: 'frame_seven' } });
    expect(reminder.subject).toBe('Your streak is at risk');
    expect(reminder.html).toContain('Play today and you get: Frame «Seven» and a Streak Freeze.');
    expect(reminder.html).toContain('UP FOR GRABS TODAY');
    expect(render('streak_reminder_email', { payload: { n: 1 } }).text).toContain('You started a streak yesterday. Play today too and make it 2.');
  });

  it('the Monday streak line in English', () => {
    expect(mondayStreakLines({ days: { n: 6, played: 6, frozen: ['2027-03-04'] } }, 'en')).toEqual([
      '6 days in a row · 6 of 7 last week',
      'Your Streak Freeze covered Thursday.',
    ]);
    expect(mondayStreakLines({ days: { n: 1, played: 5, frozen: ['2027-03-01', '2027-03-06'] } }, 'en')).toEqual([
      '1 day in a row · 5 of 7 last week',
      'Your Streak Freezes covered Monday and Saturday.',
    ]);
  });

  it('launch_v1 in English for an English row, Greek by default', () => {
    expect(render('launch_v1', { group: 'list' }).subject).toBe('NetProphet has changed. Come and see.');
    expect(launchEmail({ lang: 'en' }).html).toContain('https://www.netprophetapp.com/email/screens/big-01-vote.jpg');
    expect(launchEmail().subject).toBe('Το NetProphet άλλαξε. Έλα να το ανακαλύψεις.');
    expect(renderDue({ ...base, lang: 'el', kind: 'launch_v1', group: 'list' })!.subject).toBe('Το NetProphet άλλαξε. Έλα να το ανακαλύψεις.');
  });
});
