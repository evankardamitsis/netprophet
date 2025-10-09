'use client';

import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

interface FooterProps {
    lang: 'en' | 'el';
    dict?: {
        navigation?: {
            leaderboard?: string;
        };
    };
}

export default function Footer({ lang, dict }: FooterProps) {
    const router = useRouter();

    return (
        <footer className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white py-16 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-10 right-20 w-40 h-40 bg-pink-500 rounded-full opacity-12 blur-3xl"></div>
            <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-indigo-500 rounded-full opacity-10 blur-3xl"></div>

            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 mb-8">
                    {/* Brand - Takes 2 columns */}
                    <div className="md:col-span-2">
                        <div className="mb-4">
                            <Logo size="md" />
                        </div>
                        <p className="text-slate-300 mb-6 w-2/3 font-semibold">
                            {lang === 'el' ? 'Το πιο διασκεδαστικό παιχνίδι προβλέψεων με πραγματικούς ερασιτεχνικούς αγώνες και τουρνουά.' : 'The most exciting sports prediction game with real amateur matches and tournaments.'}
                        </p>
                        <Button
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            size="sm"
                            className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-purple-900 font-black rounded-xl shadow-lg transform hover:scale-105 transition-all"
                        >
                            {lang === 'el' ? '🎮 Ξεκίνα Δωρεάν' : '🎮 Start Free'}
                        </Button>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="font-black mb-4 text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {lang === 'el' ? '🎮 Πλατφόρμα' : '🎮 Platform'}
                        </h4>
                        <ul className="space-y-3 text-slate-300 text-sm font-semibold">
                            <li>
                                <a href={`/${lang}/matches`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>🎾</span> {lang === 'el' ? 'Αγώνες' : 'Matches'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/leaderboard`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>🏆</span> {dict?.navigation?.leaderboard || 'Leaderboard'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/players`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>👥</span> {lang === 'el' ? 'Παίκτες' : 'Players'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/results`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>📊</span> {lang === 'el' ? 'Αποτελέσματα' : 'Results'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/how-it-works`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>🎯</span> {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-black mb-4 text-lg bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                            💡 Support
                        </h4>
                        <ul className="space-y-3 text-slate-300 text-sm font-semibold">
                            <li>
                                <a href={`/${lang}/faq`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>❓</span> FAQ
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/contact`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>📧</span> {lang === 'el' ? 'Επικοινωνία' : 'Contact'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/help-center`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>🆘</span> {lang === 'el' ? 'Κέντρο Βοήθειας' : 'Help Center'}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal & Info */}
                    <div>
                        <h4 className="font-black mb-4 text-lg bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            {lang === 'el' ? '📋 Πληροφορίες' : '📋 Information'}
                        </h4>
                        <ul className="space-y-3 text-slate-300 text-sm font-semibold mb-6">
                            <li>
                                <a href={`/${lang}/terms`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>📜</span> {lang === 'el' ? 'Όροι Χρήσης' : 'Terms of Service'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/privacy`} className="hover:text-yellow-300 transition-colors flex items-center gap-2">
                                    <span>🔒</span> {lang === 'el' ? 'Πολιτική Απορρήτου' : 'Privacy Policy'}
                                </a>
                            </li>
                        </ul>
                        <div className="text-xs text-slate-400 font-semibold">
                            Powered by<br />
                            <a href="https://belowthefold.gr" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 font-bold">
                                Below The Fold
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
