'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { useParams, useRouter } from 'next/navigation';

export default function HowItWorksPage() {
    const params = useParams();
    const router = useRouter();
    const lang = params?.lang as 'en' | 'el' || 'el';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
            {/* Header */}
            <Header lang={lang} />

            {/* Hero */}
            <div className="py-12 sm:py-16 lg:py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
                        {lang === 'el' ? 'Πώς λειτουργεί το NetProphet' : 'How NetProphet Works'}
                    </h1>
                    <p className="text-lg sm:text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
                        {lang === 'el'
                            ? 'Αντικειμενικές αποδόσεις βασισμένες σε πραγματικά δεδομένα 1200+ παικτών'
                            : 'Objective odds based on real data from 1200+ players'}
                    </p>
                </div>
            </div>

            {/* Core Mechanics */}
            <section className="py-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* NTRP System */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                            <Card className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                                <CardHeader>
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <CardTitle className="text-lg text-center text-white">
                                        {lang === 'el' ? 'Σύστημα NTRP' : 'NTRP System'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-slate-200">
                                    <p className="mb-4">
                                        {lang === 'el'
                                            ? 'Κάθε παίκτης έχει NTRP rating (1.0-7.0) που ενημερώνεται μετά από κάθε αγώνα.'
                                            : 'Every player has an NTRP rating (1.0-7.0) that updates after each match.'}
                                    </p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Αυτόματη ενημέρωση βαθμολογίας' : 'Automatic rating updates'}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Ποιότητα αντιπάλου' : 'Opponent quality matters'}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Επιφάνεια & συνθήκες' : 'Surface & conditions'}</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Odds Algorithm */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                            <Card className="relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
                                <CardHeader>
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                        <span className="text-2xl">🎯</span>
                                    </div>
                                    <CardTitle className="text-lg text-center text-white">
                                        {lang === 'el' ? 'Αλγόριθμος Αποδόσεων' : 'Odds Algorithm'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-slate-200">
                                    <p className="mb-4">
                                        {lang === 'el'
                                            ? 'Οι αποδόσεις υπολογίζονται με βάση 10+ παράγοντες και ενημερώνονται real-time.'
                                            : 'Odds calculated based on 10+ factors and updated in real-time.'}
                                    </p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'NTRP rating difference' : 'NTRP rating difference'}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Head-to-head ιστορικό' : 'Head-to-head history'}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Πρόσφατη φόρμα & streaks' : 'Recent form & streaks'}</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Match Results */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                            <Card className="relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                                <CardHeader>
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                        <span className="text-2xl">🏆</span>
                                    </div>
                                    <CardTitle className="text-lg text-center text-white">
                                        {lang === 'el' ? 'Live Αποτελέσματα' : 'Live Results'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-slate-200">
                                    <p className="mb-4">
                                        {lang === 'el'
                                            ? 'Αποτελέσματα από πραγματικά τουρνουά ενημερώνονται καθημερινά.'
                                            : 'Results from real tournaments updated daily.'}
                                    </p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Αυτόματη επίλυση στοιχημάτων' : 'Automatic bet resolution'}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Άμεσα κέρδη' : 'Instant payouts'}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">✓</span>
                                            <span>{lang === 'el' ? 'Email ειδοποιήσεις' : 'Email notifications'}</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Player Database Section */}
            <section className="py-16 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-10 items-center">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-4">
                                {lang === 'el' ? '👥 1200+ Παίκτες με Πλήρη Δεδομένα' : '👥 1200+ Players with Complete Data'}
                            </h2>
                            <p className="text-base text-slate-300 mb-6">
                                {lang === 'el'
                                    ? 'Κάθε παίκτης στη βάση δεδομένων έχει λεπτομερή στατιστικά που χρησιμοποιούνται για τον υπολογισμό των αποδόσεων.'
                                    : 'Every player in our database has detailed statistics used to calculate odds.'}
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                    <span className="text-2xl">📈</span>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-0.5">{lang === 'el' ? 'Win/Loss Records' : 'Win/Loss Records'}</h4>
                                        <p className="text-xs text-slate-300">{lang === 'el' ? 'Πλήρες ιστορικό νικών και ηττών' : 'Complete history of wins and losses'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                    <span className="text-2xl">🎾</span>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-0.5">{lang === 'el' ? 'Surface Preferences' : 'Surface Preferences'}</h4>
                                        <p className="text-xs text-slate-300">{lang === 'el' ? 'Επιδόσεις σε Hard, Clay, Grass courts' : 'Performance on Hard, Clay, Grass courts'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                    <span className="text-2xl">⚔️</span>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-0.5">{lang === 'el' ? 'Head-to-Head' : 'Head-to-Head'}</h4>
                                        <p className="text-xs text-slate-300">{lang === 'el' ? 'Ιστορικό αναμετρήσεων μεταξύ παικτών' : 'Match history between players'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Player Card Example */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                            <div className="bg-white rounded-xl p-5 shadow-2xl">
                                <div className="text-center mb-5">
                                    <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-3xl">👤</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-1">Γιώργος Παπαδόπουλος</h4>
                                    <p className="text-xs text-slate-600">NTRP 4.5 • Clay Court Specialist</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-green-50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-green-600">15-5</div>
                                        <div className="text-xs text-slate-600">2024 Record</div>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-blue-600">75%</div>
                                        <div className="text-xs text-slate-600">Win Rate</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Clay Court Win Rate:</span>
                                        <span className="font-bold text-green-600">85%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Current Streak:</span>
                                        <span className="font-bold text-orange-600">5W 🔥</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">vs Opponent:</span>
                                        <span className="font-bold text-blue-600">4-1</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                                    <p className="text-xs text-slate-500">
                                        {lang === 'el' ? '✨ Αυτά τα δεδομένα καθορίζουν τις αποδόσεις' : '✨ This data determines the odds'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How Predictions Work */}
            <section className="py-16 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">
                            {lang === 'el' ? '🎮 Τύποι Προβλέψεων' : '🎮 Prediction Types'}
                        </h2>
                        <p className="text-base text-slate-300 max-w-3xl mx-auto">
                            {lang === 'el'
                                ? 'Όσο πιο συγκεκριμένη η πρόβλεψη, τόσο μεγαλύτερη η απόδοση'
                                : 'The more specific your prediction, the higher the payout'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Simple Predictions */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span>🎯</span> {lang === 'el' ? 'Βασικές Προβλέψεις' : 'Basic Predictions'}
                            </h3>
                            <div className="space-y-3">
                                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold">{lang === 'el' ? 'Νικητής Αγώνα' : 'Match Winner'}</span>
                                        <span className="text-sm text-blue-300">1.5x - 3.0x</span>
                                    </div>
                                    <p className="text-sm text-slate-300">{lang === 'el' ? 'Πρόβλεψε ποιος θα κερδίσει' : 'Predict who will win'}</p>
                                </div>
                                <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold">{lang === 'el' ? 'Τρόπος Νίκης' : 'How They Win'}</span>
                                        <span className="text-sm text-green-300">+0.5x</span>
                                    </div>
                                    <p className="text-sm text-slate-300">{lang === 'el' ? 'Straight sets ή 3 sets;' : 'Straight sets or 3 sets'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Predictions */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span>🔥</span> {lang === 'el' ? 'Προχωρημένες Προβλέψεις' : 'Advanced Predictions'}
                            </h3>
                            <div className="space-y-3">
                                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold">{lang === 'el' ? 'Exact Set Scores' : 'Exact Set Scores'}</span>
                                        <span className="text-sm text-purple-300">+1.0x - +2.0x</span>
                                    </div>
                                    <p className="text-sm text-slate-300">{lang === 'el' ? 'Π.χ. 6-4, 6-2' : 'E.g. 6-4, 6-2'}</p>
                                </div>
                                <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-400/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold">{lang === 'el' ? 'Tiebreak Scores' : 'Tiebreak Scores'}</span>
                                        <span className="text-sm text-orange-300">+1.5x - +3.0x</span>
                                    </div>
                                    <p className="text-sm text-slate-300">{lang === 'el' ? 'Π.χ. 7-6(5)' : 'E.g. 7-6(5)'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/30">
                        <h3 className="text-lg font-bold mb-3">
                            {lang === 'el' ? '💡 Συμβουλή Pro' : '💡 Pro Tip'}
                        </h3>
                        <p className="text-sm text-slate-200">
                            {lang === 'el'
                                ? 'Συνδυάζοντας πολλές προβλέψεις σε ένα parlay, μπορείς να πολλαπλασιάσεις τις αποδόσεις σου! Π.χ. 3 προβλέψεις x2.0 = 8.0x συνολική απόδοση!'
                                : 'Combining multiple predictions in a parlay can multiply your odds! E.g. 3 predictions x2.0 = 8.0x total payout!'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Leaderboard System */}
            <section className="py-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">
                            {lang === 'el' ? '🏆 Leaderboard & Ανταμοιβές' : '🏆 Leaderboard & Rewards'}
                        </h2>
                        <p className="text-base text-slate-300 max-w-3xl mx-auto">
                            {lang === 'el'
                                ? 'Ανταγωνίσου με άλλους χρήστες και κέρδισε ανταμοιβές'
                                : 'Compete with other users and earn rewards'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-5 border border-yellow-400/30">
                            <div className="text-5xl text-center mb-3">🥇</div>
                            <h3 className="text-lg font-bold text-center mb-2">{lang === 'el' ? 'Εβδομαδιαίο' : 'Weekly'}</h3>
                            <p className="text-center text-sm text-slate-300">
                                {lang === 'el'
                                    ? 'Κορυφαίοι της εβδομάδας κερδίζουν bonus νομίσματα'
                                    : 'Top weekly players earn bonus coins'}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-5 border border-purple-400/30">
                            <div className="text-5xl text-center mb-3">🏆</div>
                            <h3 className="text-lg font-bold text-center mb-2">{lang === 'el' ? 'All-Time' : 'All-Time'}</h3>
                            <p className="text-center text-sm text-slate-300">
                                {lang === 'el'
                                    ? 'Οι θρύλοι του NetProphet με τα περισσότερα κέρδη'
                                    : 'NetProphet legends with most winnings'}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-5 border border-blue-400/30">
                            <div className="text-5xl text-center mb-3">🔥</div>
                            <h3 className="text-lg font-bold text-center mb-2">{lang === 'el' ? 'Streaks' : 'Streaks'}</h3>
                            <p className="text-center text-sm text-slate-300">
                                {lang === 'el'
                                    ? 'Συνεχείς σωστές προβλέψεις = multipliers'
                                    : 'Consecutive correct picks = multipliers'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30">
                        <h3 className="text-lg font-bold mb-5 text-center">
                            {lang === 'el' ? '🎯 Πώς Υπολογίζονται οι Πόντοι' : '🎯 How Points are Calculated'}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-5">
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">✅</span>
                                    <div>
                                        <div className="text-sm font-semibold">{lang === 'el' ? 'Σωστή πρόβλεψη νικητή' : 'Correct winner prediction'}</div>
                                        <div className="text-xs text-slate-300">+100 πόντοι</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">🎯</span>
                                    <div>
                                        <div className="text-sm font-semibold">{lang === 'el' ? 'Σωστό score' : 'Correct score'}</div>
                                        <div className="text-xs text-slate-300">+50 bonus πόντοι</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">🔥</span>
                                    <div>
                                        <div className="text-sm font-semibold">{lang === 'el' ? 'Streak bonus' : 'Streak bonus'}</div>
                                        <div className="text-xs text-slate-300">x1.2 - x2.0</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">🐶</span>
                                    <div>
                                        <div className="text-sm font-semibold">{lang === 'el' ? 'Underdog bonus' : 'Underdog bonus'}</div>
                                        <div className="text-xs text-slate-300">+25% πόντοι</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">⚡</span>
                                    <div>
                                        <div className="text-sm font-semibold">{lang === 'el' ? 'Power-up multipliers' : 'Power-up multipliers'}</div>
                                        <div className="text-xs text-slate-300">έως +50%</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">📊</span>
                                    <div>
                                        <div className="text-sm font-semibold">{lang === 'el' ? 'Parlay combos' : 'Parlay combos'}</div>
                                        <div className="text-xs text-slate-300">Πολλαπλασιαστικά κέρδη</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                        {lang === 'el' ? 'Έτοιμος να ξεκινήσεις;' : 'Ready to start?'}
                    </h2>
                    <p className="text-base opacity-90 mb-6">
                        {lang === 'el'
                            ? 'Κάνε εγγραφή και πάρε 100 νομίσματα + Tournament Pass δωρεάν!'
                            : 'Sign up and get 100 coins + Tournament Pass free!'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-w-2xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                            <div className="text-2xl mb-1.5">🎾</div>
                            <div className="text-xs font-semibold">{lang === 'el' ? '1200+ Παίκτες' : '1200+ Players'}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                            <div className="text-2xl mb-1.5">🏆</div>
                            <div className="text-xs font-semibold">{lang === 'el' ? 'Live Τουρνουά' : 'Live Tournaments'}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                            <div className="text-2xl mb-1.5">⚡</div>
                            <div className="text-xs font-semibold">Power-ups</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                            <div className="text-2xl mb-1.5">🎁</div>
                            <div className="text-xs font-semibold">100 Coins</div>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push(`/${lang}/auth/signin`)}
                        size="lg"
                        className="text-base px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl font-bold"
                    >
                        {lang === 'el' ? 'Ξεκίνα Δωρεάν' : 'Start Free'}
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <Footer lang={lang} />
            <FooterDisclaimer lang={lang} />
        </div>
    );
}
