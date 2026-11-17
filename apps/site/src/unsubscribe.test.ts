import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { el, en, listPages } from './content';
import { confirmList, subscribeList, tokenKind, unsubscribe } from './unsubscribe';

const TOKEN = '11111111-2222-3333-4444-555555555555';
let calls: { fn: string; body: Record<string, unknown> }[] = [];

beforeEach(() => {
  calls = [];
  process.env.V2_SUPABASE_URL = 'https://db.example';
  process.env.V2_SUPABASE_PUBLISHABLE_KEY = 'pk';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ fn: url.split('/rpc/')[1]!, body: JSON.parse(String(init.body)) });
    return new Response('true', { status: 200 });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the email links of the website', () => {
  it('a player token goes to the account switch, a list token to the list, never the other', async () => {
    await unsubscribe(TOKEN);
    await unsubscribe(TOKEN, tokenKind('list'));
    await unsubscribe(TOKEN, tokenKind('anything'));
    expect(calls.map((c) => c.fn)).toEqual(['email_unsubscribe', 'list_unsubscribe', 'email_unsubscribe']);
  });

  it('a token that is not a uuid never reaches the database', async () => {
    expect(await unsubscribe('nope', 'list')).toBe(false);
    expect(await confirmList('1 or 1=1')).toBe(false);
    expect(calls).toEqual([]);
  });

  it('confirm posts the token to api.list_confirm', async () => {
    expect(await confirmList(TOKEN)).toBe(true);
    expect(calls).toEqual([{ fn: 'list_confirm', body: { p_token: TOKEN } }]);
  });

  it('subscribe lowercases, checks the shape and keeps the language', async () => {
    expect(await subscribeList('  Anna@Example.COM ', 'en')).toBe('ok');
    expect(calls).toEqual([{ fn: 'list_subscribe', body: { p_email: 'anna@example.com', p_source: 'site', p_lang: 'en' } }]);
    expect(await subscribeList('not an email', 'el')).toBe('bad');
    expect(calls).toHaveLength(1);
  });

  it('a database that does not answer is an error, not a bad address', async () => {
    vi.stubGlobal('fetch', async () => new Response('err', { status: 500 }));
    expect(await subscribeList('anna@example.com', 'el')).toBe('error');
  });
});

describe('the sign-up box', () => {
  it('asks for consent clearly and says the confirm email comes first, in both languages', () => {
    expect(el.list.button).toBe('Στείλε μου τα αποτελέσματα της εβδομάδας');
    for (const c of [el.list, en.list]) {
      expect(c.consent.length).toBeGreaterThan(40);
      expect(c.privacy.length).toBeGreaterThan(5);
    }
    expect(el.list.consent).toMatch(/επιβεβαιώσεις/);
    expect(Object.keys(listPages.en).sort()).toEqual(Object.keys(listPages.el).sort());
  });
});
