import { describe, expect, it } from 'vitest';
import { CAPPED_MOMENTS, dayKey, markSeen, parseSeen, showsProEntry, showsTrial, type ProMoment } from './proEntries';

const noon = new Date(2026, 9, 22, 12, 0);
const tomorrow = new Date(2026, 9, 23, 9, 0);

describe('proEntries', () => {
  it('names the day in local time', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('never shows to Pro players, on any moment', () => {
    const all: ProMoment[] = ['header', 'me', ...CAPPED_MOMENTS, 'opponent'];
    for (const moment of all) expect(showsProEntry({ moment, pro: true, seen: {}, now: noon })).toBe(false);
  });

  it('shows nothing while Pro is unknown', () => {
    expect(showsProEntry({ moment: 'header', pro: null, seen: {}, now: noon })).toBe(false);
    expect(showsProEntry({ moment: 'home', pro: null, seen: {}, now: noon })).toBe(false);
  });

  it('the header pill and Εγώ card are always there without Pro, even after a tap', () => {
    const seen = markSeen({}, 'header', noon);
    expect(seen).toEqual({});
    expect(showsProEntry({ moment: 'header', pro: false, seen, now: noon })).toBe(true);
    expect(showsProEntry({ moment: 'me', pro: false, seen, now: noon })).toBe(true);
  });

  it('a capped moment shows, rests the day it was tapped, and is back tomorrow', () => {
    expect(showsProEntry({ moment: 'result', pro: false, seen: {}, now: noon })).toBe(true);
    const seen = markSeen({}, 'result', noon);
    expect(showsProEntry({ moment: 'result', pro: false, seen, now: noon })).toBe(false);
    expect(showsProEntry({ moment: 'result', pro: false, seen, now: tomorrow })).toBe(true);
  });

  it('moments rest on their own', () => {
    const seen = markSeen({}, 'follow', noon);
    expect(showsProEntry({ moment: 'follow', pro: false, seen, now: noon })).toBe(false);
    expect(showsProEntry({ moment: 'home', pro: false, seen, now: noon })).toBe(true);
    expect(showsProEntry({ moment: 'player', pro: false, seen, now: noon })).toBe(true);
  });

  it('a capped entry waits for storage to be read', () => {
    expect(showsProEntry({ moment: 'home', pro: false, seen: {}, now: noon, ready: false })).toBe(false);
    expect(showsProEntry({ moment: 'header', pro: false, seen: {}, now: noon, ready: false })).toBe(true);
  });

  it('the opponent door on the scout is not capped', () => {
    expect(markSeen({}, 'opponent', noon)).toEqual({});
    expect(showsProEntry({ moment: 'opponent', pro: false, seen: {}, now: noon })).toBe(true);
  });

  it('reads storage safely', () => {
    expect(parseSeen(null)).toEqual({});
    expect(parseSeen('not json')).toEqual({});
    expect(parseSeen('[1]')).toEqual({});
    expect(parseSeen(JSON.stringify({ home: '2026-10-22', result: 5, bogus: '2026-10-22', follow: 'today' }))).toEqual({ home: '2026-10-22' });
  });

  it('says the free week only when the server does', () => {
    expect(showsTrial(false, true)).toBe(true);
    expect(showsTrial(false, false)).toBe(false);
    expect(showsTrial(false, undefined)).toBe(false);
    expect(showsTrial(true, true)).toBe(false);
    expect(showsTrial(null, true)).toBe(false);
  });
});
