import { supabase, TwoFactorAuthService } from "@netprophet/lib";
import { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
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
      // Clear local state immediately
      setUser(null);
      setSession(null);

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
        // Check if user has 2FA enabled
        const is2FAEnabled = await TwoFactorAuthService.isTwoFactorEnabled(
          data.user.id
        );

        if (is2FAEnabled) {
          // Store pending user and require 2FA
          setPendingUser(data.user);
          setRequiresTwoFactor(true);

          // Generate and send 2FA code
          const codeResult = await TwoFactorAuthService.createCode(
            data.user.id
          );
          if (codeResult.success) {
            // The code will be sent via email in the 2FA component
            return { success: true, requiresTwoFactor: true };
          } else {
            return {
              error: codeResult.error || "Failed to generate verification code",
            };
          }
        } else {
          // No 2FA required, proceed normally
          setUser(data.user);
          setSession(data.session);
          return { success: true };
        }
      }

      return { error: "No user data returned" };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const verifyTwoFactor = async (code: string) => {
    if (!pendingUser) {
      return { error: "No pending user for verification" };
    }

    try {
      const result = await TwoFactorAuthService.verifyCode(
        pendingUser.id,
        code
      );

      if (result.success) {
        // 2FA successful, complete the authentication
        setUser(pendingUser);
        setSession(null); // Will be set by auth state change
        setRequiresTwoFactor(false);
        setPendingUser(null);

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        return { success: true };
      } else {
        return { error: result.error || "Invalid verification code" };
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      return { error: "An error occurred during verification" };
    }
  };

  const cancelTwoFactor = () => {
    setRequiresTwoFactor(false);
    setPendingUser(null);
    // Sign out the user
    supabase.auth.signOut();
  };

  const resendTwoFactorCode = async () => {
    if (!pendingUser) {
      return { error: "No pending user" };
    }

    try {
      const result = await TwoFactorAuthService.createCode(pendingUser.id);
      if (result.success) {
        return { success: true };
      } else {
        return { error: result.error || "Failed to generate new code" };
      }
    } catch (error) {
      console.error("Resend 2FA code error:", error);
      return { error: "Failed to resend verification code" };
    }
  };

  return {
    user,
    session,
    loading,
    requiresTwoFactor,
    pendingUser,
    signIn,
    signInWithPassword,
    signOut,
    verifyTwoFactor,
    cancelTwoFactor,
    resendTwoFactorCode,
  };
}
