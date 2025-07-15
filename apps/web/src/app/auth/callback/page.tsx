'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@netprophet/lib';

export default function AuthCallbackPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleAuthCallback = async () => {
            console.log('🔐 Client-side auth callback started');
            console.log('📍 Current URL:', window.location.href);
            console.log('🔍 URL hash:', window.location.hash);
            console.log('🔍 URL search:', window.location.search);

            try {
                // Parse URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
                const type = urlParams.get('type') || hashParams.get('type');

                console.log('🔍 Token hash:', tokenHash);
                console.log('🔍 Type:', type);

                if (tokenHash && type === 'email') {
                    // Use verifyOtp for PKCE flow as per Supabase docs
                    console.log('📡 Verifying OTP with token hash...');
                    const { data, error } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: 'email',
                    });

                    if (error) {
                        console.error('❌ Auth error:', error);
                        setError('Authentication failed: ' + error.message);
                        setLoading(false);
                        return;
                    }

                    console.log('✅ Session data:', data.session ? 'Session found' : 'No session');

                    if (data.session) {
                        console.log('🎉 Authentication successful');
                        console.log('👤 User:', data.session.user.email);
                        console.log('🔑 Session expires:', new Date(data.session.expires_at! * 1000).toISOString());

                        // Wait a moment for session to be properly set
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Double-check session is still valid
                        const { data: sessionCheck } = await supabase.auth.getSession();
                        if (sessionCheck.session) {
                            console.log('✅ Session confirmed, redirecting to dashboard');
                            // Use window.location.href to ensure a full page reload
                            window.location.href = '/dashboard';
                        } else {
                            console.error('❌ Session lost after processing');
                            setError('Session was lost. Please try signing in again.');
                            setLoading(false);
                        }
                    } else {
                        console.error('❌ No session after verification');
                        setError('No session found after verification. Please try signing in again.');
                        setLoading(false);
                    }
                } else {
                    // Fallback to the old method for backward compatibility
                    console.log('📡 Using fallback session detection...');
                    const { data, error } = await supabase.auth.getSession();

                    if (error) {
                        console.error('❌ Auth error:', error);
                        setError('Authentication failed: ' + error.message);
                        setLoading(false);
                        return;
                    }

                    console.log('✅ Session data:', data.session ? 'Session found' : 'No session');

                    if (data.session) {
                        console.log('🎉 Authentication successful');
                        console.log('👤 User:', data.session.user.email);
                        console.log('🔑 Session expires:', new Date(data.session.expires_at! * 1000).toISOString());

                        // Wait a moment for session to be properly set
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Double-check session is still valid
                        const { data: sessionCheck } = await supabase.auth.getSession();
                        if (sessionCheck.session) {
                            console.log('✅ Session confirmed, redirecting to dashboard');
                            window.location.href = '/dashboard';
                        } else {
                            console.error('❌ Session lost after processing');
                            setError('Session was lost. Please try signing in again.');
                            setLoading(false);
                        }
                    } else {
                        // Check for error parameters
                        const error = urlParams.get('error') || hashParams.get('error');
                        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

                        console.log('🔍 URL error params:', { error, errorDescription });

                        if (error) {
                            setError(errorDescription || 'Authentication failed');
                        } else {
                            setError('No session found. Please try signing in again.');
                        }
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('💥 Unexpected error:', err);
                setError('An unexpected error occurred');
                setLoading(false);
            }
        };

        // Add a small delay to ensure Supabase has time to process the URL
        const timer = setTimeout(handleAuthCallback, 100);

        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                            onClick={() => window.location.href = '/auth/signin'}
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