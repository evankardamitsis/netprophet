'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@netprophet/lib';

interface User {
  id: string;
  email: string;
  is_admin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check if user is admin
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Admin useAuth: Profile check error:', error);
              setUser(null);
            } else if (profile?.is_admin) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                is_admin: true
              });
            } else {
              setUser(null);
            }
          } catch (profileError) {
            console.error('Admin useAuth: Profile check exception:', profileError);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Admin useAuth: Session error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Admin useAuth: Loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    getSession();

    return () => clearTimeout(timeoutId);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Admin useAuth: Auth state change:', event, session?.user?.email);
        
        // Set loading to true when auth state changes
        setLoading(true);
        
        if (session?.user) {
          // Check if user is admin
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Admin useAuth: Profile check error:', error);
              setUser(null);
            } else if (profile?.is_admin) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                is_admin: true
              });
            } else {
              setUser(null);
            }
          } catch (profileError) {
            console.error('Admin useAuth: Profile check exception:', profileError);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        
        // Set loading to false after processing
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Admin useAuth: Starting signOut...');
      
      // Clear local state immediately
      setUser(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Admin useAuth: SignOut error:', error);
      } else {
        console.log('Admin useAuth: SignOut successful');
      }
      
      // Clear any cached data
      localStorage.removeItem('oauth_lang');
      sessionStorage.clear();
      
    } catch (error) {
      console.error('Admin useAuth: SignOut exception:', error);
    }
  };

  return { user, loading, signOut };
} 