'use client';

import { Button } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { PlayerCard } from '@/components/players/PlayerCard';
import CoinIcon from '@/components/CoinIcon';
import { useParams, useRouter } from 'next/navigation';
import { Player } from '@netprophet/lib';
import { buttons } from '@/styles/design-system';

export default function HowItWorksPageGame() {
    const params = useParams();
    const router = useRouter();
    const lang = params?.lang as 'en' | 'el' || 'el';

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

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            {/* Header */}
            <Header lang={lang} />

            {/* Hero */}
            <section className="py-12 sm:py-16 lg:py-20 relative overflow-hidden">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border-2 border-white/30 mb-6">
                        <span className="text-xl">💡</span>
                        <span className="text-white font-bold text-sm">
                            {lang === 'el' ? 'Οδηγός Παιχνιδιού' : 'Game Guide'}
                        </span>
                    </div>
                    <h1 className="text-5xl sm:text-6xl font-black text-white mb-6 drop-shadow-lg">
                        {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                    </h1>
                    <p className="text-2xl text-white/90 font-bold max-w-3xl mx-auto">
                        {lang === 'el'
                            ? 'Διάλεξε αγώνες, κάνε προβλέψεις, μάζεψε coins και κυριάρχησε στην κατάταξη!'
                            : 'Pick matches, make predictions, collect coins and dominate the leaderboard!'}
                    </p>
                </div>
            </section>

            {/* Core Mechanics - Game Style */}
            <section className="py-4 relative">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* NTRP System */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-3xl">📊</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 text-center mb-3">
                                    {lang === 'el' ? 'Βαθμολογία Δυναμικότητας (NTRP)' : 'Skill Level Rating (NTRP)'}
                                </h3>
                                <p className="text-gray-600 mb-4 text-center">
                                    {lang === 'el'
                                        ? 'Κάθε παίκτης έχει NTRP rating (1.0-7.0) δυναμικότητας που ενημερώνεται αυτόματα.'
                                        : 'Every player has an NTRP rating (1.0-7.0) skill level that updates automatically.'}
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Αυτόματη ενημέρωση' : 'Automatic updates'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Ιστορικό παιχνιδιών' : 'Match history'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Επιφάνεια γηπέδου' : 'Court surface'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Game Slips */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-3xl">📝</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 text-center mb-3">
                                    {lang === 'el' ? 'Πολλαπλοί αγώνες, ένα δελτίο ' : 'Multiple Matches, one slip'}
                                </h3>
                                <p className="text-gray-600 mb-4 text-center">
                                    {lang === 'el'
                                        ? 'Πρόσθεσε πολλούς αγώνες με όσες προβλέψεις θέλεις και κέρδισε περισσότερα!'
                                        : 'Add multiple matches with as many predictions as you want and win more!'}
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Πολλαπλοί αγώνες' : 'Multiple matches'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Συνδυαστικά κέρδη' : 'Combined winnings'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Πόντοι & Coins' : 'Points & Coins'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Leaderboard Points */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-rose-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-3xl">🏆</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 text-center mb-3">
                                    {lang === 'el' ? 'Πόντοι Κατάταξης' : 'Leaderboard Points'}
                                </h3>
                                <p className="text-gray-600 mb-4 text-center">
                                    {lang === 'el'
                                        ? 'Κερδίζεις πόντους για κάθε σωστή πρόβλεψη και ανεβαίνεις στην κατάταξη!'
                                        : 'Earn points for every correct prediction and climb the leaderboard!'}
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Σωστές προβλέψεις' : 'Correct predictions'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Σερί νικών' : 'Win streaks'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Δώρα για όλους' : 'Rewards for everyone'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Prediction Types */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                            {lang === 'el' ? 'Τύποι Προβλέψεων' : 'Prediction Types'}
                        </h2>
                        <p className="text-xl text-white/90 font-bold">
                            {lang === 'el'
                                ? 'Όσο πιο συγκεκριμένη η πρόβλεψη, τόσο περισσότερα τα νομίσματα!'
                                : 'The more specific your prediction, the more coins you win!'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                        {/* Basic Predictions */}
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                                    🎯 {lang === 'el' ? 'Βασικές' : 'Basic'}
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-gray-900">{lang === 'el' ? 'Νικητής Αγώνα' : 'Match Winner'}</span>
                                        <span className="text-sm font-bold text-gray-600 bg-gray-200 px-3 py-1 rounded-full">1.5x - 3.0x</span>
                                    </div>
                                    <p className="text-sm text-gray-600 font-semibold">{lang === 'el' ? 'Πρόβλεψε ποιος θα κερδίσει' : 'Predict who will win'}</p>
                                    <div className="mt-2 text-xs text-gray-500">
                                        <span className="font-bold">{lang === 'el' ? 'Παράδειγμα:' : 'Example:'}</span> {lang === 'el' ? 'Γιώργος Παπαδόπουλος νικά Νίκο Κωνσταντίνου' : 'George Papadopoulos beats Nikos Konstantinou'}
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-gray-900">{lang === 'el' ? 'Τρόπος Νίκης' : 'How They Win'}</span>
                                        <span className="text-sm font-bold text-gray-600 bg-gray-200 px-3 py-1 rounded-full">+0.5x</span>
                                    </div>
                                    <p className="text-sm text-gray-600 font-semibold">{lang === 'el' ? 'Straight sets ή 3 sets' : 'Straight sets or 3 sets'}</p>
                                    <div className="mt-2 text-xs text-gray-500">
                                        <span className="font-bold">{lang === 'el' ? 'Παράδειγμα:' : 'Example:'}</span> {lang === 'el' ? 'Νίκη σε 2 σετ (6-4, 6-2)' : 'Win in 2 sets (6-4, 6-2)'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Predictions */}
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                                    🔥 {lang === 'el' ? 'Προχωρημένες' : 'Advanced'}
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-gray-900">{lang === 'el' ? 'Exact Set Scores' : 'Exact Set Scores'}</span>
                                        <span className="text-sm font-bold text-gray-600 bg-gray-200 px-3 py-1 rounded-full">+1.0x - +2.0x</span>
                                    </div>
                                    <p className="text-sm text-gray-600 font-semibold">{lang === 'el' ? 'Π.χ. 6-4, 6-2' : 'E.g. 6-4, 6-2'}</p>
                                    <div className="mt-2 text-xs text-gray-500">
                                        <span className="font-bold">{lang === 'el' ? 'Παράδειγμα:' : 'Example:'}</span> {lang === 'el' ? '6-4, 6-2' : '6-4, 6-2'}
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-gray-900">{lang === 'el' ? 'Tiebreak Scores' : 'Tiebreak Scores'}</span>
                                        <span className="text-sm font-bold text-gray-600 bg-gray-200 px-3 py-1 rounded-full">+1.5x - +3.0x</span>
                                    </div>
                                    <p className="text-sm text-gray-600 font-semibold">{lang === 'el' ? 'Π.χ. 7-6(5)' : 'E.g. 7-6(5)'}</p>
                                    <div className="mt-2 text-xs text-gray-500">
                                        <span className="font-bold">{lang === 'el' ? 'Παράδειγμα:' : 'Example:'}</span> {lang === 'el' ? '7-6(5)' : '7-6(5)'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="mt-8 relative">
                        <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl opacity-60 blur-xl"></div>
                        <div className="relative bg-white rounded-3xl p-6 border-4 border-yellow-300 shadow-2xl">
                            <div className="text-center">
                                <div className="text-4xl mb-3">💡</div>
                                <h3 className="text-2xl font-black text-gray-900 mb-3">
                                    {lang === 'el' ? 'Συμβουλή Pro' : 'Pro Tip'}
                                </h3>
                                <p className="text-gray-700 font-bold">
                                    {lang === 'el'
                                        ? 'Συνδυάζοντας πολλές προβλέψεις σε ένα παρολί, μπορείς να πολλαπλασιάσεις τις αποδόσεις σου! Π.χ. 3 προβλέψεις x2.0 = 8.0x συνολική απόδοση!'
                                        : 'Combining multiple predictions in a parlay can multiply your odds! E.g. 3 predictions x2.0 = 8.0x total payout!'}
                                </p>
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
                                        <span>{lang === 'el' ? '1200+ Ερασιτέχνες Αθλητές Διαθέσιμοι!' : '1200+ Players Available!'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2 space-y-6">
                            <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                                {lang === 'el' ? '👥 1200+ Ερασιτέχνες Αθλητές' : '👥 1200+ Amateur Players'}
                            </h2>
                            <p className="text-xl text-white/90 font-bold">
                                {lang === 'el'
                                    ? 'Ερασιτέχνες αθλητές με πλήρη στατιστικά! Όλες οι πληροφορίες διαθέσιμες με το πάτημα ενός κουμπιού'
                                    : 'Amateur players with complete stats! All the info available with the click of a button. '
                                }
                            </p>
                            <ul className="space-y-4">
                                {[
                                    { icon: '📊', text: lang === 'el' ? 'Ενημερωμένα NTRP Ratings' : 'Updated NTRP Ratings' },
                                    { icon: '🎾', text: lang === 'el' ? 'Πλήρες Ιστορικό Αγώνων' : 'Complete Match History' },
                                    { icon: '⚔️', text: lang === 'el' ? 'Head-to-Head Στατιστικά' : 'Head-to-Head Stats' },
                                    { icon: '🔍', text: lang === 'el' ? 'Προηγμένη Αναζήτηση' : 'Advanced Search' }
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-4 text-white/90">
                                        <span className="text-2xl">{item.icon}</span>
                                        <span className="text-white font-semibold text-lg">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Leaderboard & Rewards */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                            {lang === 'el' ? '🏆 Leaderboard & Ανταμοιβές' : '🏆 Leaderboard & Rewards'}
                        </h2>
                        <p className="text-xl text-white/90 font-bold">
                            {lang === 'el'
                                ? 'Ανταγωνίσου και κέρδισε Νομίσματα και Ανταμοιβές!'
                                : 'Compete and earn rewards!'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-10">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl opacity-75 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl text-center">
                                <div className="text-6xl mb-3">🥇</div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">{lang === 'el' ? 'Εβδομαδιαίο' : 'Weekly'}</h3>
                                <p className="text-gray-600 font-semibold">
                                    {lang === 'el'
                                        ? 'Κορυφαίοι της εβδομάδας κερδίζουν bonus'
                                        : 'Top weekly players earn bonuses'}
                                </p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl opacity-75 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl text-center">
                                <div className="text-6xl mb-3">🏆</div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">All-Time</h3>
                                <p className="text-gray-600 font-semibold">
                                    {lang === 'el'
                                        ? 'Θρύλοι με τα περισσότερα κέρδη'
                                        : 'Legends with most winnings'}
                                </p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-3xl opacity-75 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl text-center">
                                <div className="text-6xl mb-3">🔥</div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Streaks</h3>
                                <p className="text-gray-600 font-semibold">
                                    {lang === 'el'
                                        ? 'Συνεχείς νίκες = multipliers'
                                        : 'Consecutive wins = multipliers'}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Μπόνους Εγγραφής - Game Reward Style */}
            <section className="py-12 sm:py-16 lg:py-20 relative" style={{
                background: 'linear-gradient(135deg, #1A0B2E 0%, #2D1B69 25%, #3A2A5C 50%, #4A3A6B 75%, #5A4A7B 100%)',
                boxShadow: 'inset 0 0 50px rgba(90, 74, 123, 0.15)'
            }}>
                {/* Decorative elements */}
                <div className="absolute top-10 left-10 w-64 h-64 bg-purple-400 rounded-full opacity-[0.2] blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-20 w-80 h-80 bg-pink-400 rounded-full opacity-[0.1] blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-indigo-400 rounded-full opacity-[0.1] blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="text-5xl">🎁</span>
                            <span className="text-3xl font-black text-white">Μπόνους Εγγραφής</span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 drop-shadow-lg">
                            {lang === 'el' ? 'Ξεκίνα με 100 Νομίσματα + Tournament Pass!' : 'Start with 100 Coins + Tournament Pass!'}
                        </h2>
                        <p className="text-xl text-white/90 font-bold mb-8 max-w-3xl mx-auto">
                            {lang === 'el'
                                ? 'Νέοι χρήστες λαμβάνουν δωρεάν νομίσματα και πρόσβαση σε τουρνουά. Εσύ τι περιμένεις;'
                                : 'New users receive free coins and tournament access. What are you waiting for?'
                            }
                        </p>

                        {/* Quick Stats */}
                        <div className="flex justify-center gap-8 mb-8">
                            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-white/30 transform hover:scale-105 transition-all">
                                <div className="flex items-center justify-center gap-2 text-4xl font-black text-white mb-2">
                                    100 <CoinIcon size={36} />
                                </div>
                                <div className="text-sm text-white/90 font-bold">Welcome Coins</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-white/30 transform hover:scale-105 transition-all">
                                <div className="text-5xl mb-2">🎟️</div>
                                <div className="text-sm text-white/90 font-bold">Tournament Pass</div>
                            </div>
                        </div>

                        {/* CTA */}
                        <Button
                            onClick={() => router.push(`/${lang}/auth/register`)}
                            size="lg"
                            style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                            className={`text-xl px-10 py-6 ${buttons.primary.className} shadow-2xl`}
                        >
                            {lang === 'el' ? 'Ξεκίνα Τώρα Δωρεάν!' : 'Start Now Free!'}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="bg-slate-900">
                <Footer lang={lang} />
                <FooterDisclaimer lang={lang} />
            </div>
        </div>
    );
}

