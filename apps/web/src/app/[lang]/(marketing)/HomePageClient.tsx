'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Player } from '@netprophet/lib';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Alert, AlertDescription } from '@netprophet/ui';
import Header from '@/components/Header';
import { InfoBar } from '@/components/InfoBar';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { PlayerCard } from '@/components/players/PlayerCard';
import CoinIcon from '@/components/CoinIcon';
import { useAuth } from '@/hooks/useAuth';
import { useProfileClaim } from '@/hooks/useProfileClaim';
import { buttons } from '@/styles/design-system';

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
    const { needsProfileSetup, loading: profileLoading } = useProfileClaim(user?.id || null);
    const [loading, setLoading] = useState(true);

    // Hardcoded sample player data
    const samplePlayer: Player = {
        id: 'sample-player-id',
        firstName: 'Γιώργος',
        lastName: 'Παπαδόπουλος',
        age: 28,
        ntrpRating: 4.5,
        hand: 'right',
        surfacePreference: 'Clay',
        wins: 15,
        losses: 4,
        last5: ['W', 'W', 'L', 'W', 'W'],
        currentStreak: 2,
        streakType: 'W',
        aggressiveness: 7,
        stamina: 8,
        consistency: 7,
        injuryStatus: 'healthy',
        isHidden: false,
        isActive: true
    };

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
                    // Redirect to matches page (profile setup will be handled separately)
                    router.push(`/${lang}/matches`);
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
    }, [router, lang, user, needsProfileSetup]);

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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
            {/* Info Bar */}
            <div className="relative z-50">
                <InfoBar lang={lang} />
            </div>
            {/* Header */}
            <Header lang={lang} />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 xl:py-32">
                    <div className="grid lg:grid-cols-[40%_60%] gap-8 lg:gap-12 xl:gap-16 items-stretch">
                        <div className="text-center lg:text-left flex flex-col justify-center">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                                {lang === 'el' ? 'Γίνε ο επόμενος' : 'Become the next'}{' '}
                                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Net Prophet</span>
                            </h1>
                            <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-6 sm:mb-8 leading-relaxed">
                                {lang === 'el'
                                    ? 'Το πιο διασκεδαστικό παιχνίδι προβλέψεων με πραγματικούς ερασιτεχνικούς αγώνες και τουρνουά.'
                                    : 'The most exciting tennis prediction game with real amateur matches and tournaments.'
                                }
                            </p>
                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8 justify-center lg:justify-start">
                                <span className="bg-blue-500/20 text-blue-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border border-blue-500/30">🎾 Πραγματικοί Αγώνες</span>
                                <span className="bg-purple-500/20 text-purple-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border border-purple-500/30">🏆 Τουρνουά & Αποτελέσματα</span>
                                <span className="bg-green-500/20 text-green-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border border-green-500/30">⚡ Power-ups</span>
                                <span className="bg-yellow-500/20 text-yellow-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border border-yellow-500/30">🎁 100 Coins + Pass</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/register`)}
                                    size="lg"
                                    style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                    className={`text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 ${buttons.primary.className} shadow-lg`}
                                >
                                    {lang === 'el' ? 'Ξεκίνα τώρα' : 'Start Now'}
                                </Button>
                                <Button
                                    size="lg"
                                    style={{ backgroundColor: buttons.secondary.bg, color: buttons.secondary.color }}
                                    className={`text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 ${buttons.secondary.className}`}
                                    onClick={() => router.push(`/${lang}/how-it-works`)}
                                >
                                    {dict?.navigation?.howItWorks || 'How It Works'}
                                </Button>
                            </div>
                        </div>
                        <div className="relative h-full min-h-[400px] lg:min-h-[500px]">
                            {/* App Demo Video */}
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 h-full bg-slate-900">
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-contain"
                                >
                                    <source src="/images/app-demo.mp4" type="video/mp4" />
                                    {lang === 'el'
                                        ? 'Το πρόγραμμα περιήγησής σας δεν υποστηρίζει βίντεο.'
                                        : 'Your browser does not support the video tag.'
                                    }
                                </video>
                                {/* Optional overlay gradient for better contrast */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - 4 Step Flow */}
            <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            {lang === 'el' ? 'Μόλις 4 βήματα για να γίνεις Net Prophet' : 'Just 4 steps to become a Net Prophet'}
                        </h2>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            {lang === 'el' ? 'Πρόβλεψε νικητή, score, tie-breaks και μάζεψε νομίσματα' : 'Predict winner, score, tie-breaks and earn coins'}
                        </p>
                    </div>

                    {/* Flow Container */}
                    <div className="relative">
                        {/* Connecting Line - Desktop only */}
                        <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-20 transform -translate-y-1/2 z-0"></div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 relative z-10">
                            {/* Step 1 */}
                            <div className="group relative">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 border-4 border-slate-900">
                                    1
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                <Card className="relative text-center shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border-2 border-blue-400/30 hover:border-blue-400/50 hover:scale-105 pt-8">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white">
                                            {lang === 'el' ? 'Διάλεξε αγώνες' : 'Choose matches'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-blue-100">
                                            {lang === 'el'
                                                ? 'Επίλεξε από πραγματικούς, ερασιτεχνικούς αγώνες'
                                                : 'Choose from real, amateur matches'
                                            }
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 2 */}
                            <div className="group relative">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 border-4 border-slate-900">
                                    2
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                <Card className="relative text-center shadow-2xl hover:shadow-green-500/25 transition-all duration-300 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-2 border-green-400/30 hover:border-green-400/50 hover:scale-105 pt-8">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white">
                                            {lang === 'el' ? 'Κάνε τις προβλέψεις σου' : 'Make your predictions'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-green-100">
                                            {lang === 'el'
                                                ? 'Πρόβλεψε νικητή, score, tie-breaks και επιπλέον στατιστικά'
                                                : 'Predict winner, score, tie-breaks and additional statistics'
                                            }
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 3 */}
                            <div className="group relative">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 border-4 border-slate-900">
                                    3
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                <Card className="relative text-center shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border-2 border-purple-400/30 hover:border-purple-400/50 hover:scale-105 pt-8">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white">
                                            {lang === 'el' ? 'Μάζεψε Νομίσματα' : 'Earn Coins'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-purple-100">
                                            {lang === 'el'
                                                ? 'Κέρδισε νομίσματα για κάθε σωστή πρόβλεψη και δημιούργησε streaks'
                                                : 'Earn coins for every correct prediction and build streaks'
                                            }
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 4 */}
                            <div className="group relative">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 border-4 border-slate-900">
                                    4
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                <Card className="relative text-center shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-sm border-2 border-orange-400/30 hover:border-orange-400/50 hover:scale-105 pt-8">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white">
                                            {lang === 'el' ? 'Ανέβα στο leaderboard' : 'Climb the leaderboard'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-orange-100">
                                            {lang === 'el'
                                                ? 'Δείξε σε όλους ποιος είναι ο καλύτερος Net Prophet'
                                                : 'Show everyone who is the best Net Prophet'
                                            }
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Advanced Features Section */}
            <section className="py-20 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            {lang === 'el' ? 'Προηγμένες Λειτουργίες' : 'Advanced Features'}
                        </h2>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            {lang === 'el' ? 'Ανακάλυψε όλες τις δυνατότητες που κάνουν το NetProphet μοναδικό' : 'Discover all the features that make NetProphet unique'}
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-6">
                                {lang === 'el' ? '👥 1200+ Παίκτες με Πλήρη Δεδομένα' : '👥 1200+ Players with Complete Data'}
                            </h3>
                            <p className="text-slate-300 mb-6">
                                {lang === 'el'
                                    ? 'Πρόσβαση σε εκτενή βάση δεδομένων με πλήρη στατιστικά για κάθε παίκτη. Όλα τα δεδομένα ενημερώνονται αυτόματα, δίνοντάς σου ακριβείς πληροφορίες για κάθε πρόβλεψη.'
                                    : 'Access an extensive database with complete statistics for every player. All data is automatically updated, giving you accurate information for every prediction.'
                                }
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Ενημερωμένα NTRP Ratings' : 'Updated NTRP Ratings'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Πλήρες Ιστορικό Αγώνων' : 'Complete Match History'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Head-to-Head Στατιστικά' : 'Head-to-Head Statistics'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Προηγμένη αναζήτηση και φίλτρα' : 'Advanced search and filters'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-400/30">

                            {/* Actual Player Card */}
                            <PlayerCard player={samplePlayer} disableLink={true} />

                            <div className="mt-6 pt-6 border-t border-white/20">
                                <div className="text-center">
                                    <div className="text-sm text-slate-300">
                                        {lang === 'el' ? '1200+ παίκτες διαθέσιμοι' : '1200+ players available'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        <div className="order-2 lg:order-1">
                            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/30">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-white/20">
                                    <div className="text-center mb-6">
                                        <h4 className="font-bold text-white flex items-center justify-center gap-2 mb-2">
                                            <span className="text-2xl">🏆</span>
                                            {lang === 'el' ? 'Κορυφαίοι Net Prophets' : 'Top Net Prophets'}
                                        </h4>
                                        <p className="text-sm text-slate-300">{lang === 'el' ? 'Οι καλύτεροι του μήνα' : 'Best of the month'}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🥇</span>
                                                <div>
                                                    <div className="font-semibold text-white">Prophet Master</div>
                                                    <div className="text-xs text-slate-300">2,450 {lang === 'el' ? 'Νομίσματα' : 'Coins'} • 85% {lang === 'el' ? 'Επιτυχία' : 'Success'}</div>
                                                </div>
                                            </div>
                                            <div className="text-yellow-400 font-bold">#1</div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-500/20 rounded-lg border border-slate-400/30">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🥈</span>
                                                <div>
                                                    <div className="font-semibold text-white">Tennis Oracle</div>
                                                    <div className="text-xs text-slate-300">2,180 {lang === 'el' ? 'Νομίσματα' : 'Coins'} • 82% {lang === 'el' ? 'Επιτυχία' : 'Success'}</div>
                                                </div>
                                            </div>
                                            <div className="text-slate-400 font-bold">#2</div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-orange-500/20 rounded-lg border border-orange-400/30">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🥉</span>
                                                <div>
                                                    <div className="font-semibold text-white">Net Genius</div>
                                                    <div className="text-xs text-slate-300">1,950 {lang === 'el' ? 'Νομίσματα' : 'Coins'} • 79% {lang === 'el' ? 'Επιτυχία' : 'Success'}</div>
                                                </div>
                                            </div>
                                            <div className="text-orange-400 font-bold">#3</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/20">
                                        <div className="text-center">
                                            <div className="text-sm text-slate-300">
                                                {lang === 'el' ? 'Θα είσαι ο επόμενος;' : 'Will you be next?'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <h3 className="text-2xl font-bold text-white mb-6">
                                {lang === 'el' ? '🏆 Γίνε ο βασιλιάς του Leaderboard' : '🏆 Be the king of the Leaderboard'}
                            </h3>
                            <p className="text-slate-300 mb-6">
                                {lang === 'el'
                                    ? 'Κατάταξη σε πραγματικό χρόνο με τους καλύτερους Net Prophets! Μάζεψε νομίσματα, κέρδισε streaks και ανέβα στην κορυφή. Δείξε σε όλους ποιος έχει το καλύτερο ένστικτο πρόβλεψης.'
                                    : 'Real-time rankings with the best Net Prophets! Collect coins, build streaks and climb to the top. Show everyone who has the best prediction instinct.'
                                }
                            </p>
                            <div className="space-y-3">

                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Live Κατάταξη Παικτών' : 'Live Player Rankings'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Streaks & Επιτεύγματα' : 'Streaks & Achievements'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Ποσοστό Επιτυχίας & Στατιστικά' : 'Success Rate & Statistics'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Συνολικά Νομίσματα & Διακρίσεις' : 'Total Coins & Badges'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Welcome Bonus Banner */}
            <section className="py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-4xl">🎁</span>
                                <span className="text-2xl font-bold">Welcome Bonus</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                {lang === 'el' ? 'Ξεκίνα με 100 Νομίσματα + Tournament Pass!' : 'Start with 100 Coins + Tournament Pass!'}
                            </h2>
                            <p className="text-xl mb-8 opacity-90">
                                {lang === 'el'
                                    ? 'Νέοι χρήστες λαμβάνουν δωρεάν νομίσματα και πρόσβαση σε τουρνουά. Χρησιμοποίησε power-ups για να αυξήσεις τις πιθανότητές σου!'
                                    : 'New users receive free coins and tournament access. Use power-ups to increase your chances!'
                                }
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold mb-1 flex items-center justify-center gap-2">100 <CoinIcon size={28} /></div>
                                    <div className="text-sm opacity-90">Welcome Coins</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold mb-1">🎫</div>
                                    <div className="text-sm opacity-90">Tournament Pass</div>
                                </div>
                            </div>

                            <Button
                                onClick={() => router.push(`/${lang}/auth/register`)}
                                size="lg"
                                style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                className={`text-xl px-8 py-4 ${buttons.primary.className} shadow-xl`}
                            >
                                {lang === 'el' ? 'Ξεκίνα Τώρα Δωρεάν' : 'Start Now Free'}
                            </Button>
                        </div>

                        <div className="relative">
                            {/* Game-like reward display */}
                            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-center">
                                    <div className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
                                        {lang === 'el' ? 'Πακέτο Καλωσορίσματος' : 'Welcome Rewards'}
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {lang === 'el' ? 'Ξεκλείδωσε Τώρα!' : 'Unlock Now!'}
                                    </div>
                                </div>

                                {/* Rewards Grid */}
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        {/* Coins */}
                                        <div className="text-center group">
                                            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30 mb-2 group-hover:border-yellow-500/50 transition-all">
                                                <div className="flex justify-center mb-2">
                                                    <CoinIcon size={48} />
                                                </div>
                                                <div className="text-2xl font-bold text-white mb-1">100</div>
                                                <div className="text-xs text-slate-300">{lang === 'el' ? 'Νομίσματα' : 'Coins'}</div>
                                            </div>
                                        </div>

                                        {/* Pass */}
                                        <div className="text-center group">
                                            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30 mb-2 group-hover:border-purple-500/50 transition-all">
                                                <div className="text-4xl mb-2">🎫</div>
                                                <div className="text-2xl font-bold text-white mb-1">1</div>
                                                <div className="text-xs text-slate-300">{lang === 'el' ? 'Pass' : 'Pass'}</div>
                                            </div>
                                        </div>

                                        {/* Power-ups */}
                                        <div className="text-center group">
                                            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-500/30 mb-2 group-hover:border-blue-500/50 transition-all">
                                                <div className="text-4xl mb-2">⚡</div>
                                                <div className="text-2xl font-bold text-white mb-1">3</div>
                                                <div className="text-xs text-slate-300">{lang === 'el' ? 'Power-ups' : 'Power-ups'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats/Info */}
                                    <div className="bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-700/50">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-400">{lang === 'el' ? 'Συνολική Αξία' : 'Total Value'}</span>
                                            <span className="font-bold text-green-400">€15+</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-2">
                                            <span className="text-slate-400">{lang === 'el' ? 'Διαθεσιμότητα' : 'Availability'}</span>
                                            <span className="font-semibold text-blue-400">{lang === 'el' ? 'Νέοι Χρήστες' : 'New Users'}</span>
                                        </div>
                                    </div>

                                    {/* Bonus features list */}
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="text-green-400">✓</span>
                                            <span>{lang === 'el' ? 'Άμεση πίστωση νομισμάτων' : 'Instant coin credit'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="text-green-400">✓</span>
                                            <span>{lang === 'el' ? 'Πρόσβαση σε όλα τα τουρνουά' : 'Access to all tournaments'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="text-green-400">✓</span>
                                            <span>{lang === 'el' ? 'Boost για τις πρώτες προβλέψεις' : 'Boost for first predictions'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Tournament Results Section */}
            <section className="py-20 bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            {lang === 'el' ? '🏆 Όλα τα Τουρνουά σε Ένα Μέρος' : '🏆 All Tournaments in One Place'}
                        </h2>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            {lang === 'el' ? 'Δες όλα τα ενεργά τουρνουά και τα αποτελέσματά τους, ενημερωμένα καθημερινά. Όλα μέσα στο NetProphet!' : 'See all active tournaments and their results, updated daily. All inside NetProphet!'}
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-6">
                                {lang === 'el' ? '📊 Live Αποτελέσματα & Στατιστικά' : '📊 Live Results & Statistics'}
                            </h3>
                            <p className="text-slate-300 mb-6">
                                {lang === 'el'
                                    ? 'Παρακολούθησε όλα τα τουρνουά σε πραγματικό χρόνο. Αποτελέσματα αγώνων, στατιστικά παικτών, leaderboards και πολλά άλλα - όλα ενημερωμένα καθημερινά!'
                                    : 'Follow all tournaments in real-time. Match results, player statistics, leaderboards and much more - all updated daily!'
                                }
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Live Αποτελέσματα Αγώνων' : 'Live Match Results'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Ενημερωμένα Στατιστικά Παικτών' : 'Updated Player Statistics'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Tournament Leaderboards' : 'Tournament Leaderboards'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-xl">✓</span>
                                    <span className="text-slate-300">{lang === 'el' ? 'Καθημερινές Ενημερώσεις' : 'Daily Updates'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-slate-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-8 border border-slate-400/30">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-white/20">
                                <div className="text-center mb-6">
                                    <h4 className="font-bold text-white flex items-center justify-center gap-2 mb-2">
                                        <span className="text-2xl">🏆</span>
                                        Maroussi Tennis Open
                                    </h4>
                                    <p className="text-sm text-slate-300">Live Tournament Results</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-green-500/20 rounded-lg border border-green-400/30">
                                        <div>
                                            <div className="font-semibold text-white">Γιώργος Παπαδόπουλος</div>
                                            <div className="text-sm text-slate-300">6-4, 6-2</div>
                                        </div>
                                        <div className="text-green-400 font-bold">W</div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <div>
                                            <div className="font-semibold text-white">Νίκος Κωνσταντίνου</div>
                                            <div className="text-sm text-slate-300">4-6, 2-6</div>
                                        </div>
                                        <div className="text-red-400 font-bold">L</div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                                        <div>
                                            <div className="font-semibold text-white">Μαρία Κωνσταντίνου</div>
                                            <div className="text-sm text-slate-300">6-3, 6-1</div>
                                        </div>
                                        <div className="text-blue-400 font-bold">W</div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/20">
                                    <div className="text-center">
                                        <div className="text-sm text-slate-300 mb-2">
                                            <span className="font-semibold">{lang === 'el' ? 'Ενημερώθηκε:' : 'Updated:'}</span> 15 Σεπτεμβρίου 2025
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {lang === 'el' ? 'Όλα τα αποτελέσματα ενημερώνονται καθημερινά' : 'All results updated daily'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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