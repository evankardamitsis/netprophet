'use client';

import { Button } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import CoinIcon from '@/components/CoinIcon';
import { useParams, useRouter } from 'next/navigation';
import { buttons } from '@/styles/design-system';

export default function HowItWorksPageGame() {
    const params = useParams();
    const router = useRouter();
    const lang = params?.lang as 'en' | 'el' || 'el';

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
                            ? 'Διάλεξε αγώνες, κάνε προβλέψεις, μάζεψε coins και κυριάρχησε στο leaderboard!'
                            : 'Pick matches, make predictions, collect coins and dominate the leaderboard!'}
                    </p>
                </div>
            </section>

            {/* Core Mechanics - Game Style */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                            {lang === 'el' ? '⚙️ Μηχανισμοί Παιχνιδιού' : '⚙️ Game Mechanics'}
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* NTRP System */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-3xl">📊</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 text-center mb-3">
                                    {lang === 'el' ? 'Σύστημα δυναμικότητας NTRP' : 'NTRP Skill Level System'}
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

                        {/* Odds Algorithm */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-3xl">🎯</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 text-center mb-3">
                                    {lang === 'el' ? 'Αλγόριθμος Αποδόσεων' : 'Odds Algorithm'}
                                </h3>
                                <p className="text-gray-600 mb-4 text-center">
                                    {lang === 'el'
                                        ? 'Αποδόσεις από 10+ παράγοντες, ενημερωμένες real-time.'
                                        : 'Odds from 10+ factors, updated in real-time.'}
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">NTRP Rating Gap</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">Head-to-Head</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Φόρμα & Streaks' : 'Form & Streaks'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Match Results */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-rose-400 rounded-3xl opacity-75 group-hover:opacity-100 blur transition"></div>
                            <div className="relative bg-white rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-all">
                                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-3xl">🏆</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 text-center mb-3">
                                    {lang === 'el' ? 'Live Αποτελέσματα' : 'Live Results'}
                                </h3>
                                <p className="text-gray-600 mb-4 text-center">
                                    {lang === 'el'
                                        ? 'Αποτελέσματα από πραγματικά τουρνουά καθημερινά.'
                                        : 'Results from real tournaments daily.'}
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Όλα τα τουρνουά' : 'All tournaments'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Άμεσα κέρδη' : 'Instant payouts'}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600 text-lg">✓</span>
                                        <span className="text-gray-700 font-semibold">{lang === 'el' ? 'Live ειδοποιήσεις' : 'Live notifications'}</span>
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
                            {lang === 'el' ? '🎮 Τύποι Προβλέψεων' : '🎮 Prediction Types'}
                        </h2>
                        <p className="text-xl text-white/90 font-bold">
                            {lang === 'el'
                                ? 'Όσο πιο συγκεκριμένη η πρόβλεψη, τόσο μεγαλύτερα τα κέρδη!'
                                : 'The more specific your prediction, the bigger the winnings!'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                        {/* Basic Predictions */}
                        <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border-4 sm:border-8 border-white/50">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl px-6 py-4 mb-6 text-center">
                                <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                                    🎯 {lang === 'el' ? 'Βασικές' : 'Basic'}
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-white">{lang === 'el' ? 'Νικητής Αγώνα' : 'Match Winner'}</span>
                                        <span className="text-sm font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full">1.5x - 3.0x</span>
                                    </div>
                                    <p className="text-sm text-white/90 font-semibold">{lang === 'el' ? 'Πρόβλεψε ποιος θα κερδίσει' : 'Predict who will win'}</p>
                                </div>
                                <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-white">{lang === 'el' ? 'Τρόπος Νίκης' : 'How They Win'}</span>
                                        <span className="text-sm font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full">+0.5x</span>
                                    </div>
                                    <p className="text-sm text-white/90 font-semibold">{lang === 'el' ? 'Straight sets ή 3 sets' : 'Straight sets or 3 sets'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Predictions */}
                        <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border-4 sm:border-8 border-white/50">
                            <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl px-6 py-4 mb-6 text-center">
                                <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                                    🔥 {lang === 'el' ? 'Προχωρημένες' : 'Advanced'}
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-white">{lang === 'el' ? 'Exact Set Scores' : 'Exact Set Scores'}</span>
                                        <span className="text-sm font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full">+1.0x - +2.0x</span>
                                    </div>
                                    <p className="text-sm text-white/90 font-semibold">{lang === 'el' ? 'Π.χ. 6-4, 6-2' : 'E.g. 6-4, 6-2'}</p>
                                </div>
                                <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-4 shadow-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-white">{lang === 'el' ? 'Tiebreak Scores' : 'Tiebreak Scores'}</span>
                                        <span className="text-sm font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full">+1.5x - +3.0x</span>
                                    </div>
                                    <p className="text-sm text-white/90 font-semibold">{lang === 'el' ? 'Π.χ. 7-6(5)' : 'E.g. 7-6(5)'}</p>
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

            {/* Player Database */}
            <section className="py-12 sm:py-16 lg:py-20 relative">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="order-2 lg:order-1">
                            <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border-4 sm:border-8 border-white/50">
                                <div className="text-center">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                                        <span className="text-5xl">👤</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-900 mb-2">Γιώργος Παπαδόπουλος</h4>
                                    <p className="text-sm text-gray-600 font-bold mb-6">NTRP 4.5 • Clay Court Specialist</p>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-2xl p-4 text-center shadow-lg">
                                            <div className="text-3xl font-black text-white">15-5</div>
                                            <div className="text-xs font-bold text-white/90">2024 Record</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-4 text-center shadow-lg">
                                            <div className="text-3xl font-black text-white">75%</div>
                                            <div className="text-xs font-bold text-white/90">Win Rate</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                            <span className="text-sm text-gray-600 font-semibold">Clay Win Rate:</span>
                                            <span className="font-black text-green-600">85%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                            <span className="text-sm text-gray-600 font-semibold">Current Streak:</span>
                                            <span className="font-black text-orange-600 flex items-center gap-1">5W 🔥</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                            <span className="text-sm text-gray-600 font-semibold">vs Opponent:</span>
                                            <span className="font-black text-blue-600">4-1</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t-2 border-gray-200 text-center">
                                        <p className="text-xs text-gray-500 font-bold">
                                            {lang === 'el' ? '✨ Αυτά τα δεδομένα καθορίζουν τις αποδόσεις' : '✨ This data determines the odds'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2 space-y-6">
                            <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                                {lang === 'el' ? '👥 1200+ Παίκτες' : '👥 1200+ Players'}
                            </h2>
                            <p className="text-xl text-white/90 font-bold">
                                {lang === 'el'
                                    ? 'Κάθε παίκτης έχει λεπτομερή στατιστικά που χρησιμοποιούνται για ακριβείς αποδόσεις.'
                                    : 'Every player has detailed statistics used for accurate odds.'}
                            </p>
                            <div className="space-y-3">
                                {[
                                    { icon: '📈', text: lang === 'el' ? 'Win/Loss Records' : 'Win/Loss Records' },
                                    { icon: '🎾', text: lang === 'el' ? 'Surface Preferences' : 'Surface Preferences' },
                                    { icon: '⚔️', text: lang === 'el' ? 'Head-to-Head Stats' : 'Head-to-Head Stats' },
                                    { icon: '🔥', text: lang === 'el' ? 'Current Form' : 'Current Form' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-3 rounded-xl border-2 border-white/30">
                                        <span className="text-2xl">{item.icon}</span>
                                        <span className="text-white font-bold text-lg">{item.text}</span>
                                    </div>
                                ))}
                            </div>
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
                                ? 'Ανταγωνίσου και κέρδισε ανταμοιβές!'
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

                    {/* Points Calculation */}
                    <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border-4 sm:border-8 border-white/50">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl px-6 py-4 mb-6 text-center">
                            <h3 className="text-2xl font-black text-white">
                                {lang === 'el' ? '🎯 Υπολογισμός Πόντων' : '🎯 Points Calculation'}
                            </h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-green-50 p-4 rounded-xl">
                                    <span className="text-3xl">✅</span>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">{lang === 'el' ? 'Σωστός νικητής' : 'Correct winner'}</div>
                                        <div className="text-xs text-gray-600 font-bold">+100 πόντοι</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl">
                                    <span className="text-3xl">🎯</span>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">{lang === 'el' ? 'Σωστό score' : 'Correct score'}</div>
                                        <div className="text-xs text-gray-600 font-bold">+50 bonus</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-xl">
                                    <span className="text-3xl">🔥</span>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">Streak bonus</div>
                                        <div className="text-xs text-gray-600 font-bold">x1.2 - x2.0</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                                    <span className="text-3xl">🐶</span>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">Underdog bonus</div>
                                        <div className="text-xs text-gray-600 font-bold">+25% πόντοι</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-pink-50 p-4 rounded-xl">
                                    <span className="text-3xl">⚡</span>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">Power-up multipliers</div>
                                        <div className="text-xs text-gray-600 font-bold">{lang === 'el' ? 'έως +50%' : 'up to +50%'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl">
                                    <span className="text-3xl">📊</span>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">Parlay combos</div>
                                        <div className="text-xs text-gray-600 font-bold">{lang === 'el' ? 'Πολλαπλασιαστικά κέρδη' : 'Multiplied winnings'}</div>
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

                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                                    : 'New users receive free coins and tournament access. Start playing immediately!'}
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
                <Footer lang={lang} />
                <FooterDisclaimer lang={lang} />
            </div>
        </div>
    );
}

