'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Section, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@netprophet/ui';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FooterDisclaimer } from '@/components/FooterDisclaimer';
import { useParams } from 'next/navigation';

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
                        {lang === 'el' ? 'Πώς λειτουργεί το NetProphet' : 'How NetProphet Works'}
                    </h1>
                    <p className="text-lg sm:text-xl lg:text-2xl opacity-90 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                        {lang === 'el'
                            ? '4 απλά βήματα για να γίνεις Net Prophet!'
                            : '4 simple steps to become a Net Prophet!'
                        }
                    </p>
                </div>
            </div>

            {/* 4 Simple Steps */}
            <Section title={lang === 'el' ? '🎯 4 Απλά Βήματα' : '🎯 4 Simple Steps'} className="bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Step 1 */}
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🎾</span>
                                </div>
                                <CardTitle className="text-xl text-blue-900">
                                    {lang === 'el' ? '1. Διάλεξε αγώνες' : '1. Choose matches'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 text-sm">
                                    {lang === 'el'
                                        ? 'Επίλεξε από πραγματικούς, ερασιτεχνικούς αγώνες με πλήρη στατιστικά'
                                        : 'Choose from real, amateur matches with complete statistics'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        {/* Step 2 */}
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-green-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <CardTitle className="text-xl text-green-900">
                                    {lang === 'el' ? '2. Κάνε προβλέψεις' : '2. Make predictions'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-green-700 text-sm">
                                    {lang === 'el'
                                        ? 'Πρόβλεψε νικητή, score, tie-breaks και επιπλέον στατιστικά'
                                        : 'Predict winner, score, tie-breaks and additional statistics'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        {/* Step 3 */}
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">⚡</span>
                                </div>
                                <CardTitle className="text-xl text-purple-900">
                                    {lang === 'el' ? '3. Χρησιμοποίησε power-ups' : '3. Use power-ups'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-purple-700 text-sm">
                                    {lang === 'el'
                                        ? 'Αύξησε τις πιθανότητές σου με multipliers, insurance και bonus coins'
                                        : 'Increase your chances with multipliers, insurance and bonus coins'
                                    }
                                </p>
                            </CardContent>
                        </Card>

                        {/* Step 4 */}
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-50 to-orange-100">
                            <CardHeader>
                                <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <CardTitle className="text-xl text-orange-900">
                                    {lang === 'el' ? '4. Κέρδισε νομίσματα' : '4. Earn coins'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-orange-700 text-sm">
                                    {lang === 'el'
                                        ? 'Κέρδισε νομίσματα για σωστές προβλέψεις και ανέβα στο leaderboard'
                                        : 'Earn coins for correct predictions and climb the leaderboard'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Section>

            {/* Explore Player Database */}
            <Section title={lang === 'el' ? '🔍 Ανακαλύψτε τη Βάση Παικτών' : '🔍 Explore the Player Database'} className="bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                            {lang === 'el' ? '1200+ Παίκτες με Λεπτομερή Στατιστικά' : '1200+ Players with Detailed Statistics'}
                        </h3>
                        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                            {lang === 'el'
                                ? 'Κάθε παίκτης έχει πλήρη προφίλ με NTRP rating, win/loss record, head-to-head στατιστικά, και προτιμήσεις επιφάνειας. Δες πώς μπορείς να χρησιμοποιήσεις αυτά τα δεδομένα για καλύτερες προβλέψεις!'
                                : 'Every player has a complete profile with NTRP rating, win/loss record, head-to-head statistics, and surface preferences. See how you can use this data for better predictions!'
                            }
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        {/* Sample Player Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
                            <div className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">👤</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-2">Γιώργος Παπαδόπουλος</h4>
                                    <p className="text-sm text-slate-600">NTRP 4.5 • Clay Court Specialist</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-green-50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-green-600">12-3</div>
                                        <div className="text-xs text-slate-600">2024 Record</div>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-blue-600">80%</div>
                                        <div className="text-xs text-slate-600">Win Rate</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Head-to-Head vs Opponent:</span>
                                        <span className="font-semibold text-slate-900">4-1</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Preferred Surface:</span>
                                        <span className="font-semibold text-slate-900">Clay</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Current Streak:</span>
                                        <span className="font-semibold text-green-600">3W</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="text-center">
                                        <div className="text-sm text-slate-600 mb-2">
                                            {lang === 'el' ? 'Αυτά τα δεδομένα βοηθούν στην πρόβλεψη αποτελεσμάτων!' : 'This data helps predict outcomes!'}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => window.location.href = `/${lang}/matches`}
                                        >
                                            {lang === 'el' ? 'Δες Όλους τους Παίκτες' : 'View All Players'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tournament Results Preview */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8">
                            <div className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">🏆</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-2">Maroussi Tennis Open</h4>
                                    <p className="text-sm text-slate-600">Live Tournament Results</p>
                                </div>

                                <div className="space-y-3 mb-6">
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

                                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                                    <div className="text-center">
                                        <div className="text-sm font-semibold text-blue-900 mb-1">
                                            {lang === 'el' ? 'Ενημερώθηκε σήμερα' : 'Updated today'}
                                        </div>
                                        <div className="text-xs text-blue-700">
                                            {lang === 'el' ? 'Όλα τα αποτελέσματα ενημερώνονται καθημερινά' : 'All results updated daily'}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => window.location.href = `/${lang}/matches`}
                                    >
                                        {lang === 'el' ? 'Δες Όλα τα Τουρνουά' : 'View All Tournaments'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                            <h4 className="text-xl font-bold text-slate-900 mb-4">
                                {lang === 'el' ? '💡 Γιατί Αυτά τα Δεδομένα Είναι Σημαντικά;' : '💡 Why This Data Matters'}
                            </h4>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-xl">📊</span>
                                    </div>
                                    <h5 className="font-semibold text-slate-900 mb-2">
                                        {lang === 'el' ? 'Αντικειμενικές Αποδόσεις' : 'Objective Odds'}
                                    </h5>
                                    <p className="text-sm text-slate-600">
                                        {lang === 'el'
                                            ? 'Οι αποδόσεις υπολογίζονται με βάση πραγματικά στατιστικά'
                                            : 'Odds calculated based on real statistics'
                                        }
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-xl">🎯</span>
                                    </div>
                                    <h5 className="font-semibold text-slate-900 mb-2">
                                        {lang === 'el' ? 'Καλύτερες Προβλέψεις' : 'Better Predictions'}
                                    </h5>
                                    <p className="text-sm text-slate-600">
                                        {lang === 'el'
                                            ? 'Χρησιμοποίησε τα δεδομένα για πιο έξυπνες επιλογές'
                                            : 'Use data for smarter choices'
                                        }
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-xl">🏆</span>
                                    </div>
                                    <h5 className="font-semibold text-slate-900 mb-2">
                                        {lang === 'el' ? 'Competitive Edge' : 'Competitive Edge'}
                                    </h5>
                                    <p className="text-sm text-slate-600">
                                        {lang === 'el'
                                            ? 'Έχεις πλεονέκτημα έναντι άλλων χρηστών'
                                            : 'You have an advantage over other users'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Technical How It Works */}
            <Section title={lang === 'el' ? '🔬 Πώς Λειτουργεί το NetProphet' : '🔬 How NetProphet Works'} className="bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* NTRP System */}
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-900">
                                    <span className="text-2xl">📊</span>
                                    {lang === 'el' ? 'Σύστημα NTRP' : 'NTRP System'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 mb-4">
                                    {lang === 'el'
                                        ? 'Χρησιμοποιούμε μια τροποποιημένη έκδοση του επίσημου NTRP συστήματος για να κατατάξουμε τους παίκτες αντικειμενικά.'
                                        : 'We use a modified version of the official NTRP system to objectively rank players.'
                                    }
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-blue-700 text-sm">
                                            {lang === 'el' ? 'Αυτόματη ενημέρωση βαθμολογίας μετά από κάθε αγώνα' : 'Automatic rating updates after each match'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-blue-700 text-sm">
                                            {lang === 'el' ? 'Λαμβάνει υπόψη την ποιότητα του αντιπάλου' : 'Takes into account opponent quality'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-blue-700 text-sm">
                                            {lang === 'el' ? 'Επιφάνεια και συνθήκες αγώνα' : 'Surface and match conditions'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Odds Algorithm */}
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-900">
                                    <span className="text-2xl">🎯</span>
                                    {lang === 'el' ? 'Αλγόριθμος Αποδόσεων' : 'Odds Algorithm'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-green-700 mb-4">
                                    {lang === 'el'
                                        ? 'Οι αποδόσεις υπολογίζονται με βάση στατιστικά δεδομένα, head-to-head records, και τρέχουσες επιδόσεις.'
                                        : 'Odds are calculated based on statistical data, head-to-head records, and current performance.'
                                    }
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-green-700 text-sm">
                                            {lang === 'el' ? '100% αντικειμενικός υπολογισμός' : '100% objective calculation'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-green-700 text-sm">
                                            {lang === 'el' ? 'Συνεχής ενημέρωση με νέα δεδομένα' : 'Continuous updates with new data'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-green-700 text-sm">
                                            {lang === 'el' ? 'Δεν επηρεάζεται από συναισθήματα ή προτιμήσεις' : 'Not influenced by emotions or preferences'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Leaderboard System */}
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-900">
                                    <span className="text-2xl">🏆</span>
                                    {lang === 'el' ? 'Σύστημα Leaderboard' : 'Leaderboard System'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-purple-700 mb-4">
                                    {lang === 'el'
                                        ? 'Οι βαθμολογίες υπολογίζονται με βάση την ακρίβεια των προβλέψεων, streaks, και την ποιότητα των επιλογών.'
                                        : 'Scores are calculated based on prediction accuracy, streaks, and choice quality.'
                                    }
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-purple-700 text-sm">
                                            {lang === 'el' ? 'Bonus πόντους για underdog προβλέψεις' : 'Bonus points for underdog predictions'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-purple-700 text-sm">
                                            {lang === 'el' ? 'Streak multipliers για συνεχείς σωστές προβλέψεις' : 'Streak multipliers for consecutive correct predictions'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-purple-700 text-sm">
                                            {lang === 'el' ? 'Εβδομαδιαία και μηνιαία rankings' : 'Weekly and monthly rankings'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stakes System */}
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-900">
                                    <span className="text-2xl">💰</span>
                                    {lang === 'el' ? 'Σύστημα Stakes' : 'Stakes System'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-orange-700 mb-4">
                                    {lang === 'el'
                                        ? 'Κάθε πρόβλεψη έχει ελάχιστο και μέγιστο stake, με αυτόματη διαχείριση κινδύνου.'
                                        : 'Each prediction has minimum and maximum stake, with automatic risk management.'
                                    }
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-orange-700 text-sm">
                                            {lang === 'el' ? 'Προστασία από υπερβολικό ρίσκο' : 'Protection from excessive risk'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-orange-700 text-sm">
                                            {lang === 'el' ? 'Δυνατότητα parlay για μεγαλύτερα κέρδη' : 'Parlay option for bigger wins'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-xl">✓</span>
                                        <span className="text-orange-700 text-sm">
                                            {lang === 'el' ? 'Αυτόματη διαχείριση wallet' : 'Automatic wallet management'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Section>

            {/* Final CTA */}
            <div className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                        {lang === 'el' ? 'Έτοιμος να γίνεις Net Prophet;' : 'Ready to become a Net Prophet?'}
                    </h2>
                    <p className="text-lg sm:text-xl lg:text-2xl mb-6 sm:mb-8 opacity-90 leading-relaxed">
                        {lang === 'el'
                            ? 'Η πιο προηγμένη πλατφόρμα πρόβλεψης τένις με πραγματικούς παίκτες, τουρνουά, power-ups και συστήματα ανταμοιβών σε περιμένει!'
                            : 'The most advanced tennis prediction platform with real players, tournaments, power-ups and reward systems awaits you!'
                        }
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8 max-w-2xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl mb-1">🎾</div>
                            <div className="text-sm font-semibold">{lang === 'el' ? 'Πραγματικοί Αγώνες' : 'Real Matches'}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl mb-1">🏆</div>
                            <div className="text-sm font-semibold">{lang === 'el' ? 'Τουρνουά & Αποτελέσματα' : 'Tournaments & Results'}</div>
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
                            onClick={() => window.location.href = `/${lang}/matches`}
                        >
                            {lang === 'el' ? 'Ξεκίνα τώρα δωρεάν' : 'Start now for free'}
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