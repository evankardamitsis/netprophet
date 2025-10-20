import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:", {
    url: supabaseUrl ? "present" : "missing",
    key: supabaseAnonKey ? "present" : "missing",
  });
}

// Ensure a single client instance across Fast Refresh and multiple imports
const getSupabaseClient = (): SupabaseClient => {
  const g = globalThis as unknown as { __np_supabase?: SupabaseClient };
  if (!g.__np_supabase) {
    g.__np_supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Use Supabase default storage key to preserve existing sessions across restarts
      },
    });
  }
  return g.__np_supabase;
};

export const supabase = getSupabaseClient();
