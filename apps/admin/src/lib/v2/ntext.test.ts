import { describe, expect, it } from 'vitest';
import { checkText, fillText, placeholderNames, problemFromError } from './ntext';

// the same cases as supabase-v2/tests/120_notification_texts.test.sql
describe('fillText', () => {
  it('fills the placeholders', () => {
    expect(fillText('Βγήκαν {n} αποτελέσματα', { n: 3 })).toBe('Βγήκαν 3 αποτελέσματα');
    expect(fillText('{tournament}: δηλώσεις έως {day} {date}. Μπαίνεις;', { tournament: 'T', day: 'Πέμ', date: '22/10' })).toBe(
      'T: δηλώσεις έως Πέμ 22/10. Μπαίνεις;',
    );
  });
  it('drops a piece without a value, keeps one with an empty value', () => {
    const body = '{time} · {tournament} · με {opponent}';
    expect(fillText(body, { time: '10:00', tournament: null, opponent: 'Παππάς' })).toBe('10:00 · με Παππάς');
    expect(fillText(body, { time: '10:00' })).toBe('10:00');
    expect(fillText('{when} · {tournament} · με {opponent}', { when: 'Σάβ 17/10, 10:00', tournament: 'T', opponent: '' })).toBe(
      'Σάβ 17/10, 10:00 · T · με ',
    );
  });
  it('never fills a value again', () => {
    expect(fillText('{a} · {b}', { a: '{b}', b: 'x' })).toBe('{b} · x');
  });
});

describe('checkText', () => {
  const allowed = ['n'];
  it('passes a good text', () => expect(checkText('Βγήκαν {n}', 'Μπες να δεις.', allowed)).toBeNull());
  it('refuses what the database refuses', () => {
    expect(checkText('Βγήκαν {count}', 'x', allowed)).toEqual({ code: 'unknown_placeholder', name: 'count' });
    expect(checkText('Βγήκε \u2014 δες', 'x', allowed)).toEqual({ code: 'em_dash' });
    expect(checkText('  ', 'x', allowed)).toEqual({ code: 'title_required' });
    expect(checkText('x', 'α'.repeat(181), allowed)).toEqual({ code: 'body_too_long' });
    expect(checkText('Βγήκαν {n αποτελέσματα', 'x', allowed)).toEqual({ code: 'stray_brace' });
  });
  it('lists the placeholders', () => expect(placeholderNames('{when} · με {opponent}')).toEqual(['when', 'opponent']));
  it('reads the database errors', () => {
    expect(problemFromError('unknown_placeholder: count')).toEqual({ code: 'unknown_placeholder', name: 'count' });
    expect(problemFromError('em_dash')).toEqual({ code: 'em_dash' });
    expect(problemFromError('forbidden')).toBeNull();
  });
});
