import { supabase } from "@netprophet/lib";
import { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("useAuth: Session error:", error);
        } else if (session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (error) {
        console.error("useAuth: Error getting initial session:", error);
      } finally {
        if (mounted) {
          setLoading(false);
          isInitialized.current = true;
        }
      }
    };

    getInitialSession();

    // Listen for auth changes - only process meaningful events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION events after initialization
      if (event === "INITIAL_SESSION" && isInitialized.current) {
        return;
      }

      console.log("useAuth: Auth state change:", event, session?.user?.email);

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string) => {
    // Extract language from current path
    const pathSegments = window.location.pathname.split("/");
    const lang = pathSegments[1] || "en";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/${lang}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      console.log("useAuth: Starting signOut...");

      // Clear local state immediately
      setUser(null);
      setSession(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("useAuth: SignOut error:", error);
        return { error };
      }

      console.log("useAuth: SignOut successful");

      // Clear any cached data
      localStorage.removeItem("oauth_lang");
      sessionStorage.clear();

      // Clear any Supabase-related storage
      if (typeof window !== "undefined") {
        // Clear any remaining Supabase session data
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key);
          }
        });
      }

      return { error: null };
    } catch (error) {
      console.error("useAuth: SignOut exception:", error);
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
  };
}
