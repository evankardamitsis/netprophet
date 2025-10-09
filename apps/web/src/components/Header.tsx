'use client';

import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Logo from './Logo';

interface HeaderProps {
    lang: 'en' | 'el';
    showStartButton?: boolean;
}

export default function Header({ lang, showStartButton = true }: HeaderProps) {
    const router = useRouter();
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

    const handleLanguageChange = (newLang: 'en' | 'el') => {
        // Get current path and replace language
        const currentPath = window.location.pathname;
        const pathWithoutLang = currentPath.replace(/^\/(en|el)/, '');
        const newPath = `/${newLang}${pathWithoutLang}`;
        router.push(newPath);
    };

    return (
        <header className="bg-white/95 backdrop-blur-lg sticky top-0 z-50 shadow-lg">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex items-center flex-shrink-0">
                        <div
                            className="cursor-pointer"
                            onClick={() => router.push(`/${lang}`)}
                        >
                            <Logo size="md" />
                        </div>
                    </div>

                    {/* Center Navigation */}
                    <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
                        <button
                            onClick={() => router.push(`/${lang}/how-it-works`)}
                            className="text-md font-bold text-purple-700 hover:text-pink-600 transition-colors whitespace-nowrap px-3 py-2 rounded-xl hover:bg-purple-50"
                        >
                            {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                        </button>
                        <button
                            onClick={() => router.push(`/${lang}/faq`)}
                            className="text-md font-bold text-purple-700 hover:text-pink-600 transition-colors whitespace-nowrap px-3 py-2 rounded-xl hover:bg-purple-50"
                        >
                            FAQ
                        </button>
                        <button
                            onClick={() => router.push(`/${lang}/contact`)}
                            className="text-md font-bold text-purple-700 hover:text-pink-600 transition-colors whitespace-nowrap px-3 py-2 rounded-xl hover:bg-purple-50"
                        >
                            {lang === 'el' ? 'Επικοινωνία' : 'Contact'}
                        </button>
                    </nav>

                    {/* Right side - Language switch and Start Now button */}
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                        {/* Language Switch */}
                        <div className="relative">
                            <button
                                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1 text-xs sm:text-sm font-bold text-purple-700 hover:text-pink-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all border-2 border-purple-200"
                            >
                                <span className="text-lg">{lang === 'el' ? '🇬🇷' : '🇺🇸'}</span>
                                <span className="hidden xs:inline">{lang === 'el' ? 'ΕΛ' : 'EN'}</span>
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
                                <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-2xl shadow-2xl border-4 border-purple-200 py-2 z-50 overflow-hidden">
                                    <button
                                        onClick={() => {
                                            handleLanguageChange('el');
                                            setIsLanguageMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-purple-50 flex items-center space-x-3 transition-colors ${lang === 'el' ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' : 'text-gray-700'
                                            }`}
                                    >
                                        <span className="text-xl">🇬🇷</span>
                                        <span>Ελληνικά</span>
                                        {lang === 'el' && (
                                            <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleLanguageChange('en');
                                            setIsLanguageMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-purple-50 flex items-center space-x-3 transition-colors ${lang === 'en' ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' : 'text-gray-700'
                                            }`}
                                    >
                                        <span className="text-xl">🇺🇸</span>
                                        <span>English</span>
                                        {lang === 'en' && (
                                            <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Start Now Button */}
                        {showStartButton && (
                            <Button
                                onClick={() => router.push(`/${lang}/auth/signin`)}
                                className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-purple-900 px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-base font-black rounded-xl shadow-lg transform hover:scale-105 transition-all"
                            >
                                <span className="hidden sm:inline">{lang === 'el' ? '🎮 Ξεκίνα τώρα!' : '🎮 Play Now!'}</span>
                                <span className="sm:hidden">{lang === 'el' ? '🎮 Παίξε!' : '🎮 Play!'}</span>
                            </Button>
                        )}
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
        </header>
    );
}
