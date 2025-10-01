"use client";

import { useState, useEffect } from "react";
import { supabase } from "@netprophet/lib";

interface User {
  id: string;
  email: string;
  is_admin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session and check admin status
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          // Check if user is admin
          try {
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("is_admin")
              .eq("id", session.user.id)
              .single();

            if (!mounted) return;

            if (error) {
              console.error("Admin useAuth: Profile check error:", error);
              setUser(null);
            } else if (profile?.is_admin) {
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                is_admin: true,
              });
            } else {
              setUser(null);
            }
          } catch (profileError) {
            console.error(
              "Admin useAuth: Profile check exception:",
              profileError
            );
            if (mounted) setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Admin useAuth: Session error:", error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn(
          "Admin useAuth: Loading timeout reached, forcing loading to false"
        );
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    checkAuth();

    // Listen for auth state changes but only update on specific events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Admin useAuth: Auth state changed -", event);

      if (event === "SIGNED_OUT") {
        console.log("Admin useAuth: User signed out");
        setUser(null);
      } else if (event === "SIGNED_IN" && session?.user) {
        // Re-check admin status when user signs in
        console.log("Admin useAuth: User signed in, checking admin status");
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", session.user.id)
            .single();

          if (mounted && !error && profile?.is_admin) {
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              is_admin: true,
            });
          } else if (mounted) {
            setUser(null);
          }
        } catch (error) {
          console.error("Admin useAuth: SIGNED_IN profile check error:", error);
          if (mounted) setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Admin useAuth: Starting signOut...");

      // Clear local state immediately
      setUser(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Admin useAuth: SignOut error:", error);
      } else {
        console.log("Admin useAuth: SignOut successful");
      }

      // Clear any cached data
      localStorage.removeItem("oauth_lang");
      sessionStorage.clear();
    } catch (error) {
      console.error("Admin useAuth: SignOut exception:", error);
    }
  };

  return { user, loading, signOut };
}
