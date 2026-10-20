import { describe, expect, it } from 'vitest';
import { resultPushIds, type PresentedPush } from './pushClear';

const push = (id: string, data?: unknown): PresentedPush => ({ request: { identifier: id, content: { data } } });

describe('resultPushIds', () => {
  it('takes the result pushes only', () => {
    const list = [
      push('a', { type: 'results' }),
      push('b', { type: 'claim' }),
      push('c', { type: 'reaction', tournament_id: 't1' }),
      push('d', { type: 'results', n: 3 }),
      push('e', { type: 'reminder' }),
    ];
    expect(resultPushIds(list)).toEqual(['a', 'd']);
  });
  it('leaves pushes without data alone', () => {
    expect(resultPushIds([push('a'), push('b', null), push('c', 'results')])).toEqual([]);
  });
  it('nothing delivered, nothing to do', () => {
    expect(resultPushIds([])).toEqual([]);
  });
});
