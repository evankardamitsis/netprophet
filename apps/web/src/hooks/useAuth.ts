import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@netprophet/lib';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: supabaseSession } }) => {
      console.log('[useAuth] Initial getSession:', supabaseSession);
      setSession(supabaseSession);
      setUser(supabaseSession?.user ?? null);
      setLoading(false);
    }).catch((_error) => {
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      console.log(`[useAuth] onAuthStateChange event: ${event}`, supabaseSession);
      setSession(supabaseSession);
      setUser(supabaseSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    console.log('[useAuth] signIn called with:', email);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    console.log('[useAuth] signOut called');
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  useEffect(() => {
    console.log('[useAuth] user state changed:', user);
    console.log('[useAuth] session state changed:', session);
    console.log('[useAuth] loading state:', loading);
  }, [user, session, loading]);

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
  };
} 