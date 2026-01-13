'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
    children: React.ReactNode;
    redirectTo?: string;
}

/**
 * AuthGuard component that redirects unauthenticated users to the login page
 * Use this to wrap protected pages/components
 */
export function AuthGuard({ children, redirectTo }: AuthGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang || 'en';

    useEffect(() => {
        // Wait for auth to finish loading
        if (loading) return;

        // If user is not authenticated, redirect to signin
        if (!user) {
            const destination = redirectTo || `/${lang}/auth/signin`;
            router.push(destination);
        }
    }, [user, loading, router, lang, redirectTo]);

    // Show nothing while loading or redirecting
    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
                <div className="text-center">
                    <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
                    </div>
                    <p className="text-white text-lg font-bold">Loading...</p>
                </div>
            </div>
        );
    }

    // User is authenticated, render children
    return <>{children}</>;
}
