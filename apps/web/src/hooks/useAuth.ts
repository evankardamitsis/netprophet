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

  // Function to check for automatic player lookup
  const checkPlayerLookup = async (userId: string) => {
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
          // Only check 2FA if we're not already in a 2FA flow
          if (!requiresTwoFactor) {
            setSession(session);
            setUser(session.user);
          }
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

      // Handle different auth events
      if (event === "SIGNED_IN" && session) {
        // Only clear user/session if 2FA is required
        if (requiresTwoFactor) {
          setUser(null);
          setSession(null);
          return;
        }
        // Normal sign in - set user and session
        setSession(session);
        setUser(session.user);

        // Check for automatic player lookup after successful login
        checkPlayerLookup(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
      } else if (event === "TOKEN_REFRESHED" && session && !requiresTwoFactor) {
        // Token refresh - only update if not in 2FA flow
        setSession(session);
        setUser(session.user);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requiresTwoFactor]);

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
          // Clear user/session since 2FA is required - user is NOT logged in yet
          setUser(null);
          setSession(null);

          // Generate and automatically send 2FA code via email
          const codeResult = await TwoFactorAuthService.createCode(
            data.user.id,
            data.user.email,
            "en" // Default to English, could be made dynamic based on user preference
          );
          if (codeResult.success) {
            // The code has been automatically sent via email
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
        setRequiresTwoFactor(false);
        setPendingUser(null);

        // The user should already be authenticated in Supabase
        // Just update our local state
        setUser(pendingUser);

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

  const cancelTwoFactor = async () => {
    // Sign out the user if they cancel 2FA
    await signOut();
    setRequiresTwoFactor(false);
    setPendingUser(null);
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
