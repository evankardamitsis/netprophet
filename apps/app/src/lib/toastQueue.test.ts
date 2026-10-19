import { describe, expect, it } from 'vitest';
import { advance, emptyQueue, enqueue, type QueueState } from './toastQueue';

const item = (n: number, text: string, ms = 2200) => ({ n, ms, item: text });

describe('toast queue', () => {
  it('shows the first line at once', () => {
    const q = enqueue(emptyQueue<string>(), item(1, 'a'));
    expect(q.active?.item).toBe('a');
    expect(q.waiting).toEqual([]);
  });

  it('shows at most one at a time, the rest wait in order', () => {
    let q: QueueState<string> = emptyQueue();
    q = enqueue(q, item(1, 'vote failed'));
    q = enqueue(q, item(2, 'quest bar', 2200));
    q = enqueue(q, item(3, 'report sent'));
    expect(q.active?.item).toBe('vote failed');
    expect(q.waiting.map((x) => x.item)).toEqual(['quest bar', 'report sent']);
    q = advance(q, 1);
    expect(q.active?.item).toBe('quest bar');
    q = advance(q, 2);
    expect(q.active?.item).toBe('report sent');
    q = advance(q, 3);
    expect(q.active).toBeNull();
  });

  it('keeps each item its own duration', () => {
    let q: QueueState<string> = emptyQueue();
    q = enqueue(q, item(1, 'toast', 2200));
    q = enqueue(q, item(2, 'bar', 1800));
    q = advance(q, 1);
    expect(q.active?.ms).toBe(1800);
  });

  it('ignores a late timer for an item that already left', () => {
    let q: QueueState<string> = emptyQueue();
    q = enqueue(q, item(1, 'a'));
    q = enqueue(q, item(2, 'b'));
    q = advance(q, 1);
    expect(advance(q, 1)).toBe(q);
    expect(q.active?.item).toBe('b');
  });

  it('shows the same text twice as two items', () => {
    let q: QueueState<string> = emptyQueue();
    q = enqueue(q, item(1, 'same'));
    q = enqueue(q, item(2, 'same'));
    q = advance(q, 1);
    expect(q.active?.n).toBe(2);
  });
});
