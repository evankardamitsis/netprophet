import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { UpcomingTournament } from '@netprophet/db';
import { deadlineLine, nextFooter, nextRow } from './nextTournament';

const t = getCopy('el');

const item = (over: Partial<UpcomingTournament>): UpcomingTournament => ({
  id: 'a', name: 'Κύπελλο Βούλας', venue: 'Ο.Α. Βούλας', area_id: 'voula', area: 'Βούλα', surface: 'clay',
  starts_on: '2026-10-25', ends_on: '2026-10-27', entry_deadline: '2026-10-23', entry_open: true,
  entry_link: 'https://example.org/entry', categories: ['Μ 40+', 'MEDIUM'], played_before: false, near: true, ...over,
});

describe('next tournament', () => {
  it('the deadline line names the weekday and the date', () => {
    expect(deadlineLine(item({}), t)).toBe('Δηλώσεις έως Παρ 23/10');
    expect(deadlineLine(item({ entry_deadline: '2026-10-22' }), t)).toBe('Δηλώσεις έως Πεμ 22/10');
    expect(deadlineLine(item({ entry_open: false }), t)).toBe('Οι δηλώσεις έκλεισαν');
    expect(deadlineLine(item({ entry_deadline: null, entry_open: false }), t)).toBeNull();
  });

  it('a row: area, dates and surface; the categories; the link only while entries are open', () => {
    const r = nextRow(item({}), t);
    expect(r.where).toBe('Βούλα · 25/10 έως 27/10 · Χώμα');
    expect(r.categories).toBe('Μ 40+ · MEDIUM');
    expect(r.link).toBe('https://example.org/entry');
    expect(nextRow(item({ entry_open: false }), t).link).toBeNull();
    expect(nextRow(item({ entry_link: null }), t).link).toBeNull();
  });

  it('a row leaves out what is missing', () => {
    const r = nextRow(item({ area: null, venue: null, ends_on: null, surface: null, categories: [] }), t);
    expect(r.where).toBe('25/10');
    expect(r.categories).toBeNull();
  });

  it('the footer: Pro has the reminder on, free is led to Pro', () => {
    expect(nextFooter({ pro: true, more: 0 }, t)).toEqual({ text: '✓ Σου θυμίζουμε 2 μέρες πριν κλείσουν οι δηλώσεις', locked: false });
    expect(nextFooter({ pro: false, more: 3 }, t)).toEqual({ text: 'Άλλα 3 για σένα με Pro ›', locked: true });
    expect(nextFooter({ pro: false, more: 1 }, t).text).toBe('Άλλο ένα για σένα με Pro ›');
    expect(nextFooter({ pro: false, more: 0 }, t).text).toBe('Με Pro σου θυμίζουμε πριν κλείσουν οι δηλώσεις ›');
  });
});
