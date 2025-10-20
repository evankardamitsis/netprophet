import { supabase } from "@netprophet/lib";

interface User {
  id: string;
  email: string;
  is_admin: boolean;
}

// Global auth state to avoid repeated checks
let globalUser: User | null = null;
let globalLoading = true;
let authInitialized = false;
let adminCheckCompleted = false;

// Global auth listeners to avoid multiple subscriptions
let authStateChangeSubscription: any = null;
let authListeners: Set<(user: User | null, loading: boolean) => void> =
  new Set();

// Initialize auth system once globally
export const initializeAuth = async () => {
  if (authInitialized) return;

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Admin useAuth: Session error:", error);
    } else if (session?.user) {
      // Check admin status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!profileError && profile?.is_admin) {
        globalUser = {
          id: session.user.id,
          email: session.user.email || "",
          is_admin: true,
        };
      }
    }

    globalLoading = false;
    authInitialized = true;
    adminCheckCompleted = true;

    // Notify all listeners
    authListeners.forEach((listener) => {
      listener(globalUser, globalLoading);
    });
  } catch (error) {
    console.error("Admin useAuth: Error getting initial session:", error);
    globalLoading = false;
    authInitialized = true;

    // Notify all listeners even on error
    authListeners.forEach((listener) => {
      listener(globalUser, globalLoading);
    });
  }
};

// Set up auth state change listener once globally
export const setupAuthListener = () => {
  if (authStateChangeSubscription) return;

  authStateChangeSubscription = supabase.auth.onAuthStateChange(
    (event, session) => {
      // Skip INITIAL_SESSION events after initialization
      if (event === "INITIAL_SESSION" && authInitialized) {
        return;
      }

      // Handle different auth events
      if (event === "SIGNED_IN" && session?.user) {
        // Check admin status for new sign-in
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (!error && profile?.is_admin) {
              globalUser = {
                id: session.user.id,
                email: session.user.email || "",
                is_admin: true,
              };
            } else {
              globalUser = null;
            }

            // Notify all listeners
            authListeners.forEach((listener) => {
              listener(globalUser, globalLoading);
            });
          });
      } else if (event === "SIGNED_OUT") {
        globalUser = null;
        adminCheckCompleted = false;
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Re-check admin status on token refresh
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (!error && profile?.is_admin) {
              globalUser = {
                id: session.user.id,
                email: session.user.email || "",
                is_admin: true,
              };
            } else {
              globalUser = null;
            }

            // Notify all listeners
            authListeners.forEach((listener) => {
              listener(globalUser, globalLoading);
            });
          });
      }

      // Notify all listeners
      authListeners.forEach((listener) => {
        listener(globalUser, globalLoading);
      });
    }
  );
};

// Export functions to manage listeners
export const addAuthListener = (
  listener: (user: User | null, loading: boolean) => void
) => {
  authListeners.add(listener);
};

export const removeAuthListener = (
  listener: (user: User | null, loading: boolean) => void
) => {
  authListeners.delete(listener);
};

export const getGlobalUser = () => globalUser;
export const getGlobalLoading = () => globalLoading;

export const clearGlobalAuth = () => {
  globalUser = null;
  adminCheckCompleted = false;
};
