import { supabase } from "@netprophet/lib";
import { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";

// Global auth state to avoid repeated checks
let globalUser: User | null = null;
let globalSession: Session | null = null;
let globalLoading = true;
let authInitialized = false;
let playerLookupChecked = false;

// Global auth listeners to avoid multiple subscriptions
let authStateChangeSubscription: any = null;
let authListeners: Set<
  (user: User | null, session: Session | null, loading: boolean) => void
> = new Set();

// Function to check for automatic player lookup
const checkPlayerLookup = async (userId: string) => {
  // Only run once per session
  if (playerLookupChecked) return;
  playerLookupChecked = true;

  try {
    const { data, error } = await supabase.rpc(
      "check_and_claim_player_for_user",
      {
        user_id: userId,
      }
    );

    if (error) {
      console.error("Player lookup error:", error);
      return;
    }

    if (data?.success && data?.status === "auto_claimed") {
      console.log("Player automatically claimed:", data);
      // Optionally refresh the page or update UI
      window.location.reload();
    }
  } catch (error) {
    console.error("Error checking player lookup:", error);
  }
};

// Initialize auth system once globally
const initializeAuth = async () => {
  if (authInitialized) return;

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("useAuth: Session error:", error);
    } else if (session) {
      globalSession = session;
      globalUser = session.user;
    }

    globalLoading = false;
    authInitialized = true;

    // Notify all listeners
    authListeners.forEach((listener) => {
      listener(globalUser, globalSession, globalLoading);
    });
  } catch (error) {
    console.error("useAuth: Error getting initial session:", error);
    globalLoading = false;
    authInitialized = true;

    // Notify all listeners even on error
    authListeners.forEach((listener) => {
      listener(globalUser, globalSession, globalLoading);
    });
  }
};

// Set up auth state change listener once globally
const setupAuthListener = () => {
  if (authStateChangeSubscription) return;

  authStateChangeSubscription = supabase.auth.onAuthStateChange(
    (event, session) => {
      // Skip INITIAL_SESSION events after initialization
      if (event === "INITIAL_SESSION" && authInitialized) {
        return;
      }

      // Handle different auth events
      if (event === "SIGNED_IN" && session) {
        globalSession = session;
        globalUser = session.user;
        // Check for automatic player lookup after successful login
        checkPlayerLookup(session.user.id);
      } else if (event === "SIGNED_OUT") {
        globalSession = null;
        globalUser = null;
        playerLookupChecked = false;
      } else if (event === "TOKEN_REFRESHED" && session) {
        globalSession = session;
        globalUser = session.user;
      }

      // Notify all listeners
      authListeners.forEach((listener) => {
        listener(globalUser, globalSession, globalLoading);
      });
    }
  );
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(globalUser);
  const [session, setSession] = useState<Session | null>(globalSession);
  const [loading, setLoading] = useState(globalLoading);

  useEffect(() => {
    let mounted = true;

    // Create listener function for this component
    const listener = (
      newUser: User | null,
      newSession: Session | null,
      newLoading: boolean
    ) => {
      if (!mounted) return;
      setUser(newUser);
      setSession(newSession);
      setLoading(newLoading);
    };

    // Add this component's listener
    authListeners.add(listener);

    // Initialize auth system if not already done
    initializeAuth();
    setupAuthListener();

    return () => {
      mounted = false;
      authListeners.delete(listener);
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
      // Clear global and local state immediately
      globalUser = null;
      globalSession = null;
      playerLookupChecked = false;

      // Notify all listeners immediately
      authListeners.forEach((listener) => {
        listener(null, null, false);
      });

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("useAuth: SignOut error:", error);
        return { error };
      }

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

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        return { success: true };
      }

      return { error: "No user data returned" };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signInWithPassword,
    signOut,
  };
}
