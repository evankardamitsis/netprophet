import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove: () => undefined }) } }));
const { debounce, REFETCH_AFTER_ACTION_MS, coldStart, onAction, pick, claim } = await import('./moments');
const { momentsAct, onMomentsAction } = await import('./useMoments');

afterEach(() => {
  vi.useRealTimers();
});

describe('reading the celebration queue again after an action', () => {
  it('debounce runs once, after the last call', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 1000);
    d.call();
    vi.advanceTimersByTime(600);
    d.call();
    vi.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('rapid votes make one refetch, a second after the last', () => {
    vi.useFakeTimers();
    const refetch = vi.fn();
    const off = onMomentsAction(refetch);
    momentsAct();
    vi.advanceTimersByTime(300);
    momentsAct();
    vi.advanceTimersByTime(300);
    momentsAct();
    vi.advanceTimersByTime(REFETCH_AFTER_ACTION_MS - 1);
    expect(refetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refetch).toHaveBeenCalledTimes(1);
    off();
    momentsAct();
    vi.advanceTimersByTime(REFETCH_AFTER_ACTION_MS);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it('a celebration that arrives with the refetch plays if the visit has room, else waits for the next visit', () => {
    const acted = onAction(coldStart());
    // the refetch brought one and nothing has played yet: it goes
    expect(pick(acted, ['celebration'])).toBe('celebration');
    // Baller already had this visit's moment: the refetched celebration stays queued (unseen)
    const used = claim(acted, 'baller')!;
    expect(pick(used, ['celebration'])).toBeNull();
    expect(claim(used, 'celebration')).toBeNull();
  });
});
