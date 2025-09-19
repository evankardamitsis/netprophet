'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Section, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { useParams } from 'next/navigation';

function MatchCardDemo({ players, ntrp, record, tournament, format }: {
    players: string[];
    ntrp: string[];
    record: string;
    tournament: string;
    format: string;
}) {
    return (
        <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-black font-bold">
                    <span className="text-2xl">🎾</span>
                    {players[0]} vs {players[1]}
                </CardTitle>
                <CardDescription className="flex flex-col gap-1">
                    <span className="text-sm text-slate-700">NTRP: {ntrp[0]} vs {ntrp[1]} | {record}</span>
                    <span className="text-sm text-slate-600">{tournament} • {format}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <span className="font-semibold text-black">{players[0]}</span>
                        <span className="text-blue-700 font-bold text-lg">1.85</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                        <span className="font-semibold text-black">{players[1]}</span>
                        <span className="text-slate-700 font-bold text-lg">2.10</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function HowItWorksPage() {
    const params = useParams();
    const lang = params?.lang as 'en' | 'el' || 'el';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100">
            {/* Header */}
            <Header lang={lang} />

            {/* Breadcrumb */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <ul className="flex items-center space-x-2 text-sm text-slate-600">
                        <li>{lang === 'el' ? 'Αρχική' : 'Home'}</li>
                        <li>/</li>
                        <li className="text-slate-900 font-medium">{lang === 'el' ? 'Δες πώς λειτουργεί' : 'How it works'}</li>
                    </ul>
                </div>
            </div>

            {/* Hero */}
            <div className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
                        Πώς λειτουργεί το NetProphet
                    </h1>
                    <p className="text-lg sm:text-xl lg:text-2xl opacity-90 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                        Η πιο προηγμένη πλατφόρμα πρόβλεψης αγώνων τένις με πραγματικούς παίκτες, τουρνουά, power-ups και συστήματα ανταμοιβών.
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 max-w-2xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🎾</div>
                            <div className="text-xs sm:text-sm font-semibold">Πραγματικοί Αγώνες</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
                            <div className="text-xs sm:text-sm font-semibold">Τουρνουά & Αποτελέσματα</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚡</div>
                            <div className="text-xs sm:text-sm font-semibold">Power-ups</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                            <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🎁</div>
                            <div className="text-xs sm:text-sm font-semibold">Δώρα & Ανταμοιβές</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Επίλεξε αγώνα */}
            <Section title="🎾 Επίλεξε αγώνα" className="bg-white">
                <div className="max-w-2xl mx-auto">
                    <p className="text-center text-slate-700 mb-8">
                        Επίλεξε από πραγματικούς, ερασιτεχνικούς αγώνες
                    </p>
                    <MatchCardDemo
                        players={["Γιώργος Παπαδόπουλος", "Νίκος Κωνσταντίνου"]}
                        ntrp={["4.0", "3.5"]}
                        record="Γιώργος: 4W‑1L"
                        tournament="Maroussi Tennis Open"
                        format="Best of 3"
                    />
                </div>
            </Section>

            {/* Κάνε τις προβλέψεις σου */}
            <Section title="📊 Κάνε τις προβλέψεις σου" className="bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <Card className="border-0 shadow-lg bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-900">
                                <span className="text-2xl">🎯</span>
                                Checklist προβλέψεων
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="text-green-600 text-xl">✅</span>
                                    <span className="font-medium text-slate-900">Επίλεξε τον νικητή</span>
                                </div>
                                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <span className="text-blue-600 text-xl">✅</span>
                                    <span className="font-medium text-slate-900">Πρόβλεψε το score (π.χ. 6-4, 7-5)</span>
                                </div>
                                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <span className="text-purple-600 text-xl">✅</span>
                                    <span className="font-medium text-slate-900">Επίλεξε αν θα είναι tie-break</span>
                                </div>
                                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <span className="text-orange-600 text-xl">✅</span>
                                    <span className="font-medium text-slate-900">Πρόβλεψε επιπλέον στατιστικά</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-6">
                        <div className="text-center mb-4">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-2xl">📋</span>
                                <h3 className="text-lg font-bold text-white">Prediction Slip</h3>
                            </div>
                            <p className="text-slate-300 text-sm">Διαχείριση προβλέψεων με ρεαλιστικές αποδόσεις</p>
                        </div>

                        {/* Sample Prediction 1 */}
                        <div className="bg-slate-700 border border-slate-600 rounded-xl p-4 mb-3">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-yellow-200">
                                        Γιώργος Παπαδόπουλος vs Νίκος Κωνσταντίνου
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">Maroussi Tennis Open</div>
                                </div>
                                <button className="text-slate-500 hover:text-red-400 ml-2">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs">
                                    <span className="text-slate-300">Pick: </span>
                                    <span className="font-semibold text-yellow-200">Γιώργος Παπαδόπουλος</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-slate-300">Stake:</span>
                                    <input
                                        type="number"
                                        value="50"
                                        readOnly
                                        className="w-16 px-1.5 py-0.5 text-xs bg-slate-600 border border-slate-500 rounded text-green-400 font-semibold"
                                    />
                                    <span className="text-xs text-slate-400">🌕</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400">Odds</div>
                                        <div className="text-xs font-bold text-purple-400">1.85x</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400">Win</div>
                                        <div className="text-xs font-bold text-green-400">92.5 🌕</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sample Prediction 2 */}
                        <div className="bg-slate-700 border border-slate-600 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-yellow-200">
                                        Μαρία Κωνσταντίνου vs Ελένη Δημητρίου
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">Athens Tennis Club</div>
                                </div>
                                <button className="text-slate-500 hover:text-red-400 ml-2">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs">
                                    <span className="text-slate-300">Pick: </span>
                                    <span className="font-semibold text-yellow-200">Score: 6-4, 7-5</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-slate-300">Stake:</span>
                                    <input
                                        type="number"
                                        value="30"
                                        readOnly
                                        className="w-16 px-1.5 py-0.5 text-xs bg-slate-600 border border-slate-500 rounded text-green-400 font-semibold"
                                    />
                                    <span className="text-xs text-slate-400">🌕</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400">Odds</div>
                                        <div className="text-xs font-bold text-purple-400">3.20x</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400">Win</div>
                                        <div className="text-xs font-bold text-green-400">96 🌕</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parlay Mode Toggle */}
                        <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-3 border border-purple-500 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">⚡</span>
                                    <div>
                                        <span className="text-white font-bold text-sm">🎯 Parlay Mode</span>
                                        <div className="text-white/80 text-xs">
                                            2 predictions ready for parlay!
                                        </div>
                                    </div>
                                </div>
                                <button className="relative inline-flex h-8 w-14 items-center rounded-full bg-white shadow-lg">
                                    <span className="inline-block h-6 w-6 transform rounded-full translate-x-7 bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg" />
                                </button>
                            </div>
                            <div className="text-white/90 text-xs font-medium">
                                💎 Parlay Benefits: Higher rewards, bonus multipliers, and streak boosters!
                            </div>
                        </div>

                        {/* Total Summary */}
                        <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300">Total Stake:</span>
                                <span className="text-white font-bold">80 🌕</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-slate-300">Potential Win:</span>
                                <span className="text-green-400 font-bold">188.5 🌕</span>
                            </div>
                            <button className="w-full mt-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Place Bet
                            </button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Players & Tournament Results */}
            <Section title="👥 Πραγματικοί Παίκτες & Αποτελέσματα" className="bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Στατιστικά Παικτών</h3>
                        <p className="text-slate-700 mb-8">
                            Κάθε παίκτης έχει πλήρη στατιστικά: νίκες/ήττες, NTRP rating, head-to-head records,
                            και ιστορικό αποτελεσμάτων. Οι αποδόσεις υπολογίζονται με βάση πραγματικά δεδομένα.
                        </p>

                        <div className="space-y-4">
                            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-blue-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-900">Γιώργος Παπαδόπουλος</h4>
                                            <p className="text-sm text-slate-600">NTRP 4.0 • 12W-3L</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-600">1.85</div>
                                            <div className="text-sm text-slate-500">Odds</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">80%</div>
                                            <div className="text-xs text-slate-600">Win Rate</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">4-1</div>
                                            <div className="text-xs text-slate-600">vs Opponent</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">6.2</div>
                                            <div className="text-xs text-slate-600">Avg Games</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Αποτελέσματα Τουρνουά</h3>
                        <p className="text-slate-700 mb-8">
                            Δες πλήρη αποτελέσματα από όλα τα τουρνουά, με live updates και
                            ιστορικό αγώνων. Κάθε αγώνας καταγράφεται με ακρίβεια.
                        </p>

                        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-900">
                                    <span className="text-2xl">🏆</span>
                                    Maroussi Tennis Open - Αποτελέσματα
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div>
                                            <div className="font-semibold text-slate-900">Γιώργος Παπαδόπουλος</div>
                                            <div className="text-sm text-slate-600">6-4, 6-2</div>
                                        </div>
                                        <div className="text-green-600 font-bold">W</div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div>
                                            <div className="font-semibold text-slate-900">Νίκος Κωνσταντίνου</div>
                                            <div className="text-sm text-slate-600">4-6, 2-6</div>
                                        </div>
                                        <div className="text-red-600 font-bold">L</div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold">Τουρνουά:</span> Maroussi Tennis Open<br />
                                        <span className="font-semibold">Ημερομηνία:</span> 15 Σεπτεμβρίου 2025<br />
                                        <span className="font-semibold">Μορφή:</span> Best of 3
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Section>

            {/* Power-ups & Advanced Features */}
            <Section title="⚡ Power-ups & Προηγμένες Λειτουργίες" className="bg-gradient-to-br from-purple-50 via-white to-indigo-50">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Power-ups Συστήματος</h3>
                        <p className="text-slate-700 mb-8">
                            Χρησιμοποίησε power-ups για να αυξήσεις τις πιθανότητές σου και να κερδίσεις περισσότερα νομίσματα.
                            Κάθε power-up έχει μοναδικές ικανότητες!
                        </p>

                        <div className="space-y-4">
                            <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-purple-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                                            <span className="text-2xl">🎯</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900">Streak Multiplier</h4>
                                            <p className="text-sm text-slate-600">Αυξάνει τα κέρδη σου κατά 20%</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-purple-600">x1.2</div>
                                            <div className="text-xs text-slate-500">Multiplier</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-blue-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                                            <span className="text-2xl">🛡️</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900">Insurance</h4>
                                            <p className="text-sm text-slate-600">Προστατεύει από απώλειες</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-blue-600">50%</div>
                                            <div className="text-xs text-slate-500">Protection</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-green-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                                            <span className="text-2xl">🎁</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900">Bonus Coins</h4>
                                            <p className="text-sm text-slate-600">Επιπλέον νομίσματα για σωστές προβλέψεις</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-600">+5</div>
                                            <div className="text-xs text-slate-500">Coins</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Welcome Bonus & Tournament Pass</h3>
                        <p className="text-slate-700 mb-8">
                            Νέοι χρήστες λαμβάνουν ευκαιρίες για δωρεάν νομίσματα και πρόσβαση σε τουρνουά!
                        </p>

                        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-orange-100">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-900">
                                    <span className="text-2xl">🎁</span>
                                    Welcome Bonus
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🌕</span>
                                            <div>
                                                <div className="font-semibold text-slate-900">100 Welcome Coins</div>
                                                <div className="text-sm text-slate-600">Δωρεάν νομίσματα για να ξεκινήσεις</div>
                                            </div>
                                        </div>
                                        <div className="text-yellow-600 font-bold">100 🌕</div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🎫</span>
                                            <div>
                                                <div className="font-semibold text-slate-900">Tournament Pass</div>
                                                <div className="text-sm text-slate-600">Δωρεάν πρόσβαση σε ένα τουρνουά</div>
                                            </div>
                                        </div>
                                        <div className="text-purple-600 font-bold">Free</div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-yellow-200">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold">Πώς λειτουργεί:</span><br />
                                        • Κάνε εγγραφή και κέρδισε 100 νομίσματα<br />
                                        • Λάβε δωρεάν tournament pass<br />
                                        • Χρησιμοποίησε το pass για να συμμετάσχεις σε οποιοδήποτε τουρνουά
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Section>

            {/* Κέρδισε πόντους & streaks */}
            <Section title="🔥 Κέρδισε πόντους & streaks" className="bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-orange-50 to-orange-100">
                        <CardHeader>
                            <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <CardTitle className="text-orange-900 font-bold">Πρόβλεψη underdog</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-orange-800">+6 🌕</p>
                            <p className="text-orange-700 mt-2">Επιπλέον νομίσματα για ρίσκο</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-green-50 to-green-100">
                        <CardHeader>
                            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <CardTitle className="text-green-900 font-bold">Σωστό score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-green-800">+3 🌕</p>
                            <p className="text-green-700 mt-2">Ακριβής πρόβλεψη score</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardHeader>
                            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🔥</span>
                            </div>
                            <CardTitle className="text-purple-900 font-bold">Σειρά 3 σωστών</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-purple-800">x1.2</p>
                            <p className="text-purple-700 mt-2">Bonus πολλαπλασιαστής</p>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* Ανέβα στο leaderboard */}
            <Section title="🏆 Ανέβα στο leaderboard" className="bg-gradient-to-br from-yellow-50 via-white to-orange-50">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-0 shadow-lg bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-900">
                                <span className="text-2xl">📊</span>
                                Live Leaderboard
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100">
                                        <TableHead className="text-slate-800 font-semibold">Player</TableHead>
                                        <TableHead className="text-slate-800 font-semibold">Points</TableHead>
                                        <TableHead className="text-slate-800 font-semibold">Streak</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-gradient-to-r from-yellow-50 to-yellow-100">
                                        <TableCell className="font-medium text-slate-900">@nikos</TableCell>
                                        <TableCell className="text-slate-900 font-bold">215 🌕</TableCell>
                                        <TableCell className="text-slate-900">🔥 x4</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <TableCell className="font-medium text-slate-900">@maria</TableCell>
                                        <TableCell className="text-slate-900 font-bold">193 🌕</TableCell>
                                        <TableCell className="text-slate-900">🔥 x2</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-gradient-to-r from-orange-50 to-orange-100">
                                        <TableCell className="font-medium text-slate-900">@giorgos</TableCell>
                                        <TableCell className="text-slate-900 font-bold">180 🌕</TableCell>
                                        <TableCell className="text-slate-900">🔥 x1</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* Tournament System & Rewards */}
            <Section title="🏆 Σύστημα Τουρνουά & Ανταμοιβές" className="bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Δωρεάν & Πληρωμένα Τουρνουά</h3>
                        <p className="text-slate-700 mb-8">
                            Συμμετέχει σε τουρνουά με διαφορετικά επίπεδα πρόσβασης.
                            Δωρεάν τουρνουά για όλους, πληρωμένα για περισσότερες ευκαιρίες!
                        </p>

                        <div className="space-y-4">
                            <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-green-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🆓</span>
                                            <div>
                                                <h4 className="font-bold text-slate-900">Δωρεάν Τουρνουά</h4>
                                                <p className="text-sm text-slate-600">Πρόσβαση για όλους</p>
                                            </div>
                                        </div>
                                        <div className="text-green-600 font-bold">0 🌕</div>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        • Πλήρη πρόσβαση σε όλες τις προβλέψεις<br />
                                        • Συμμετοχή στο leaderboard<br />
                                        • Κέρδος νομισμάτων
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-purple-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">💎</span>
                                            <div>
                                                <h4 className="font-bold text-slate-900">Premium Τουρνουά</h4>
                                                <p className="text-sm text-slate-600">Εξαιρετικές ευκαιρίες</p>
                                            </div>
                                        </div>
                                        <div className="text-purple-600 font-bold">500-1000 🌕</div>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        • Υψηλότερες αποδόσεις<br />
                                        • Εξαιρετικά τουρνουά<br />
                                        • Εξclusive rewards
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Ανταμοιβές & Δώρα</h3>
                        <p className="text-slate-700 mb-8">
                            Εξαργύρωσε τα νομίσματά σου σε πραγματικά δώρα και εμπειρίες!
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-blue-50 to-blue-100">
                                <CardHeader className="pb-2">
                                    <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-xl">🧢</span>
                                    </div>
                                    <CardTitle className="text-blue-900 font-bold text-sm">NetProphet Cap</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-lg font-bold text-blue-800 mb-1">150 🌕</p>
                                    <p className="text-blue-700 text-xs">Premium quality</p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-green-50 to-green-100">
                                <CardHeader className="pb-2">
                                    <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-xl">🎾</span>
                                    </div>
                                    <CardTitle className="text-green-900 font-bold text-sm">Tennis Balls</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-lg font-bold text-green-800 mb-1">200 🌕</p>
                                    <p className="text-green-700 text-xs">Professional grade</p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-purple-50 to-purple-100">
                                <CardHeader className="pb-2">
                                    <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-xl">🏅</span>
                                    </div>
                                    <CardTitle className="text-purple-900 font-bold text-sm">VIP Badge</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-lg font-bold text-purple-800 mb-1">1000 🌕</p>
                                    <p className="text-purple-700 text-xs">Exclusive status</p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg text-center bg-gradient-to-br from-orange-50 to-orange-100">
                                <CardHeader className="pb-2">
                                    <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-xl">🎫</span>
                                    </div>
                                    <CardTitle className="text-orange-900 font-bold text-sm">Tournament Pass</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-lg font-bold text-orange-800 mb-1">500 🌕</p>
                                    <p className="text-orange-700 text-xs">Free entry</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Final CTA */}
            <div className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                        Έτοιμος να γίνεις Net Prophet;
                    </h2>
                    <p className="text-lg sm:text-xl lg:text-2xl mb-6 sm:mb-8 opacity-90 leading-relaxed">
                        Η πιο προηγμένη πλατφόρμα πρόβλεψης τένις με πραγματικούς παίκτες,
                        τουρνουά, power-ups και συστήματα ανταμοιβών σε περιμένει!
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8 max-w-2xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl mb-1">🎾</div>
                            <div className="text-sm font-semibold">Πραγματικοί Αγώνες</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl mb-1">🏆</div>
                            <div className="text-sm font-semibold">Τουρνουά & Αποτελέσματα</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl mb-1">⚡</div>
                            <div className="text-sm font-semibold">Power-ups</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl mb-1">🎁</div>
                            <div className="text-sm font-semibold">100 Coins + Pass</div>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <Button
                            size="lg"
                            variant="secondary"
                            className="text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 hover:bg-slate-100 font-medium"
                            onClick={() => window.location.href = '/matches'}
                        >
                            Ξεκίνα τώρα δωρεάν
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer lang={lang} />

            {/* Footer Disclaimer */}
            <FooterDisclaimer lang={lang} />
        </div >
    );
} 