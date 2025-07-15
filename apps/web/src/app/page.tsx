'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@netprophet/ui';

export default function HomePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            console.log('🔍 Checking authentication status on home page...');

            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                console.log('✅ User is authenticated, redirecting to dashboard');
                router.push('/dashboard');
                return;
            }

            console.log('❌ No session found, staying on home page');
            setLoading(false);
        };

        checkAuth();
    }, [router]);

    if (loading) {
        console.log('⏳ Home page showing loading state');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
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
                                Γίνε ο επόμενος{' '}
                                <span className="text-blue-600">Net Prophet</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                                Προέβλεψε. Κέρδισε πόντους. Σκαρφάλωσε στο leaderboard.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button
                                    onClick={() => router.push('/auth/signin')}
                                    size="lg"
                                    className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700"
                                >
                                    Ξεκίνα τώρα
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="text-lg px-8 py-4"
                                >
                                    Δες πώς λειτουργεί
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
                            Απλό, σαν να σερβίρεις πρώτο game
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Μόλις 4 βήματα για να γίνεις Net Prophet
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🎾</span>
                                </div>
                                <CardTitle className="text-xl">Διάλεξε αγώνες</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    Επέλεξε από τα καλύτερα τουρνουά και αγώνες
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <CardTitle className="text-xl">Κάνε τις προβλέψεις σου</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    Βάλε τις γνώσεις σου στο τένις σε δοκιμή
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🔥</span>
                                </div>
                                <CardTitle className="text-xl">Μάζεψε πόντους</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    Κέρδισε πόντους για κάθε σωστή πρόβλεψη
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <CardTitle className="text-xl">Ανέβα στο leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">
                                    Δείξε σε όλους ποιος είναι ο καλύτερος Net Prophet
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Why join Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Γιατί να μπεις στο παιχνίδι
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="flex items-start space-x-4">
                            <span className="text-2xl text-green-500 mt-1">✅</span>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Δοκίμασε τις γνώσεις σου</h3>
                                <p className="text-gray-600">
                                    Θες να δοκιμάσεις τις γνώσεις σου στο τένις
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <span className="text-2xl text-green-500 mt-1">✅</span>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Prediction games</h3>
                                <p className="text-gray-600">
                                    Γουστάρεις prediction games
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <span className="text-2xl text-green-500 mt-1">✅</span>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Βρες τον εαυτό σου στην κορυφή</h3>
                                <p className="text-gray-600">
                                    Σου αρέσει να βλέπεις τον εαυτό σου στην κορυφή
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rewards Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Κέρδισε περισσότερα
                        </h2>
                        <p className="text-xl text-gray-600">
                            Απολαύστε τα οφέλη του NetProphet
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📈</span>
                                </div>
                                <CardTitle>Πόντοι & levels</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-gray-600">
                                    Ανέβα level και ξεκλείδωσε νέα δυνατότητες
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="text-center">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">⚡</span>
                                </div>
                                <CardTitle>Prediction streaks</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-gray-600">
                                    Δημιούργησε streaks για επιπλέον πόντους
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🏅</span>
                                </div>
                                <CardTitle>Ανταμοιβές & δώρα</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-gray-600">
                                    Κέρδισε ανταμοιβές για τις επιτυχίες σου
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">⭐</span>
                                </div>
                                <CardTitle>Τιμητικοί τίτλοι</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-gray-600">
                                    Γίνε Net Prophet of the Month
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* For Clubs Section */}
            <section className="py-20 bg-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Είσαι ακαδημία ή διοργανωτής τουρνουά;
                    </h2>
                    <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto">
                        Community engagement, προβολή παικτών, επικοινωνία
                    </p>
                    <Button
                        variant="secondary"
                        size="lg"
                        className="text-lg px-8 py-4"
                    >
                        Επικοινώνησε μαζί μας
                    </Button>
                </div>
            </section>

            {/* Testimonial Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-green-50">
                        <CardContent className="p-12 text-center">
                            <div className="text-4xl mb-6">💬</div>
                            <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-6 italic">
                                "Είχα προβλέψει τελικό Open Vari από τον πρώτο γύρο — τώρα έχω streak 7!"
                            </blockquote>
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold">ΜΚ</span>
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Μάριος Κωνσταντίνου</div>
                                    <div className="text-sm text-gray-600">Net Prophet Level 5</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">NetProphet</h3>
                            <p className="text-gray-400">
                                Η πλατφόρμα prediction για το τένις
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Community</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>Leaderboard</li>
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
                                    onClick={() => router.push('/auth/signin')}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Γίνε μέρος του community
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