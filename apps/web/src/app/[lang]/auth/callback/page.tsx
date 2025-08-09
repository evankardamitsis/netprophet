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

        // Check if this is an OAuth callback with proper parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const hasOAuthCode = urlParams.has('code');
        const hasAccessToken = hashParams.has('access_token');
        const hasErrorParam = urlParams.has('error') || hashParams.has('error');

        console.log('🔑 OAuth params:', { hasOAuthCode, hasAccessToken, hasErrorParam });

        // If there are error parameters, handle them immediately
        if (hasErrorParam) {
            const errorParam = urlParams.get('error') || hashParams.get('error');
            const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
            console.log('❌ OAuth error detected:', { errorParam, errorDescription });
            setError(errorDescription || 'Authentication failed');
            setLoading(false);
            return;
        }

        // Set up auth state listener for OAuth callbacks
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state change:', event, session ? 'Session found' : 'No session');

            if (event === 'SIGNED_IN' && session) {
                console.log('🎉 OAuth sign-in successful');
                console.log('👤 User:', session.user.email);

                // Extract language from the URL path or localStorage
                const pathSegments = window.location.pathname.split('/');
                const pathLang = pathSegments[1];
                const storedLang = localStorage.getItem('oauth_lang');
                const lang = pathLang || storedLang || 'en';

                // Clean up stored language
                localStorage.removeItem('oauth_lang');

                console.log('🌐 Language:', lang);
                console.log('🚀 Redirecting to matches...');

                // Use router.push for better navigation
                window.location.href = `/${lang}/matches`;
            } else if (event === 'SIGNED_OUT') {
                console.log('🚪 User signed out on callback page');
                const pathSegments = window.location.pathname.split('/');
                const lang = pathSegments[1] || 'en';
                setError('Authentication was cancelled or failed');
                setLoading(false);
            }
        });

        // Handle OAuth callback immediately if we have the right parameters
        const handleOAuthCallback = async () => {
            if (hasOAuthCode || hasAccessToken) {
                console.log('🔄 Processing OAuth callback...');

                try {
                    // Let Supabase handle the OAuth callback
                    const { data, error } = await supabase.auth.getSession();

                    if (error) {
                        console.error('❌ OAuth callback error:', error);
                        setError(`Authentication failed: ${error.message}`);
                        setLoading(false);
                        return;
                    }

                    if (data.session) {
                        console.log('✅ OAuth session established immediately');
                        const pathSegments = window.location.pathname.split('/');
                        const pathLang = pathSegments[1];
                        const storedLang = localStorage.getItem('oauth_lang');
                        const lang = pathLang || storedLang || 'en';

                        localStorage.removeItem('oauth_lang');
                        window.location.href = `/${lang}/matches`;
                        return;
                    }

                    // If no immediate session, wait for auth state change
                    console.log('⏳ Waiting for OAuth session to be established...');
                } catch (err) {
                    console.error('❌ OAuth processing error:', err);
                    setError('An error occurred during authentication');
                    setLoading(false);
                }
            } else {
                // No OAuth parameters, check if there's already a session
                console.log('🔍 No OAuth params, checking existing session...');

                try {
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
                    } else {
                        console.log('❌ No session and no OAuth params');
                        setError('No authentication data found. Please try signing in again.');
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('❌ Session check error:', err);
                    setError('An error occurred checking authentication');
                    setLoading(false);
                }
            }
        };

        // Process callback with a small delay to ensure URL is fully loaded
        const timer = setTimeout(handleOAuthCallback, 100);

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