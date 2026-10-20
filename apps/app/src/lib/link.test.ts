import { describe, expect, it } from 'vitest';
import type { MatchLink } from '@netprophet/db';
import { copy } from '../i18n';
import { daysLeft, fixChoices, linkClaimError, linkLabel, linkUrl, mockLinkView, shareMessage, titleFor, toWhom, who, whoShort } from './link';

const BASE = 'https://netprophet.gr';

describe('opponent link', () => {
  it('builds the url and the bar label', () => {
    expect(linkUrl('k3x9', BASE)).toBe('https://netprophet.gr/m/k3x9');
    expect(linkLabel('k3x9', BASE)).toBe('netprophet.gr/m/k3x9');
  });

  it('names people with the right article', () => {
    expect(who({ first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης' }, true)).toBe('Ο Βαγγέλης Καρδαμίτσης');
    expect(who({ first_name: 'Μαρία', surname: 'Καρρά' })).toBe('Η Μαρία');
    expect(toWhom({ first_name: 'Βαγγέλης' })).toBe('τον Βαγγέλη');
    expect(toWhom({ first_name: 'Μαρία' })).toBe('την Μαρία');
    expect(whoShort({ first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης' })).toBe('Ο Βαγγέλης Κ.');
    expect(who({ first_name: 'Vangelis', surname: 'K' }, true, 'en')).toBe('Vangelis K');
  });

  it('reads the prototype lines', () => {
    const view = mockLinkView();
    expect(titleFor(view, copy)).toBe('Ο Βαγγέλης Καρδαμίτσης πέρασε ένα ματς σας');
    expect(fixChoices(view).map((f) => f.label)).toEqual(['2-0 Γιώργος', '2-1 Γιώργος', '2-1 Βαγγέλης', '2-0 Βαγγέλης']);
  });

  it('counts the days left, at least one', () => {
    const now = new Date('2026-10-12T10:00:00Z');
    expect(daysLeft('2026-10-19T10:00:00Z', now)).toBe(7);
    expect(daysLeft('2026-10-12T11:00:00Z', now)).toBe(1);
  });

  it('shares one link, or one per opponent by first name', () => {
    const l = (first_name: string, token: string): MatchLink => ({ player_id: token, first_name, surname: 'Χ', gender: null, token });
    expect(shareMessage([l('Γιώργος', 'a')], 'T', 'B', BASE)).toBe('T\nB\nhttps://netprophet.gr/m/a');
    expect(shareMessage([l('Γιώργος', 'a'), l('Νίκος', 'b')], 'T', 'B', BASE)).toBe('T\nB\nΓιώργος: https://netprophet.gr/m/a\nΝίκος: https://netprophet.gr/m/b');
  });
});

describe('linkClaimError', () => {
  const t = copy;
  it('says who holds it, or why not', () => {
    expect(linkClaimError('player_already_claimed', t)).toBe(t.link.claimTaken);
    expect(linkClaimError('already_claimed_other', t)).toBe(t.onboarding.claim.otherClaimed);
    expect(linkClaimError('rate_limited', t)).toBe(t.onboarding.claim.limited);
    expect(linkClaimError('player_hidden', t)).toBe(t.onboarding.claim.failed);
    expect(linkClaimError(undefined, t)).toBe(t.onboarding.claim.failed);
  });
});
