import { describe, expect, it } from 'vitest';
import { gateStatus } from './gateStatus';

describe('gateStatus: the tabs never mount before this account is known', () => {
  it('signed out or mock mode: open', () => {
    expect(gateStatus({ user: null, status: 'unknown' }, null, true)).toBe('done');
    expect(gateStatus({ user: null, status: 'unknown' }, 'u1', false)).toBe('done');
  });
  it('the render a session lands is «unknown», not the answer for nobody', () => {
    expect(gateStatus({ user: null, status: 'done' }, 'u1', true)).toBe('unknown');
    expect(gateStatus({ user: 'u0', status: 'done' }, 'u1', true)).toBe('unknown');
  });
  it("this account's answer once read", () => {
    expect(gateStatus({ user: 'u1', status: 'done' }, 'u1', true)).toBe('done');
    expect(gateStatus({ user: 'u1', status: 'needed' }, 'u1', true)).toBe('needed');
  });
});
