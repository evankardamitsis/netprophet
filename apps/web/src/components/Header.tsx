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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center flex-shrink-0">
                        <div
                            className="cursor-pointer"
                            onClick={() => router.push(`/${lang}`)}
                        >
                            <Logo size="md" />
                        </div>
                    </div>

                    {/* Right side - Language switch and Start Now button */}
                    <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                        {/* Language Switch */}
                        <div className="relative">
                            <button
                                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <span className="text-sm sm:text-base">{lang === 'el' ? '🇬🇷' : '🇺🇸'}</span>
                                <span className="hidden xs:inline">{lang === 'el' ? 'Ελληνικά' : 'English'}</span>
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
                                <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                                    <button
                                        onClick={() => {
                                            handleLanguageChange('el');
                                            setIsLanguageMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center space-x-2 ${lang === 'el' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                                            }`}
                                    >
                                        <span>🇬🇷</span>
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
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center space-x-2 ${lang === 'en' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                                            }`}
                                    >
                                        <span>🇺🇸</span>
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

                        {/* Start Now Button */}
                        {showStartButton && (
                            <Button
                                onClick={() => router.push(`/${lang}/auth/signin`)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium"
                            >
                                <span className="hidden sm:inline">{lang === 'el' ? 'Ξεκίνα τώρα' : 'Start Now'}</span>
                                <span className="sm:hidden">{lang === 'el' ? 'Ξεκίνα' : 'Start'}</span>
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
