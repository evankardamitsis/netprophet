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
        <footer className="bg-slate-900 text-white py-16">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 mb-8">
                    {/* Brand - Takes 2 columns */}
                    <div className="md:col-span-2">
                        <div className="mb-4">
                            <Logo size="md" />
                        </div>
                        <p className="text-slate-400 mb-6 w-2/3">
                            {lang === 'el' ? 'Το πιο διασκεδαστικό παιχνίδι προβλέψεων με πραγματικούς ερασιτεχνικούς αγώνες και τουρνουά.' : 'The most exciting sports prediction game with real amateur matches and tournaments.'}
                        </p>
                        <Button
                            onClick={() => router.push(`/${lang}/auth/signin`)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                            {lang === 'el' ? 'Ξεκίνα Δωρεάν' : 'Start Free'}
                        </Button>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="font-semibold mb-4">{lang === 'el' ? 'Πλατφόρμα' : 'Platform'}</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li>
                                <a href={`/${lang}/matches`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Αγώνες' : 'Matches'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/leaderboard`} className="hover:text-white transition-colors">
                                    {dict?.navigation?.leaderboard || 'Leaderboard'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/players`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Παίκτες' : 'Players'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/results`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Αποτελέσματα' : 'Results'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/how-it-works`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li>
                                <a href={`/${lang}/faq`} className="hover:text-white transition-colors">
                                    FAQ
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/contact`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Επικοινωνία' : 'Contact'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/help-center`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Κέντρο Βοήθειας' : 'Help Center'}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal & Info */}
                    <div>
                        <h4 className="font-semibold mb-4">{lang === 'el' ? 'Πληροφορίες' : 'Information'}</h4>
                        <ul className="space-y-2 text-slate-400 text-sm mb-6">
                            <li>
                                <a href={`/${lang}/terms`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Όροι Χρήσης' : 'Terms of Service'}
                                </a>
                            </li>
                            <li>
                                <a href={`/${lang}/privacy`} className="hover:text-white transition-colors">
                                    {lang === 'el' ? 'Πολιτική Απορρήτου' : 'Privacy Policy'}
                                </a>
                            </li>
                        </ul>
                        <div className="text-xs text-slate-500">
                            Powered by<br />
                            <a href="https://belowthefold.gr" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                Below The Fold
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
