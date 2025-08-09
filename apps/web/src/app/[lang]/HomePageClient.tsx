'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Alert, AlertDescription } from '@netprophet/ui';

interface Dictionary {
    navigation: {
        matches: string;
        leaderboard: string;
        myPicks: string;
        rewards: string;
        myProfile: string;
        howItWorks: string;
    };
    auth: {
        signIn: string;
        signOut: string;
        welcome: string;
    };
    common: {
        loading: string;
        error: string;
        success: string;
        cancel: string;
        save: string;
        delete: string;
        edit: string;
        close: string;
        back: string;
        next: string;
        previous: string;
        submit: string;
        confirm: string;
        yes: string;
        no: string;
    };
}

interface HomePageClientProps {
    dict?: Dictionary;
    lang: 'en' | 'el';
}

export default function HomePageClient({ dict, lang }: HomePageClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Debug current URL
        console.log('🏠 Home page URL:', window.location.href);
        console.log('🔍 Search params:', window.location.search);
        console.log('🔗 Hash:', window.location.hash);

        // Check if this is an OAuth callback (has code parameter)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const hasOAuthCode = urlParams.has('code');
        const hasAccessToken = hashParams.has('access_token');
        const hasErrorParam = urlParams.has('error') || hashParams.has('error');

        console.log('🔑 Has OAuth code:', hasOAuthCode);
        console.log('🎫 Has access token:', hasAccessToken);
        console.log('❌ Has OAuth error:', hasErrorParam);

        // If OAuth callback ended up on home page, redirect to proper callback handler
        if (hasOAuthCode || hasAccessToken || hasErrorParam) {
            console.log('🔄 OAuth callback detected on home page, redirecting to proper callback handler...');
            // Get the stored language from OAuth initiation, fallback to current lang
            const oauthLang = localStorage.getItem('oauth_lang') || lang;

            // Don't clean up oauth_lang here - let the callback page handle it

            // Redirect to the proper callback page with all parameters
            const callbackUrl = `/${oauthLang}/auth/callback${window.location.search}${window.location.hash}`;
            console.log('🚀 Redirecting to callback:', callbackUrl);
            window.location.href = callbackUrl;
            return;
        }

        const checkAuth = async () => {
            console.log('🔍 Checking authentication status on home page...');

            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('❌ Session check error:', error);
                    setLoading(false);
                    return;
                }

                if (session) {
                    console.log('✅ User is authenticated, redirecting to matches');
                    console.log('👤 User email:', session.user.email);

                    // Use window.location for immediate redirect to avoid potential routing issues
                    window.location.href = `/${lang}/matches`;
                    return;
                }

                console.log('❌ No session found, staying on home page');
                setLoading(false);
            } catch (err) {
                console.error('❌ Auth check error:', err);
                setLoading(false);
            }
        };

        // Small delay to ensure any OAuth processing has time to complete
        const timer = setTimeout(checkAuth, 300);

        return () => clearTimeout(timer);
    }, [router, lang]);

    if (loading) {
        console.log('⏳ Home page showing loading state');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">{dict?.common?.loading || 'Loading...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                                {lang === 'el' ? 'Γίνε ο επόμενος' : 'Become the next'}{' '}
                                <span className="text-blue-600">Net Prophet</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                                {lang === 'el'
                                    ? 'Προέβλεψε. Κέρδισε πόντους. Σκαρφάλωσε στο leaderboard.'
                                    : 'Predict. Earn points. Climb the leaderboard.'
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    size="lg"
                                    className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700"
                                >
                                    {lang === 'el' ? 'Ξεκίνα τώρα' : 'Start Now'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="text-lg px-8 py-4"
                                    onClick={() => router.push(`/${lang}/how-it-works`)}
                                >
                                    {dict?.navigation?.howItWorks || 'How It Works'}
                                </Button>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-gradient-to-br from-blue-100 to-green-100 rounded-3xl p-8 shadow-2xl">
                                <div className="bg-white rounded-2xl p-6 shadow-lg">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500">Match Prediction</span>
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Live</span>
                                        </div>
                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold">Nadal vs Djokovic</span>
                                                <span className="text-blue-600 font-bold">2.15</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Your pick: Nadal</span>
                                                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">+150 pts</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            {lang === 'el' ? 'Απλό, σαν να σερβίρεις πρώτο game' : 'Simple, like serving first game'}
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            {lang === 'el' ? 'Μόλις 4 βήματα για να γίνεις Net Prophet' : 'Just 4 steps to become a Net Prophet'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🎾</span>
                                </div>
                                <CardTitle className="text-xl">
                                    {lang === 'el' ? 'Διάλεξε αγώνες' : 'Choose matches'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    {lang === 'el'
                                        ? 'Επέλεξε από τα καλύτερα τουρνουά και αγώνες'
                                        : 'Choose from the best tournaments and matches'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <CardTitle className="text-xl">
                                    {lang === 'el' ? 'Κάνε τις προβλέψεις σου' : 'Make your predictions'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    {lang === 'el'
                                        ? 'Βάλε τις γνώσεις σου στο τένις σε δοκιμή'
                                        : 'Put your tennis knowledge to the test'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🔥</span>
                                </div>
                                <CardTitle className="text-xl">
                                    {lang === 'el' ? 'Μάζεψε πόντους' : 'Earn points'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    {lang === 'el'
                                        ? 'Κέρδισε πόντους για κάθε σωστή πρόβλεψη'
                                        : 'Earn points for every correct prediction'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <CardTitle className="text-xl">
                                    {lang === 'el' ? 'Ανέβα στο leaderboard' : 'Climb the leaderboard'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    {lang === 'el'
                                        ? 'Δείξε σε όλους ποιος είναι ο καλύτερος Net Prophet'
                                        : 'Show everyone who is the best Net Prophet'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">NetProphet</h3>
                            <p className="text-gray-400">
                                {lang === 'el' ? 'Η πλατφόρμα prediction για το τένις' : 'The prediction platform for tennis'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Community</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>{dict?.navigation?.leaderboard || 'Leaderboard'}</li>
                                <li>Tournaments</li>
                                <li>News</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>FAQ</li>
                                <li>Contact</li>
                                <li>Help Center</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>Terms of Service</li>
                                <li>Privacy Policy</li>
                                <li>Cookie Policy</li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {lang === 'el' ? 'Γίνε μέρος του community' : 'Join the community'}
                                </Button>
                            </div>
                            <div className="text-gray-400 text-sm">
                                Powered by <a href="https://belowthefold.gr" target="_blank" className="text-blue-400 hover:text-blue-300">Below The Fold</a> | Made in Athens 🇬🇷
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
} 