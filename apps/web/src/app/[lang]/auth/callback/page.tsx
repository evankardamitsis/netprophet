'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@netprophet/lib';

export default function AuthCallbackPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🔐 Auth callback page mounted');
        console.log('📍 Current URL:', window.location.href);
        console.log('🔗 Hash:', window.location.hash);
        console.log('❓ Search:', window.location.search);

        // Set up auth state listener for OAuth callbacks
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state change:', event);
            console.log('👤 Session:', session ? 'Found' : 'None');

            if (event === 'SIGNED_IN' && session) {
                console.log('🎉 OAuth sign-in successful');
                console.log('👤 User:', session.user.email);

                // Extract language from the URL path
                const pathSegments = window.location.pathname.split('/');
                const lang = pathSegments[1] || 'en';

                console.log('🌐 Language:', lang);
                console.log('🚀 Redirecting to matches...');

                // Small delay to ensure everything is processed
                setTimeout(() => {
                    window.location.href = `/${lang}/matches`;
                }, 100);
            } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
                // Check for error parameters in URL
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                const errorParam = urlParams.get('error') || hashParams.get('error');
                const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

                console.log('🔍 URL error params:', { errorParam, errorDescription });

                if (errorParam) {
                    setError(errorDescription || 'Authentication failed');
                    setLoading(false);
                } else if (event === 'INITIAL_SESSION') {
                    // No session and no error - this might be a delayed OAuth callback
                    console.log('⏳ No initial session, waiting for OAuth callback...');

                    // Wait a bit longer for OAuth to process
                    setTimeout(async () => {
                        const { data: delayedSession } = await supabase.auth.getSession();
                        if (!delayedSession.session) {
                            setError('No session found. Please try signing in again.');
                            setLoading(false);
                        }
                    }, 2000);
                }
            }
        });

        // Also check current session immediately
        const checkCurrentSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ Session check error:', error);
                setError(`Authentication failed: ${error.message}`);
                setLoading(false);
                return;
            }

            if (session) {
                console.log('✅ Existing session found');
                const pathSegments = window.location.pathname.split('/');
                const lang = pathSegments[1] || 'en';
                window.location.href = `/${lang}/matches`;
            }
        };

        // Check session after a short delay
        const timer = setTimeout(checkCurrentSession, 200);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Completing authentication...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            Authentication Error
                        </h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => {
                                const pathSegments = window.location.pathname.split('/');
                                const lang = pathSegments[1] || 'en';
                                window.location.href = `/${lang}/auth/signin`;
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
} 