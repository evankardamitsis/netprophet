"use client";

import { useState, useEffect } from "react";
import { supabase } from "@netprophet/lib";
import {
  initializeAuth,
  setupAuthListener,
  addAuthListener,
  removeAuthListener,
  getGlobalUser,
  getGlobalLoading,
  clearGlobalAuth,
} from "./adminAuthState";

interface User {
  id: string;
  email: string;
  is_admin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(getGlobalUser());
  const [loading, setLoading] = useState(getGlobalLoading());

  useEffect(() => {
    let mounted = true;

    // Create listener function for this component
    const listener = (newUser: User | null, newLoading: boolean) => {
      if (!mounted) return;
      setUser(newUser);
      setLoading(newLoading);
    };

    // Add this component's listener
    addAuthListener(listener);

    // Initialize auth system if not already done
    initializeAuth();
    setupAuthListener();

    return () => {
      mounted = false;
      removeAuthListener(listener);
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Admin useAuth: Starting signOut...");

      // Clear global and local state immediately
      clearGlobalAuth();

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
