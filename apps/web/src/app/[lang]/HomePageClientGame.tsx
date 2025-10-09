'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Player } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { PlayerCard } from '@/components/players/PlayerCard';
import CoinIcon from '@/components/CoinIcon';
import { useAuth } from '@/hooks/useAuth';
import { useProfileClaim } from '@/hooks/useProfileClaim';

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

export default function HomePageClientGame({ dict, lang }: HomePageClientProps) {
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
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const hasOAuthCode = urlParams.has('code');
        const hasAccessToken = hashParams.has('access_token');
        const hasErrorParam = urlParams.has('error') || hashParams.has('error');

        if (hasOAuthCode || hasAccessToken || hasErrorParam) {
            const oauthLang = localStorage.getItem('oauth_lang') || lang;
            const callbackUrl = `/${oauthLang}/auth/callback${window.location.search}${window.location.hash}`;
            window.location.href = callbackUrl;
            return;
        }

        const checkAuth = async () => {
            try {
                if (user) {
                    router.push(`/${lang}/matches`);
                    return;
                }
                setLoading(false);
            } catch (err) {
                setLoading(false);
            }
        };

        const timer = setTimeout(checkAuth, 300);
        return () => clearTimeout(timer);
    }, [router, lang, user, needsProfileSetup]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-800 to-purple-700">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
                    <p className="text-white text-xl font-bold">{dict?.common?.loading || 'Loading...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-800 to-purple-700">
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            {/* Header */}
            <Header lang={lang} />

            {/* Hero Section - Game Style */}
            <section className="relative overflow-hidden pt-8 pb-12 sm:pb-16 lg:pb-20">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-[40%_60%] gap-8 items-center">
                        {/* Left - Title & CTA */}
                        <div className="text-center lg:text-left space-y-6">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border-2 border-white/30">
                                    <span className="animate-pulse text-xl">🎾</span>
                                    <span className="text-white font-bold text-sm">
                                        {lang === 'el' ? 'Νέο Παιχνίδι Προβλέψεων!' : 'New Prediction Game!'}
                                    </span>
                                </div>
                            </div>

                            {/* Title */}
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight">
                                {lang === 'el' ? 'Γίνε ο επόμενος' : 'Become the next'}
                                <br />
                                <span className="text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.5)]">
                                    Net Prophet
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-xl sm:text-2xl text-white/90 font-semibold">
                                {lang === 'el'
                                    ? '🏆 Πρόβλεψε • Κέρδισε • Κυριάρχησε 🏆'
                                    : '🏆 Predict • Win • Dominate 🏆'
                                }
                            </p>

                            {/* Feature Pills */}
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                    <span className="font-bold text-purple-600">🎾 Real Matches</span>
                                </div>
                                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                    <span className="font-bold text-pink-600">🏆 Tournaments</span>
                                </div>
                                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                    <span className="font-bold text-orange-600">⚡ Power-ups</span>
                                </div>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    size="lg"
                                    className="text-xl px-10 py-6 bg-yellow-400 hover:bg-yellow-300 text-purple-800 font-black rounded-2xl shadow-2xl transform hover:scale-105 transition-all"
                                >
                                    {lang === 'el' ? 'Παίξε Τώρα!' : 'Play Now!'}
                                </Button>
                                <Button
                                    size="lg"
                                    className="text-xl px-10 py-6 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl backdrop-blur-md"
                                    onClick={() => router.push(`/${lang}/how-it-works`)}
                                >
                                    {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                                </Button>
                            </div>
                        </div>

                        {/* Right - Video */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 rounded-3xl opacity-60 blur-2xl animate-pulse"></div>
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-slate-900">
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-auto min-h-[400px] sm:min-h-[500px] lg:min-h-0 object-cover lg:object-contain"
                                >
                                    <source src="/images/app-demo.mp4" type="video/mp4" />
                                    {lang === 'el'
                                        ? 'Το πρόγραμμα περιήγησής σας δεν υποστηρίζει βίντεο.'
                                        : 'Your browser does not support the video tag.'
                                    }
                                </video>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How to Play Section - Game Cards Style */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Title */}
                    <div className="text-center mb-12">
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                            {lang === 'el' ? '🎯 Πώς να Παίξεις' : '🎯 How to Play'}
                        </h2>
                        <p className="text-2xl text-white/90 font-bold">
                            {lang === 'el' ? 'Super Εύκολο σε 4 Βήματα!' : 'Super Easy in 4 Steps!'}
                        </p>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Step 1 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white">
                                    1
                                </div>
                                <div className="text-center pt-6">
                                    <div className="text-6xl mb-3">🎾</div>
                                    <h3 className="font-black text-xl text-gray-900 mb-2">
                                        {lang === 'el' ? 'Διάλεξε Αγώνες' : 'Pick Matches'}
                                    </h3>
                                    <p className="text-gray-600 font-semibold">
                                        {lang === 'el' ? 'Από πραγματικά tournaments' : 'From real tournaments'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white">
                                    2
                                </div>
                                <div className="text-center pt-6">
                                    <div className="text-6xl mb-3">🎯</div>
                                    <h3 className="font-black text-xl text-gray-900 mb-2">
                                        {lang === 'el' ? 'Κάνε Προβλέψεις' : 'Make Predictions'}
                                    </h3>
                                    <p className="text-gray-600 font-semibold">
                                        {lang === 'el' ? 'Νικητής, score & tie-breaks' : 'Winner, score & tie-breaks'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white">
                                    3
                                </div>
                                <div className="text-center pt-6">
                                    <div className="flex justify-center mb-3">
                                        <CoinIcon size={72} />
                                    </div>
                                    <h3 className="font-black text-xl text-gray-900 mb-2">
                                        {lang === 'el' ? 'Μάζεψε Coins' : 'Collect Coins'}
                                    </h3>
                                    <p className="text-gray-600 font-semibold">
                                        {lang === 'el' ? 'Κέρδισε για κάθε πρόβλεψη' : 'Earn for each prediction'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white">
                                    4
                                </div>
                                <div className="text-center pt-6">
                                    <div className="text-6xl mb-3">🏆</div>
                                    <h3 className="font-black text-xl text-gray-900 mb-2">
                                        {lang === 'el' ? 'Κυριάρχησε' : 'Dominate'}
                                    </h3>
                                    <p className="text-gray-600 font-semibold">
                                        {lang === 'el' ? 'Ανέβα στο leaderboard!' : 'Climb the leaderboard!'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Player Database Feature */}
                        <div className="order-2 lg:order-1">
                            <div className="backdrop-blur-lg rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border-4 border-white/50">
                                <PlayerCard player={samplePlayer} disableLink={true} />
                                <div className="mt-4 sm:mt-6 text-center">
                                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black shadow-lg text-sm sm:text-base">
                                        <span className="text-xl sm:text-2xl">✨</span>
                                        <span>{lang === 'el' ? '1200+ Παίκτες Διαθέσιμοι!' : '1200+ Players Available!'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2 space-y-6">
                            <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                                {lang === 'el' ? '👥 1200+ Παίκτες' : '👥 1200+ Players'}
                            </h2>
                            <p className="text-xl text-white/90 font-bold">
                                {lang === 'el'
                                    ? 'Πραγματικοί παίκτες με πλήρη στατιστικά! Όλα ενημερώνονται αυτόματα για ακριβείς προβλέψεις.'
                                    : 'Real players with complete stats! All updated automatically for accurate predictions.'
                                }
                            </p>
                            <div className="space-y-3">
                                {[
                                    { icon: '📊', text: lang === 'el' ? 'Ενημερωμένα NTRP Ratings' : 'Updated NTRP Ratings' },
                                    { icon: '🎾', text: lang === 'el' ? 'Πλήρες Ιστορικό Αγώνων' : 'Complete Match History' },
                                    { icon: '⚔️', text: lang === 'el' ? 'Head-to-Head Στατιστικά' : 'Head-to-Head Stats' },
                                    { icon: '🔍', text: lang === 'el' ? 'Προηγμένη Αναζήτηση' : 'Advanced Search' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-3 rounded-xl border-2 border-white/30">
                                        <span className="text-2xl">{item.icon}</span>
                                        <span className="text-white font-bold text-lg">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Feature */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center mt-16">
                        <div className="space-y-6">
                            <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                                {lang === 'el' ? '🏆 Γίνε ο Βασιλιάς!' : '🏆 Be the King!'}
                            </h2>
                            <p className="text-xl text-white/90 font-bold">
                                {lang === 'el'
                                    ? 'Live κατάταξη με τους καλύτερους! Μάζεψε coins, κέρδισε streaks και ανέβα στην κορυφή!'
                                    : 'Live rankings with the best! Collect coins, build streaks and climb to the top!'
                                }
                            </p>
                            <div className="space-y-3">
                                {[
                                    { icon: '🔥', text: lang === 'el' ? 'Live Κατάταξη' : 'Live Rankings' },
                                    { icon: '⚡', text: lang === 'el' ? 'Streaks & Achievements' : 'Streaks & Achievements' },
                                    { icon: '📈', text: lang === 'el' ? 'Ποσοστό Επιτυχίας' : 'Success Rate' },
                                    { icon: '🎖️', text: lang === 'el' ? 'Badges & Διακρίσεις' : 'Badges & Awards' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-3 rounded-xl border-2 border-white/30">
                                        <span className="text-2xl">{item.icon}</span>
                                        <span className="text-white font-bold text-lg">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50">
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 text-center">
                                    <h3 className="font-black text-2xl text-white drop-shadow-lg">
                                        {lang === 'el' ? '🏆 Top Net Prophets' : '🏆 Top Net Prophets'}
                                    </h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Top 3 */}
                                    {[
                                        { rank: 1, emoji: '🥇', name: 'Prophet Master', coins: 2450, rate: 85, color: 'from-yellow-400 to-yellow-500' },
                                        { rank: 2, emoji: '🥈', name: 'Tennis Oracle', coins: 2180, rate: 82, color: 'from-gray-300 to-gray-400' },
                                        { rank: 3, emoji: '🥉', name: 'Net Genius', coins: 1950, rate: 79, color: 'from-orange-400 to-orange-500' }
                                    ].map((player) => (
                                        <div key={player.rank} className={`bg-gradient-to-r ${player.color} rounded-2xl p-4 shadow-lg transform hover:scale-105 transition-all`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-4xl">{player.emoji}</span>
                                                    <div>
                                                        <div className="font-black text-white text-lg">{player.name}</div>
                                                        <div className="text-sm text-white/90 font-bold flex items-center gap-1">
                                                            {player.coins} <CoinIcon size={16} /> • {player.rate}% {lang === 'el' ? 'Επιτυχία' : 'Success'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-white font-black text-2xl">#{player.rank}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Tournament Results Section */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                            {lang === 'el' ? '🏆 Όλα τα Τουρνουά' : '🏆 All Tournaments'}
                        </h2>
                        <p className="text-xl text-white/90 font-bold">
                            {lang === 'el' ? 'Ενημερωμένα καθημερινά - Όλα μέσα στο NetProphet!' : 'Updated daily - All inside NetProphet!'}
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h3 className="text-3xl font-black text-white mb-4">
                                {lang === 'el' ? '📊 Live Αποτελέσματα' : '📊 Live Results'}
                            </h3>
                            <p className="text-xl text-white/90 font-bold">
                                {lang === 'el'
                                    ? 'Παρακολούθησε όλα τα τουρνουά σε πραγματικό χρόνο με αποτελέσματα που ενημερώνονται καθημερινά!'
                                    : 'Follow all tournaments in real-time with results updated daily!'
                                }
                            </p>
                            <div className="space-y-3">
                                {[
                                    { icon: '🎾', text: lang === 'el' ? 'Live Αποτελέσματα Αγώνων' : 'Live Match Results' },
                                    { icon: '📊', text: lang === 'el' ? 'Ενημερωμένα Στατιστικά' : 'Updated Statistics' },
                                    { icon: '🏆', text: lang === 'el' ? 'Tournament Leaderboards' : 'Tournament Leaderboards' },
                                    { icon: '📅', text: lang === 'el' ? 'Καθημερινές Ενημερώσεις' : 'Daily Updates' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-3 rounded-xl border-2 border-white/30">
                                        <span className="text-2xl">{item.icon}</span>
                                        <span className="text-white font-bold text-lg">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-center">
                                    <h3 className="font-black text-2xl text-white drop-shadow-lg">
                                        🏆 Maroussi Tennis Open
                                    </h3>
                                    <p className="text-white/90 font-bold text-sm mt-1">Live Tournament Results</p>
                                </div>
                                <div className="p-6 space-y-3">
                                    <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-black text-white text-lg">Γιώργος Παπαδόπουλος</div>
                                                <div className="text-sm text-white/90 font-bold">6-4, 6-2</div>
                                            </div>
                                            <div className="text-white font-black text-3xl">W</div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-red-400 to-red-500 rounded-2xl p-4 shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-black text-white text-lg">Νίκος Κωνσταντίνου</div>
                                                <div className="text-sm text-white/90 font-bold">4-6, 2-6</div>
                                            </div>
                                            <div className="text-white font-black text-3xl">L</div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-black text-white text-lg">Μαρία Κωνσταντίνου</div>
                                                <div className="text-sm text-white/90 font-bold">6-3, 6-1</div>
                                            </div>
                                            <div className="text-white font-black text-3xl">W</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                                        <div className="text-center">
                                            <div className="text-sm text-white font-bold">
                                                <span className="font-black">{lang === 'el' ? 'Ενημερώθηκε:' : 'Updated:'}</span> 15 Σεπτεμβρίου 2025
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Welcome Bonus - Game Reward Style */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 rounded-2xl sm:rounded-[3rem] opacity-60 blur-3xl animate-pulse"></div>

                        <div className="relative bg-white rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden border-4 sm:border-8 border-white/50">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-4 sm:px-8 py-4 sm:py-6 text-center">
                                <div className="text-xs sm:text-sm font-black text-white/90 uppercase tracking-widest mb-1 sm:mb-2">
                                    🎉 {lang === 'el' ? 'Bonus Καλωσορισματος' : 'Welcome Bonus'} 🎉
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg">
                                    {lang === 'el' ? 'Έτοιμος να Παίξεις;' : 'Ready to Play?'}
                                </h2>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6 lg:p-8">
                                {/* Rewards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                                    <div className="text-center group">
                                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg transform group-hover:scale-110 transition-all">
                                            <div className="flex justify-center mb-2 sm:mb-3">
                                                <CoinIcon size={60} className="sm:w-20 sm:h-20" />
                                            </div>
                                            <div className="text-3xl sm:text-4xl font-black text-white mb-1 sm:mb-2">100</div>
                                            <div className="text-sm sm:text-base font-bold text-white/90">{lang === 'el' ? 'Νομίσματα' : 'Coins'}</div>
                                            <div className="text-xs text-white/70 mt-1 sm:mt-2">{lang === 'el' ? 'Άμεση πίστωση' : 'Instant credit'}</div>
                                        </div>
                                    </div>
                                    <div className="text-center group">
                                        <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg transform group-hover:scale-110 transition-all">
                                            <div className="text-5xl sm:text-7xl mb-2 sm:mb-3">🎟️</div>
                                            <div className="text-3xl sm:text-4xl font-black text-white mb-1 sm:mb-2">1</div>
                                            <div className="text-sm sm:text-base font-bold text-white/90">Tournament Pass</div>
                                            <div className="text-xs text-white/70 mt-1 sm:mt-2">{lang === 'el' ? 'Δωρεάν πρόσβαση' : 'Free access'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA */}
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    size="lg"
                                    className="w-full text-lg sm:text-2xl px-6 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl sm:rounded-2xl shadow-xl transform hover:scale-105 transition-all border-2 sm:border-4 border-purple-400"
                                >
                                    {lang === 'el' ? '🎮 Παίξε Τώρα Δωρεάν!' : '🎮 Play Now Free!'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="bg-slate-900">
                <Footer lang={lang} dict={dict} />
                <FooterDisclaimer lang={lang} />
            </div>
        </div >
    );
}

