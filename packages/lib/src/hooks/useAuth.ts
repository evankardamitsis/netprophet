import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // console.log('🔐 useAuth hook initialized');
    // console.log('📍 Current URL:', window.location.href);
    // console.log('🔍 URL hash:', window.location.hash);
    // console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    // console.log('🔑 Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: supabaseSession } }) => {
      // console.log('📡 Initial session check:', { session: !!supabaseSession, error });
      setSession(supabaseSession);
      setUser(supabaseSession?.user ?? null);
      setLoading(false);
    }).catch((_error) => {
      // console.error('💥 Unexpected error in getSession:', _error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      // console.log('🔄 Auth state change:', _event, { session: !!supabaseSession });
      setSession(supabaseSession);
      setUser(supabaseSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    // console.log('🔐 Signing in with email:', email);
    // console.log('📍 Redirect URL:', `${window.location.origin}/auth/callback`);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      // console.error('❌ Sign in error:', error);
    } else {
      // console.log('✅ Magic link sent successfully');
    }
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
  };
} 