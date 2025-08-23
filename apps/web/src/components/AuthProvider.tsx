'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@netprophet/lib';
import { supabase } from '@netprophet/lib';

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setUser, setSession, setLoading } = useAuthStore();
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: supabaseSession } }) => {
            setSession(supabaseSession);
            setUser(supabaseSession?.user ?? null);
            setLoading(false);
        }).catch((_error) => {
            setLoading(false);
        });

        // Listen for auth changes with debouncing to prevent rapid state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Debounce auth state changes to prevent rapid updates during navigation
            timeoutRef.current = setTimeout(() => {
                setSession(supabaseSession);
                setUser(supabaseSession?.user ?? null);
                setLoading(false);
            }, 100); // Small delay to batch rapid auth changes
        });

        return () => {
            subscription.unsubscribe();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []); // Empty dependency array since Zustand methods are stable

    return <>{children}</>;
}
