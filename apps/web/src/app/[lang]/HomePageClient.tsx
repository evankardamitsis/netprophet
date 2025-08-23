'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Alert, AlertDescription } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { useAuth } from '@/hooks/useAuth';

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
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if this is an OAuth callback (has code parameter)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const hasOAuthCode = urlParams.has('code');
        const hasAccessToken = hashParams.has('access_token');
        const hasErrorParam = urlParams.has('error') || hashParams.has('error');

        // If OAuth callback ended up on home page, redirect to proper callback handler
        if (hasOAuthCode || hasAccessToken || hasErrorParam) {
            // Get the stored language from OAuth initiation, fallback to current lang
            const oauthLang = localStorage.getItem('oauth_lang') || lang;

            // Don't clean up oauth_lang here - let the callback page handle it

            // Redirect to the proper callback page with all parameters
            const callbackUrl = `/${oauthLang}/auth/callback${window.location.search}${window.location.hash}`;
            window.location.href = callbackUrl;
            return;
        }

        const checkAuth = async () => {
            try {
                if (user) {
                    // Use window.location for immediate redirect to avoid potential routing issues
                    window.location.href = `/${lang}/matches`;
                    return;
                }

                setLoading(false);
            } catch (err) {
                setLoading(false);
            }
        };

        // Small delay to ensure any OAuth processing has time to complete
        const timer = setTimeout(checkAuth, 300);

        return () => clearTimeout(timer);
    }, [router, lang, user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">{dict?.common?.loading || 'Loading...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <Header lang={lang} />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
                                {lang === 'el' ? 'Γίνε ο επόμενος' : 'Become the next'}{' '}
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Net Prophet</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
                                {lang === 'el'
                                    ? 'Πρόβλεψε πραγματικούς αγώνες. Κέρδισε νομίσματα. Σκαρφάλωσε στο leaderboard.'
                                    : 'Predict real matches. Earn coins. Climb the leaderboard.'
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    size="lg"
                                    className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                                >
                                    {lang === 'el' ? 'Ξεκίνα τώρα' : 'Start Now'}
                                </Button>
                                <Button
                                    size="lg"
                                    className="text-lg px-8 py-4 border-2 border-slate-300 text-slate-700 bg-transparent hover:bg-transparent hover:text-slate-900 hover:border-slate-600"
                                    onClick={() => router.push(`/${lang}/how-it-works`)}
                                >
                                    {dict?.navigation?.howItWorks || 'How It Works'}
                                </Button>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100 rounded-3xl p-8 shadow-2xl">
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Live Match</span>
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Live</Badge>
                                        </div>
                                        <div className="border-t border-slate-200 pt-4">
                                            <div className="text-sm text-slate-500 mb-3">Maroussi Tennis Open • Best of 3</div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                                    <span className="font-semibold text-slate-900">Γιώργος Παπαδόπουλος</span>
                                                    <span className="text-blue-700 font-bold text-lg">1.85</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                                                    <span className="font-semibold text-slate-900">Νίκος Κωνσταντίνου</span>
                                                    <span className="text-slate-700 font-bold text-lg">2.10</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                                                <span className="text-sm text-slate-600">Your pick: Γιώργος Παπαδόπουλος</span>
                                                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">1.85x</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {lang === 'el' ? 'Απλό, σαν να σερβίρεις πρώτο game' : 'Simple, like serving first game'}
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            {lang === 'el' ? 'Μόλις 4 βήματα για να γίνεις Net Prophet με πραγματικούς αγώνες' : 'Just 4 steps to become a Net Prophet with real matches'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🎾</span>
                                </div>
                                <CardTitle className="text-xl text-blue-900">
                                    {lang === 'el' ? 'Διάλεξε αγώνες' : 'Choose matches'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700">
                                    {lang === 'el'
                                        ? 'Επίλεξε από πραγματικούς, ερασιτεχνικούς αγώνες'
                                        : 'Choose from real, amateur matches'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-green-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <CardTitle className="text-xl text-green-900">
                                    {lang === 'el' ? 'Κάνε τις προβλέψεις σου' : 'Make your predictions'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-green-700">
                                    {lang === 'el'
                                        ? 'Πρόβλεψε νικητή, score, tie-breaks και επιπλέον στατιστικά'
                                        : 'Predict winner, score, tie-breaks and additional statistics'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🔥</span>
                                </div>
                                <CardTitle className="text-xl text-purple-900">
                                    {lang === 'el' ? 'Μάζεψε Νομίσματα' : 'Earn Coins'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-purple-700">
                                    {lang === 'el'
                                        ? 'Κέρδισε νομίσματα για κάθε σωστή πρόβλεψη και δημιούργησε streaks'
                                        : 'Earn coins for every correct prediction and build streaks'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-50 to-orange-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <CardTitle className="text-xl text-orange-900">
                                    {lang === 'el' ? 'Ανέβα στο leaderboard' : 'Climb the leaderboard'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-orange-700">
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

            {/* Tournament Formats Section */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {lang === 'el' ? 'Υποστηριζόμενες μορφές τουρνουά' : 'Supported tournament formats'}
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            {lang === 'el' ? 'Πρόβλεψε σε διαφορετικούς τύπους αγώνων με προσαρμοσμένα πεδία' : 'Predict on different match types with customized fields'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardHeader>
                                <div className="w-20 h-20 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🎾</span>
                                </div>
                                <CardTitle className="text-xl text-blue-900">Best of 3</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 font-medium mb-2">2-3 sets</p>
                                <p className="text-blue-600 text-sm">Standard tiebreaks</p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                            <CardHeader>
                                <div className="w-20 h-20 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🏆</span>
                                </div>
                                <CardTitle className="text-xl text-purple-900">Best of 5</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-purple-700 font-medium mb-2">3-5 sets</p>
                                <p className="text-purple-600 text-sm">Grand Slam format</p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                            <CardHeader>
                                <div className="w-20 h-20 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">⚡</span>
                                </div>
                                <CardTitle className="text-xl text-green-900">Best of 3 + Super TB</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-green-700 font-medium mb-2">2 sets + super tiebreak</p>
                                <p className="text-green-600 text-sm">Amateur format</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer lang={lang} dict={dict} />

            {/* Footer Disclaimer */}
            <FooterDisclaimer lang={lang} />
        </div>
    );
} 