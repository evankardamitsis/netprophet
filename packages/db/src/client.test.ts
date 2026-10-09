import { describe, expect, it } from 'vitest';
import { API_SCHEMA, RpcError, createNetprophetClient, rpc } from './index';

interface Seen {
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
}

/** A fetch stub that records the request and answers with canned JSON. */
function stubFetch(status: number, payload: unknown, seen: Seen[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? init.body : null,
    });
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

const URL_ = 'http://localhost:54321';

describe('@netprophet/db client', () => {
  it('talks to the api schema only', async () => {
    const seen: Seen[] = [];
    const client = createNetprophetClient(URL_, 'anon-key', { global: { fetch: stubFetch(200, [], seen) } });
    await client.from('sports').select('id');
    expect(API_SCHEMA).toBe('api');
    expect(seen[0]?.url).toContain('/rest/v1/sports');
    expect(seen[0]?.headers.get('accept-profile')).toBe('api');
  });

  it('castVote posts the RPC with the schema profile and returns the typed payload', async () => {
    const seen: Seen[] = [];
    const reply = { match_id: 'm1', side: 1, replayed: false, split: { total: 1, side1: 1, side2: 0, pct1: 100, pct2: 0 } };
    const client = createNetprophetClient(URL_, 'anon-key', { global: { fetch: stubFetch(200, reply, seen) } });

    const res = await rpc(client).castVote('m1', 1, 'evt-1');

    expect(res.split.pct1).toBe(100);
    expect(seen[0]?.method).toBe('POST');
    expect(seen[0]?.url).toContain('/rest/v1/rpc/cast_vote');
    expect(seen[0]?.headers.get('content-profile')).toBe('api');
    expect(JSON.parse(seen[0]?.body ?? '{}')).toEqual({ p_match_id: 'm1', p_side: 1, p_client_event_id: 'evt-1' });
  });

  it('turns a database error into an RpcError carrying the machine code', async () => {
    const seen: Seen[] = [];
    const err = { code: '55000', message: 'voting_closed', details: null, hint: null };
    const client = createNetprophetClient(URL_, 'anon-key', { global: { fetch: stubFetch(400, err, seen) } });

    const p = rpc(client).castVote('m1', 2);
    await expect(p).rejects.toBeInstanceOf(RpcError);
    await expect(p).rejects.toMatchObject({ fn: 'cast_vote', code: 'voting_closed', sqlState: '55000' });
  });
});
