'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@netprophet/lib';
import { supabase } from '@netprophet/lib';

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setUser, setSession, setLoading } = useAuthStore();

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Error getting initial session:', error);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.id);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [setUser, setSession, setLoading]);

    return <>{children}</>;
}
