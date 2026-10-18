import { describe, expect, it, vi } from 'vitest';
import { isHttpsUrl, safeOpen } from './openUrl';

describe('isHttpsUrl', () => {
  it('accepts https', () => {
    expect(isHttpsUrl('https://example.com/a?b=1')).toBe(true);
    expect(isHttpsUrl('  https://example.com ')).toBe(true);
  });
  it('rejects other schemes, junk and empty', () => {
    for (const u of ['http://example.com', 'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'intent://x#Intent;end', 'tel:123', 'myapp://x', 'data:text/html,hi', '//example.com', 'example.com', '', null, undefined]) {
      expect(isHttpsUrl(u)).toBe(false);
    }
  });
});

describe('safeOpen', () => {
  it('opens https links', () => {
    const open = vi.fn(() => Promise.resolve(true));
    expect(safeOpen('https://example.com', open)).toBe(true);
    expect(open).toHaveBeenCalledWith('https://example.com');
  });
  it('ignores anything else', () => {
    const open = vi.fn(() => Promise.resolve(true));
    expect(safeOpen('javascript:alert(1)', open)).toBe(false);
    expect(safeOpen(null, open)).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
  it('swallows a failed open', async () => {
    const open = vi.fn(() => Promise.reject(new Error('no handler')));
    expect(safeOpen('https://example.com', open)).toBe(true);
    await Promise.resolve();
  });
});
