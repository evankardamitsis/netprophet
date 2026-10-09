/** The v2 project (separate from v1's NEXT_PUBLIC_SUPABASE_*). Without both values the v2 pages say so. */
export const V2_URL = process.env.NEXT_PUBLIC_V2_SUPABASE_URL ?? '';
export const V2_ANON_KEY = process.env.NEXT_PUBLIC_V2_SUPABASE_ANON_KEY ?? '';
export const v2Configured = V2_URL !== '' && V2_ANON_KEY !== '';
