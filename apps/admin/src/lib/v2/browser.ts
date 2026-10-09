'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@netprophet/db';
import { V2_ANON_KEY, V2_URL } from './env';

/** Browser client for the v2 login page; the session lives in cookies the server can read. */
export function createV2BrowserClient() {
  return createBrowserClient<Database, 'api'>(V2_URL, V2_ANON_KEY, { db: { schema: 'api' } });
}
