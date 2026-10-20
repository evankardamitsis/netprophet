import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { MeResult } from '@netprophet/db';
import { canClaimHere, claimHereLabel, claimHereToast, ownReportShown } from './claimLater';

const t = getCopy('el');
const player = { id: 'p1', first_name: 'Νίκος', surname: 'Ροδίτης' } as MeResult['player'];
const me = (claim_status: MeResult['profile']['claim_status'], held = false) => ({ player: held ? player : null, profile: { claim_status } });
const free = { claimed: false, isMe: false };

describe('canClaimHere', () => {
  it('offers it to an account with no player and nothing waiting', () => {
    expect(canClaimHere(free, me('none'))).toBe(true);
    expect(canClaimHere(free, me('skipped'))).toBe(true);
  });
  it('not while a request or a new player waits for staff', () => {
    expect(canClaimHere(free, me('requested'))).toBe(false);
    expect(canClaimHere(free, me('creation_requested'))).toBe(false);
  });
  it('not when the account has a player', () => {
    expect(canClaimHere(free, me('claimed', true))).toBe(false);
    expect(canClaimHere(free, me('none', true))).toBe(false);
  });
  it('not on a held player or your own, nor before get_me', () => {
    expect(canClaimHere({ claimed: true, isMe: false }, me('none'))).toBe(false);
    expect(canClaimHere({ claimed: true, isMe: true }, me('none'))).toBe(false);
    expect(canClaimHere(free, null)).toBe(false);
  });
});

describe('claimHereLabel', () => {
  it('goes by the roster gender, then by the name', () => {
    expect(claimHereLabel('Νίκος', 'm', t)).toBe('Αυτός είμαι εγώ');
    expect(claimHereLabel('Νίκος', 'f', t)).toBe('Αυτή είμαι εγώ');
    expect(claimHereLabel('Ελένη', null, t)).toBe('Αυτή είμαι εγώ');
    expect(claimHereLabel('Γιάννης', null, t)).toBe('Αυτός είμαι εγώ');
  });
});

describe('claimHereToast', () => {
  it('says what onboarding says', () => {
    expect(claimHereToast('requested', t)).toBe(t.onboarding.claim.requested);
    expect(claimHereToast('ok', t)).toBe(t.onboarding.claim.requested);
    expect(claimHereToast('taken', t)).toBe(t.link.claimTaken);
    expect(claimHereToast('other', t)).toBe(t.onboarding.claim.otherClaimed);
    expect(claimHereToast('limited', t)).toBe(t.onboarding.claim.limited);
    expect(claimHereToast('failed', t)).toBe(t.onboarding.claim.failed);
  });
});

describe('ownReportShown', () => {
  it('only for an account that holds its player', () => {
    expect(ownReportShown(me('claimed', true))).toBe(true);
    expect(ownReportShown(me('none'))).toBe(false);
    expect(ownReportShown(me('requested'))).toBe(false);
    expect(ownReportShown(null)).toBe(false);
  });
});

describe('the copy', () => {
  it('says «Δεν είμαι εγώ» and what happens next, with no em dash', () => {
    expect(t.safety.claimOwn.link).toBe('Δεν είμαι εγώ');
    expect(t.safety.claimOwn.sent).toBe('Το είδαμε. Θα το ελέγξουμε.');
    for (const s of [...Object.values(t.safety.claimOwn), ...Object.values(t.players.claimMe)]) expect(s).not.toContain('—');
  });
});
