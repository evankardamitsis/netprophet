import { useAuthStore } from '@netprophet/lib';
import { supabase } from '@netprophet/lib';

export function useAuth() {
  const { user, session, loading, setUser, setSession, setLoading } = useAuthStore();

  const signIn = async (email: string) => {
    // Extract language from current path
    const pathSegments = window.location.pathname.split('/');
    const lang = pathSegments[1] || 'en';
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/${lang}/auth/callback`,
      },
    });
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