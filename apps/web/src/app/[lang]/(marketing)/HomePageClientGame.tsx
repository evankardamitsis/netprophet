'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Player } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
import Header from '@/components/Header';
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
                    <p className="text-white text-xl font-bold">{dict?.common?.loading || 'Loading...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            {/* Header */}
            <Header lang={lang} />

            {/* Hero Section - Game Style */}
            <section className="relative overflow-hidden py-2 sm:py-6 lg:py-8">
                {/* Secondary background image spanning from center to right */}
                <div className="absolute top-0 bottom-0 left-1/3 right-0 z-0 opacity-10 hidden lg:block">
                    <Image
                        src="/secondary_hero_bg.png"
                        alt={lang === 'el' ? 'NetProphet Background' : 'NetProphet Background'}
                        width={1200}
                        height={450}
                        className="w-full  object-contain"
                    />
                </div>

                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center">
                        {/* Left - Title & CTA */}
                        <div className="w-full lg:w-[35%] text-center lg:text-left space-y-6 sm:space-y-6 lg:pr-8 relative z-10 ">
                            {/* Subtitle */}
                            <p className="text-xs lg:text-lg text-white font-bold inline-block px-4 py-2 sm:px-4 sm:py-2 rounded-full" style={{ backgroundColor: '#BE05A1' }}>
                                {lang === 'el'
                                    ? '"Πόσο καλά νομίζεις ότι ξέρεις το παιχνίδι;"'
                                    : 'How well can you read the game?'
                                }
                            </p>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                                {lang === 'el' ? 'Γίνε ο επόμενος' : 'Become the next'}
                                <br />
                                <span className="text-yellow-300">
                                    Net Prophet
                                </span>
                            </h1>

                            {/* Description */}
                            <p className="text-lg sm:text-lg md:text-xl text-white/90 font-bold max-w-2xl mx-auto lg:mx-0">
                                {lang === 'el'
                                    ? 'Ο τρόπος να κερδίζεις και εκτός γηπέδου. Μάντεψε νικητές, μάζεψε coins, κυριάρχησε στο leaderboard!'
                                    : 'The way to win off the court. Predict winners, collect coins, dominate the leaderboard!'}
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 justify-center lg:justify-start pt-6 sm:pt-6">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    size="lg"
                                    style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                    className={`text-lg sm:text-lg px-8 py-4 sm:px-8 sm:py-4 ${buttons.primary.className} shadow-2xl`}
                                >
                                    {lang === 'el' ? 'Παίξε Τώρα!' : 'Play Now!'}
                                </Button>
                                <Button
                                    size="lg"
                                    style={{ backgroundColor: buttons.secondary.bg, color: buttons.secondary.color }}
                                    className={`text-lg sm:text-lg px-8 py-4 sm:px-8 sm:py-4 ${buttons.secondary.className} backdrop-blur-md`}
                                    onClick={() => router.push(`/${lang}/how-it-works`)}
                                >
                                    {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                                </Button>
                            </div>
                        </div>

                        {/* Right - Visual Elements - Centered Image */}
                        <div className="w-full lg:w-[50%] flex justify-center items-center relative z-20">
                            <div className="flex items-center justify-center h-[600px] ">
                                <Image
                                    src="/main_hero_bg.png"
                                    alt={lang === 'el' ? 'NetProphet App Interface' : 'NetProphet App Interface'}
                                    width={1000}
                                    height={800}
                                    className="w-auto h-auto max-w-[500px] max-h-[600px] sm:max-w-[500px] sm:max-h-[600px] lg:max-w-[700px] lg:max-h-[800px] object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How to Play Section - Game Cards Style */}
            <section className="pt-0 pb-12 sm:pb-16 lg:pb-20 relative" style={{
                background: 'linear-gradient(180deg, #1A2240 0%, #141D49 100%)',
                boxShadow: '-22px 4px 120px 0px #121A39'
            }}>
                {/* Curved top shape - overlaps hero section */}
                <div
                    className="absolute -top-32 left-0 right-0 h-64"
                    style={{
                        background: 'linear-gradient(180deg, #1A2240 0%, #141D49 100%)',
                        clipPath: 'ellipse(100% 100% at 50% 100%)',
                        zIndex: 1
                    }}
                ></div>
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Title */}
                    <div className="text-center mb-12">
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                            {lang === 'el' ? 'Πώς να Παίξεις' : 'How to Play'}
                        </h2>
                        <p className="text-2xl text-white/90 font-bold">
                            {lang === 'el' ? 'Super Εύκολο σε 4 Βήματα!' : 'Super Easy in 4 Steps!'}
                        </p>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
                        {/* Step 1 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-slate-800 rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all border border-purple-400/30">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-pink-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg">
                                    {lang === 'el' ? 'Βήμα 1ο' : 'Step 1'}
                                </div>
                                <div className="text-center pt-6">
                                    <div className="text-6xl mb-3">🎾</div>
                                    <h3 className="font-black text-xl text-white mb-2">
                                        {lang === 'el' ? 'Διάλεξε Αγώνες' : 'Pick Matches'}
                                    </h3>
                                    <p className="text-white/80 font-semibold text-sm">
                                        {lang === 'el' ? 'Κάθε μέρα σε περιμένουν νέες αναμετρήσεις από πραγματικά τουρνουά!' : 'Every day you will find new challenges from real tournaments!'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-slate-800 rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all border border-blue-400/30">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg">
                                    {lang === 'el' ? 'Βήμα 2ο' : 'Step 2'}
                                </div>
                                <div className="text-center pt-6">
                                    <div className="text-6xl mb-3">🎯</div>
                                    <h3 className="font-black text-xl text-white mb-2">
                                        {lang === 'el' ? 'Κάνε Προβλέψεις' : 'Make Predictions'}
                                    </h3>
                                    <p className="text-white/80 font-semibold text-sm">
                                        {lang === 'el' ? 'Μάντεψε ποιος θα κερδίσει (και με τι σκορ) — πριν αρχίσει το ματς!' : 'Predict winners and score — before it becomes a highlight!'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-slate-800 rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all border border-green-400/30">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-green-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg">
                                    {lang === 'el' ? 'Βήμα 3ο' : 'Step 3'}
                                </div>
                                <div className="text-center pt-6">
                                    <div className="flex justify-center mb-3">
                                        <CoinIcon size={72} />
                                    </div>
                                    <h3 className="font-black text-xl text-white mb-2">
                                        {lang === 'el' ? 'Μάζεψε Coins' : 'Collect Coins'}
                                    </h3>
                                    <p className="text-white/80 font-semibold text-sm">
                                        {lang === 'el' ? 'Κέρδισε νομίσματα για κάθε σωστή πρόβλεψη' : 'Earn coins for each correct prediction'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-slate-800 rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all border border-orange-400/30">
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg">
                                    {lang === 'el' ? 'Βήμα 4ο' : 'Step 4'}
                                </div>
                                <div className="text-center pt-6">
                                    <div className="text-6xl mb-3">🏆</div>
                                    <h3 className="font-black text-xl text-white mb-2">
                                        {lang === 'el' ? 'Κυριάρχησε' : 'Dominate'}
                                    </h3>
                                    <p className="text-white/80 font-semibold text-sm">
                                        {lang === 'el' ? 'Ανέβα στο leaderboard, δείξε ποιος «το έχει» και γίνε NetProphet!' : 'Climb the leaderboard, show everyone who «has it» and become a NetProphet!'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center mt-12">
                        <Button
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            size="lg"
                            style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                            className={`text-xl px-10 py-6 ${buttons.primary.className} shadow-2xl`}
                        >
                            {lang === 'el' ? 'Παίξε τώρα!' : 'Play now!'}
                        </Button>
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
            <section className="py-12 sm:py-16 lg:py-20 relative" style={{
                background: 'linear-gradient(135deg, #1A0B2E 0%, #2D1B69 25%, #4C2A85 50%, #6B46C1 75%, #8B5CF6 100%)',
                boxShadow: 'inset 0 0 100px rgba(139, 92, 246, 0.3)'
            }}>
                {/* Decorative elements */}
                <div className="absolute top-10 left-10 w-64 h-64 bg-purple-400 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-20 w-80 h-80 bg-pink-400 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-indigo-400 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        {/* Left - Text Content */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-5xl">🎁</span>
                                <span className="text-3xl font-black text-white">Welcome Bonus</span>
                            </div>
                            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 drop-shadow-lg">
                                {lang === 'el' ? 'Ξεκίνα με 100 Νομίσματα + Tournament Pass!' : 'Start with 100 Coins + Tournament Pass!'}
                            </h2>
                            <p className="text-xl text-white/90 font-bold mb-8">
                                {lang === 'el'
                                    ? 'Νέοι χρήστες λαμβάνουν δωρεάν νομίσματα και πρόσβαση σε τουρνουά. Ξεκίνα να παίζεις αμέσως!'
                                    : 'New users receive free coins and tournament access. Start playing immediately!'
                                }
                            </p>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center border-2 border-white/30 transform hover:scale-105 transition-all">
                                    <div className="flex items-center justify-center gap-2 text-4xl font-black text-white mb-1">
                                        100 <CoinIcon size={36} />
                                    </div>
                                    <div className="text-sm text-white/90 font-bold">Welcome Coins</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center border-2 border-white/30 transform hover:scale-105 transition-all">
                                    <div className="text-5xl mb-1">🎟️</div>
                                    <div className="text-sm text-white/90 font-bold">Tournament Pass</div>
                                </div>
                            </div>

                            {/* CTA */}
                            <Button
                                onClick={() => router.push(`/${lang}/auth/signin`)}
                                size="lg"
                                style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                className={`text-xl px-10 py-6 ${buttons.primary.className} shadow-2xl`}
                            >
                                {lang === 'el' ? 'Ξεκίνα Τώρα Δωρεάν!' : 'Start Now Free!'}
                            </Button>
                        </div>

                        {/* Right - Visual Rewards */}
                        <div className="hidden lg:block relative space-y-6">
                            {/* Large Coin Card */}
                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-600 to-orange-400 rounded-3xl opacity-40 blur-2xl group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-white/80 font-bold text-lg mb-2">{lang === 'el' ? 'Bonus Νομίσματα' : 'Bonus Coins'}</div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-7xl font-black text-white drop-shadow-lg">100</div>
                                                <CoinIcon size={72} />
                                            </div>
                                            <div className="text-white/90 font-bold text-sm mt-2">{lang === 'el' ? '✨ Άμεση πίστωση' : '✨ Instant credit'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tournament Pass Card */}
                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-pink-700 to-purple-400 rounded-3xl opacity-40 blur-2xl group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative bg-gradient-to-br from-pink-700 to-purple-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="text-white/80 font-bold text-lg mb-2">{lang === 'el' ? 'Πρόσβαση Τουρνουά' : 'Tournament Access'}</div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-8xl">🎟️</div>
                                                <div>
                                                    <div className="text-6xl font-black text-white drop-shadow-lg">1</div>
                                                    <div className="text-white/90 font-bold text-sm">Pass</div>
                                                </div>
                                            </div>
                                            <div className="text-white/90 font-bold text-sm mt-2">{lang === 'el' ? '🏆 Όλα τα τουρνουά' : '🏆 All tournaments'}</div>
                                        </div>
                                    </div>
                                </div>
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
        </div>
    );
}

