'use client';

import { Button , Card, CardContent, CardDescription, CardHeader, CardTitle , Section , Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@netprophet/ui';

function MatchCardDemo({ players, ntrp, record }: { players: string[]; ntrp: string[]; record: string }) {
    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg">🎾 {players[0]} vs {players[1]}</CardTitle>
                <CardDescription>NTRP: {ntrp[0]} vs {ntrp[1]} | {record}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium">{players[0]}</span>
                        <span className="text-blue-600 font-bold">1.85</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{players[1]}</span>
                        <span className="text-gray-600 font-bold">2.10</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Breadcrumb */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <ul className="flex items-center space-x-2 text-sm text-gray-600">
                        <li>Αρχική</li>
                        <li>/</li>
                        <li className="text-gray-900 font-medium">Δες πώς λειτουργεί</li>
                    </ul>
                </div>
            </div>

            {/* Hero */}
            <div className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        Πώς λειτουργεί το NetProphet
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Μάθε πώς να κάνεις προβλέψεις, να κερδίζεις πόντους και να ανεβαίνεις στο leaderboard – Κέρδισε δώρα.
                    </p>
                </div>
            </div>

            {/* Επίλεξε αγώνα */}
            <Section title="🎾 Επίλεξε αγώνα" className="bg-gray-50">
                <div className="max-w-2xl mx-auto">
                    <MatchCardDemo
                        players={["Μαρίνος", "Γιώργος"]}
                        ntrp={["4.0", "3.5"]}
                        record="Μαρίνος: 4W‑1L"
                    />
                </div>
            </Section>

            {/* Κάνε τις προβλέψεις σου */}
            <Section title="📊 Κάνε τις προβλέψεις σου" className="bg-white">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>Checklist προβλέψεων</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <span className="text-green-500 text-xl">✅</span>
                                    <span>Επέλεξε τον νικητή</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-green-500 text-xl">✅</span>
                                    <span>Πρόβλεψε το score (π.χ. 6-4, 7-5)</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-green-500 text-xl">✅</span>
                                    <span>Επέλεξε αν θα είναι tie-break</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="bg-gray-200 rounded-2xl shadow-lg aspect-video flex items-center justify-center">
                        <span className="text-gray-500">📋 Prediction Slip Screenshot</span>
                    </div>
                </div>
            </Section>

            {/* Κέρδισε πόντους & streaks */}
            <Section title="🔥 Κέρδισε πόντους & streaks" className="bg-gray-50">
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-lg text-center">
                        <CardHeader>
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <CardTitle>Πρόβλεψη underdog</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-orange-600">+6π</p>
                            <p className="text-gray-600 mt-2">Επιπλέον πόντους για ρίσκο</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg text-center">
                        <CardHeader>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <CardTitle>Σωστό score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-green-600">+3π</p>
                            <p className="text-gray-600 mt-2">Ακριβής πρόβλεψη score</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg text-center">
                        <CardHeader>
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🔥</span>
                            </div>
                            <CardTitle>Σειρά 3 σωστών</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-purple-600">x1.2</p>
                            <p className="text-gray-600 mt-2">Bonus πολλαπλασιαστής</p>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* Ανέβα στο leaderboard */}
            <Section title="🏆 Ανέβα στο leaderboard" className="bg-white">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>Live Leaderboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead>Points</TableHead>
                                        <TableHead>Streak</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">@nikos</TableCell>
                                        <TableCell>215</TableCell>
                                        <TableCell>🔥 x4</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">@maria</TableCell>
                                        <TableCell>193</TableCell>
                                        <TableCell>🔥 x2</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">@giorgos</TableCell>
                                        <TableCell>180</TableCell>
                                        <TableCell>🔥 x1</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* Εξαργύρωσε πόντους */}
            <Section title="🛍️ Εξαργύρωσε πόντους" className="bg-gray-50">
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-lg text-center">
                        <CardHeader>
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🧢</span>
                            </div>
                            <CardTitle>NetProphet Cap</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-blue-600 mb-2">150 π</p>
                            <p className="text-gray-600">Premium quality cap</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg text-center">
                        <CardHeader>
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🎾</span>
                            </div>
                            <CardTitle>Tournament Entry</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600 mb-2">500 π</p>
                            <p className="text-gray-600">Free tournament entry</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg text-center">
                        <CardHeader>
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🏅</span>
                            </div>
                            <CardTitle>VIP Badge</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-purple-600 mb-2">1000 π</p>
                            <p className="text-gray-600">Exclusive VIP status</p>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* Final CTA */}
            <div className="py-20 bg-blue-600 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Έτοιμος να δοκιμάσεις;
                    </h2>
                    <p className="text-xl mb-8 opacity-90">
                        Ξεκίνα τώρα και δες πώς εύκολα μπορείς να γίνεις Net Prophet
                    </p>
                    <Button
                        size="lg"
                        variant="secondary"
                        className="text-lg px-8 py-4"
                        onClick={() => window.location.href = '/dashboard'}
                    >
                        Δοκίμασε τώρα έναν αγώνα
                    </Button>
                </div>
            </div>
        </div>
    );
} 