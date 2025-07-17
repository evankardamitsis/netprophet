'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@netprophet/lib';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Alert, AlertDescription } from '@netprophet/ui';

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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
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
                                    onClick={() => router.push('/how-it-works')}
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

            {/* Live Leaderboard Snippet */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center">
                        <Card className="max-w-md w-full border-0 shadow-lg">
                            <CardHeader className="relative">
                                <div className="flex justify-between items-center">
                                    <CardTitle>Live Leaderboard</CardTitle>
                                    <Badge variant="destructive">LIVE</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">@nikos</span>
                                        <span className="text-blue-600 font-bold">215 π</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">@maria</span>
                                        <span className="text-blue-600 font-bold">193 π</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">@giorgos</span>
                                        <span className="text-blue-600 font-bold">180 π</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Prediction Challenge Teaser */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 bg-muted p-4 rounded-xl max-w-2xl mx-auto">
                        <div className="flex-1">
                            <p className="text-lg font-medium">Τρέχει τώρα: Open Glyfada – 12 συμμετοχές</p>
                        </div>
                        <Button onClick={() => router.push('/dashboard')}>
                            Κάνε την πρόβλεψη σου
                        </Button>
                    </div>
                </div>
            </section>

            {/* Visual Split Section */}
            <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-green-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Δες πώς θα φαίνεται
                        </h2>
                        <p className="text-xl text-gray-600">
                            Εμπειρία που θα σε κάνει να θέλεις να ξεκινήσεις τώρα
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Predict UI */}
                        <div className="group">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                                <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">Roland Garros Final</h3>
                                            <p className="text-sm text-gray-500">French Open 2024</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                            <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="relative group/item">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 cursor-pointer">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">R</div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">Rafael Nadal</div>
                                                        <div className="text-sm text-gray-600">🇪🇸 Spain • 22 Grand Slams</div>
                                                    </div>
                                                </div>
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                                    Pick Winner
                                                </Button>
                                            </div>
                                            <div className="absolute inset-0 bg-blue-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                        </div>

                                        <div className="relative group/item">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 cursor-pointer">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold text-lg">N</div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">Novak Djokovic</div>
                                                        <div className="text-sm text-gray-600">🇷🇸 Serbia • 24 Grand Slams</div>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline">
                                                    Pick Winner
                                                </Button>
                                            </div>
                                            <div className="absolute inset-0 bg-gray-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-2xl">🎯</span>
                                            <span className="font-semibold text-green-800">High Stakes Match</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-green-600 text-lg">+250 π</div>
                                            <div className="text-sm text-green-600">Correct Pick</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center mt-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Κάνε την πρόβλεψή σου</h3>
                                <p className="text-gray-600">Επέλεξε τον νικητή και κέρδισε πόντους</p>
                            </div>
                        </div>

                        {/* Leaderboard UI */}
                        <div className="group">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                                <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900">Weekly Champions</h3>
                                            <p className="text-sm text-gray-500">Top performers this week</p>
                                        </div>
                                        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                                            This Week
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative group/item">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-200 hover:border-yellow-300 transition-all duration-300">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg">1</div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">@tennis_pro</div>
                                                        <div className="text-sm text-gray-600">🏆 7 correct picks</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-yellow-600 text-xl">1,250 π</div>
                                                    <div className="text-sm text-yellow-600">+180 today</div>
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-yellow-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                        </div>

                                        <div className="relative group/item">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full flex items-center justify-center text-white font-bold text-lg">2</div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">@maria_ace</div>
                                                        <div className="text-sm text-gray-600">🥈 6 correct picks</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-gray-600 text-xl">1,180 π</div>
                                                    <div className="text-sm text-gray-600">+120 today</div>
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-gray-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                        </div>

                                        <div className="relative group/item">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all duration-300">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg">3</div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">@greek_tennis</div>
                                                        <div className="text-sm text-gray-600">🥉 5 correct picks</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-orange-600 text-xl">1,120 π</div>
                                                    <div className="text-sm text-orange-600">+95 today</div>
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-orange-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                        </div>

                                        <div className="relative group/item">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-300">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">4</div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">@netprophet</div>
                                                        <div className="text-sm text-gray-600">4 correct picks</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-blue-600 text-xl">980 π</div>
                                                    <div className="text-sm text-blue-600">+75 today</div>
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-blue-500/10 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center justify-center space-x-2 text-purple-700">
                                            <span className="text-xl">🚀</span>
                                            <span className="font-semibold">You could be here!</span>
                                            <span className="text-xl">🚀</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center mt-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Ανέβα στο leaderboard</h3>
                                <p className="text-gray-600">Δείξε σε όλους ποιος είναι ο καλύτερος</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quote / Fun-Fact Box */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Alert>
                        <span className="text-2xl">💡</span>
                        <AlertDescription className="text-lg">
                            &quot;Μέσος όρος επιτυχίας προβλέψεων στους τελικούς: 38% — μπορείς καλύτερα;&quot;
                        </AlertDescription>
                    </Alert>
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
                                &quot;Είχα προβλέψει τελικό Open Vari από τον πρώτο γύρο — τώρα έχω streak 7!&quot;
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