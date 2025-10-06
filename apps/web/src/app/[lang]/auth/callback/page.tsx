'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import Logo from '@/components/Logo';

export default function AuthCallbackPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang as 'en' | 'el' || 'el';

    useEffect(() => {
        // Check if this is an OAuth callback with proper parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const hasOAuthCode = urlParams.has('code');
        const hasAccessToken = hashParams.has('access_token');
        const hasErrorParam = urlParams.has('error') || hashParams.has('error');

        // If there are error parameters, handle them immediately
        if (hasErrorParam) {
            const errorParam = urlParams.get('error') || hashParams.get('error');
            const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
            setError(errorDescription || 'Authentication failed');
            setLoading(false);
            return;
        }

        // Set up auth state listener for OAuth callbacks
        if (!supabase) {
            setError('Authentication service is not available.');
            setLoading(false);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Extract language from the URL path or localStorage
                const pathSegments = window.location.pathname.split('/');
                const pathLang = pathSegments[1];
                const storedLang = localStorage.getItem('oauth_lang');
                const lang = pathLang || storedLang || 'en';

                // Clean up stored language
                localStorage.removeItem('oauth_lang');

                // Small delay to ensure session is fully persisted
                setTimeout(async () => {
                    // Check if user needs profile setup
                    try {
                        const { data: profile, error: profileError } = await supabase
                            .from("profiles")
                            .select("first_name, last_name, terms_accepted, profile_claim_status")
                            .eq("id", session.user.id)
                            .single();

                        if (!profileError && profile) {
                            const needsSetup = !profile.first_name ||
                                !profile.last_name ||
                                !profile.terms_accepted ||
                                profile.profile_claim_status === "pending";

                            if (needsSetup) {
                                router.push(`/${lang}/auth/profile-setup`);
                                return;
                            }
                        }

                        router.push(`/${lang}/matches`);
                    } catch (err) {
                        // If profile check fails, redirect to matches anyway
                        router.push(`/${lang}/matches`);
                    }
                }, 100);
            } else if (event === 'SIGNED_OUT') {
                setError('Authentication was cancelled or failed');
                setLoading(false);
            }
        });

        // Handle OAuth callback immediately if we have the right parameters
        const handleOAuthCallback = async () => {
            if (!supabase) {
                setError('Authentication service is not available.');
                setLoading(false);
                return;
            }

            if (hasOAuthCode || hasAccessToken) {
                // For OAuth callbacks, let the auth state change handler deal with it
                // This reduces redundant calls to getSession()
                return;
            } else {
                // No OAuth parameters, check if there's already a session
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();

                    if (error) {
                        setError(`Authentication failed: ${error.message}`);
                        setLoading(false);
                        return;
                    }

                    if (session) {
                        const pathSegments = window.location.pathname.split('/');
                        const lang = pathSegments[1] || 'en';

                        // Check if user needs profile setup
                        try {
                            const { data: profile, error: profileError } = await supabase
                                .from("profiles")
                                .select("first_name, last_name, terms_accepted, profile_claim_status")
                                .eq("id", session.user.id)
                                .single();

                            if (!profileError && profile) {
                                const needsSetup = !profile.first_name ||
                                    !profile.last_name ||
                                    !profile.terms_accepted ||
                                    profile.profile_claim_status === "pending";

                                if (needsSetup) {
                                    router.push(`/${lang}/auth/profile-setup`);
                                    return;
                                }
                            }

                            router.push(`/${lang}/matches`);
                        } catch (err) {
                            // If profile check fails, redirect to matches anyway
                            router.push(`/${lang}/matches`);
                        }
                    } else {
                        setError('No authentication data found. Please try signing in again.');
                        setLoading(false);
                    }
                } catch (err) {
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-200">
                <div className="text-center">
                    <div className="mb-6">
                        <Logo size="lg" />
                    </div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-slate-700 font-medium">
                        {lang === 'el'
                            ? 'Ανακατεύθυνση στο NetProphet...'
                            : 'Redirecting to NetProphet...'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        {lang === 'el'
                            ? 'Παρακαλώ περιμένετε'
                            : 'Please wait'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-200">
                <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
                    <div className="text-center">
                        <div className="mb-6">
                            <Logo size="md" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            {lang === 'el' ? 'Σφάλμα Ταυτοποίησης' : 'Authentication Error'}
                        </h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                        >
                            {lang === 'el' ? 'Δοκίμασε Ξανά' : 'Try Again'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
} 