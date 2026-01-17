'use client';

import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Logo from './Logo';
import { buttons, headerStyles } from '@/styles/design-system';
import { useAuth } from '@/hooks/useAuth';

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
    const { user } = useAuth();
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

    const handleLanguageChange = (newLang: 'en' | 'el') => {
        // Get current path and replace language
        const currentPath = window.location.pathname;
        const pathWithoutLang = currentPath.replace(/^\/(en|el)/, '');
        const newPath = `/${newLang}${pathWithoutLang}`;
        router.push(newPath);
    };

    const handleProtectedLink = (path: string) => {
        if (!user) {
            router.push(`/${lang}/auth/register`);
        } else {
            router.push(path);
        }
    };

    return (
        <footer
            className="text-white py-16 relative overflow-hidden"
            style={{ backgroundColor: '#0F1625' }}
        >

            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 mb-8">
                    {/* Brand - Takes 2 columns */}
                    <div className="md:col-span-2">
                        <div className="mb-4">
                            <Logo size="md" />
                        </div>
                        <p className="text-slate-300 mb-6  font-semibold max-w-md">
                            {lang === 'el' ? 'Το πιο διασκεδαστικό παιχνίδι προβλέψεων με ερασιτεχνικούς αγώνες και τουρνουά.' : 'The most exciting sports prediction game with amateur matches and tournaments.'}
                        </p>
                        <Button
                            onClick={() => router.push(`/${lang}/auth/register`)}
                            size="sm"
                            style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                            className={`${buttons.primary.className} shadow-lg`}
                        >
                            {lang === 'el' ? 'Ξεκίνα Δωρεάν' : 'Start Free'}
                        </Button>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="font-black mb-4 text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {lang === 'el' ? '🎮 Πλατφόρμα' : '🎮 Platform'}
                        </h4>
                        <ul className="space-y-3 text-slate-300 text-sm font-semibold">
                            <li>
                                <button onClick={() => handleProtectedLink(`/${lang}/matches`)} className="hover:text-yellow-300 transition-colors flex items-center gap-2 cursor-pointer">
                                    <span>🎾</span> {lang === 'el' ? 'Αγώνες' : 'Matches'}
                                </button>
                            </li>
                            <li>
                                <button onClick={() => handleProtectedLink(`/${lang}/leaderboard`)} className="hover:text-yellow-300 transition-colors flex items-center gap-2 cursor-pointer">
                                    <span>🏆</span> {dict?.navigation?.leaderboard || 'Leaderboard'}
                                </button>
                            </li>
                            <li>
                                <button onClick={() => handleProtectedLink(`/${lang}/players`)} className="hover:text-yellow-300 transition-colors flex items-center gap-2 cursor-pointer">
                                    <span>👥</span> {lang === 'el' ? 'Παίκτες' : 'Players'}
                                </button>
                            </li>
                            <li>
                                <button onClick={() => handleProtectedLink(`/${lang}/results`)} className="hover:text-yellow-300 transition-colors flex items-center gap-2 cursor-pointer">
                                    <span>📊</span> {lang === 'el' ? 'Αποτελέσματα' : 'Results'}
                                </button>
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
                        {/* Language Switcher - Mobile Only */}
                        <div className="md:hidden mb-4">
                            <h5 className="font-bold mb-3 text-sm text-slate-300">
                                {lang === 'el' ? '🌐 Γλώσσα' : '🌐 Language'}
                            </h5>
                            <div className="relative">
                                <button
                                    onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                                    className="flex items-center space-x-2 px-3 py-2 text-sm font-bold text-purple-300 hover:text-pink-300 bg-purple-800/30 hover:bg-purple-700/50 rounded-xl transition-all border border-purple-600/30"
                                >
                                    <span className="text-lg">{lang === 'el' ? '🇬🇷' : '🇺🇸'}</span>
                                    <span>{lang === 'el' ? 'Ελληνικά' : 'English'}</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Language Dropdown */}
                                {isLanguageMenuOpen && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-purple-600/30 py-2 z-50 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                handleLanguageChange('el');
                                                setIsLanguageMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-purple-800/50 flex items-center space-x-3 transition-colors ${lang === 'el' ? 'bg-purple-700/50 text-purple-200' : 'text-slate-300'
                                                }`}
                                        >
                                            <span className="text-xl">🇬🇷</span>
                                            <span>Ελληνικά</span>
                                            {lang === 'el' && (
                                                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleLanguageChange('en');
                                                setIsLanguageMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-purple-800/50 flex items-center space-x-3 transition-colors ${lang === 'en' ? 'bg-purple-700/50 text-purple-200' : 'text-slate-300'
                                                }`}
                                        >
                                            <span className="text-xl">🇺🇸</span>
                                            <span>English</span>
                                            {lang === 'en' && (
                                                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-xs text-slate-400 font-semibold">
                            Powered by<br />
                            <a href="https://belowthefold.gr" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 font-bold">
                                Below The Fold
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Click outside to close language menu */}
            {isLanguageMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsLanguageMenuOpen(false)}
                />
            )}
        </footer>
    );
}
