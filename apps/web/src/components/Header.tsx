'use client';

import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Logo from './Logo';
import { buttons, headerStyles } from '@/styles/design-system';

interface HeaderProps {
    lang: 'en' | 'el';
    showStartButton?: boolean;
}

export default function Header({ lang, showStartButton = true }: HeaderProps) {
    const router = useRouter();
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLanguageChange = (newLang: 'en' | 'el') => {
        // Get current path and replace language
        const currentPath = window.location.pathname;
        const pathWithoutLang = currentPath.replace(/^\/(en|el)/, '');
        const newPath = `/${newLang}${pathWithoutLang}`;
        router.push(newPath);
    };

    return (
        <header
            className={headerStyles.className}
            style={{ backgroundColor: headerStyles.bg }}
        >
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20 relative">
                    {/* Mobile Menu Button and Logo (left) */}
                    <div className="flex md:hidden items-center space-x-3 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-white hover:text-[#F7E65D] transition-all duration-300 p-2 rounded-lg hover:bg-white/5"
                        >
                            <svg
                                className={`w-6 h-6 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    className={`transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                                <path
                                    className={`absolute transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                        <div
                            className="cursor-pointer"
                            onClick={() => router.push(`/${lang}`)}
                        >
                            <Logo size="md" />
                        </div>
                    </div>

                    {/* Left Navigation (Desktop) */}
                    <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 flex-1">
                        <button
                            onClick={() => router.push(`/${lang}/how-it-works`)}
                            className="text-md font-bold text-white hover:text-[#F7E65D] transition-colors whitespace-nowrap px-3 py-2 rounded-xl"
                        >
                            {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                        </button>
                        <button
                            onClick={() => router.push(`/${lang}/faq`)}
                            className="text-md font-bold text-white hover:text-[#F7E65D] transition-colors whitespace-nowrap px-3 py-2 rounded-xl"
                        >
                            FAQ
                        </button>
                        <button
                            onClick={() => router.push(`/${lang}/contact`)}
                            className="text-md font-bold text-white hover:text-[#F7E65D] transition-colors whitespace-nowrap px-3 py-2 rounded-xl"
                        >
                            {lang === 'el' ? 'Επικοινωνία' : 'Contact'}
                        </button>
                    </nav>

                    {/* Center Logo (Desktop) */}
                    <div className="hidden md:flex items-center justify-center flex-shrink-0 absolute left-1/2 transform -translate-x-1/2">
                        <div
                            className="cursor-pointer"
                            onClick={() => router.push(`/${lang}`)}
                        >
                            <Logo size="md" />
                        </div>
                    </div>

                    {/* Right side - Language switch and Start Now button */}
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 ml-auto">
                        {/* Language Switch - Hidden on mobile */}
                        <div className="relative hidden md:block">
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
                                style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                className={`px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-base ${buttons.primary.className} shadow-lg`}
                            >
                                <span className="hidden sm:inline">{lang === 'el' ? 'Ξεκίνα τώρα!' : 'Play Now!'}</span>
                                <span className="sm:hidden">{lang === 'el' ? 'Παίξε!' : 'Play!'}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`md:hidden fixed inset-0 bg-slate-800 transition-all duration-300 z-50 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                <div className="flex flex-col h-full">
                    {/* Welcome Bonus Banner - Top */}
                    <div className="bg-yellow-300 text-black py-3 px-4 text-center font-bold text-sm sm:text-base shadow-lg">
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-xl">🎁</span>
                            <span>
                                {lang === 'el'
                                    ? 'Welcome Bonus: Ξεκίνα με 100 Νομίσματα + Tournament Pass!'
                                    : 'Welcome Bonus: Start with 100 Coins + Tournament Pass!'
                                }
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
                        {/* Mobile Menu Header */}
                        <div className="flex justify-between items-center mb-8">
                            {/* Logo */}
                            <div
                                className="cursor-pointer"
                                onClick={() => {
                                    router.push(`/${lang}`);
                                    setIsMobileMenuOpen(false);
                                }}
                            >
                                <Logo size="lg" />
                            </div>
                            {/* Close Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-white hover:text-[#F7E65D] transition-all duration-300 p-2 rounded-lg hover:bg-white/5"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <nav className="space-y-4">
                            <button
                                onClick={() => {
                                    router.push(`/${lang}/how-it-works`);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`block w-full text-left text-lg font-bold text-white hover:text-[#F7E65D] transition-all duration-300 px-4 py-3 rounded-xl hover:bg-white/5 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                    }`}
                                style={{ transitionDelay: isMobileMenuOpen ? '100ms' : '0ms' }}
                            >
                                {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                            </button>
                            <button
                                onClick={() => {
                                    router.push(`/${lang}/faq`);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`block w-full text-left text-lg font-bold text-white hover:text-[#F7E65D] transition-all duration-300 px-4 py-3 rounded-xl hover:bg-white/5 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                    }`}
                                style={{ transitionDelay: isMobileMenuOpen ? '150ms' : '0ms' }}
                            >
                                FAQ
                            </button>
                            <button
                                onClick={() => {
                                    router.push(`/${lang}/contact`);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`block w-full text-left text-lg font-bold text-white hover:text-[#F7E65D] transition-all duration-300 px-4 py-3 rounded-xl hover:bg-white/5 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                    }`}
                                style={{ transitionDelay: isMobileMenuOpen ? '200ms' : '0ms' }}
                            >
                                {lang === 'el' ? 'Επικοινωνία' : 'Contact'}
                            </button>
                            {/* Language Switcher */}
                            <div className={`pt-4 border-t border-white/10 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                }`}
                                style={{ transitionDelay: isMobileMenuOpen ? '250ms' : '0ms' }}>
                                <div className="space-y-2">
                                    <p className="text-white/70 text-sm font-medium mb-3">
                                        {lang === 'el' ? 'Γλώσσα' : 'Language'}
                                    </p>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                handleLanguageChange('el');
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all border-2 ${lang === 'el'
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-400'
                                                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                                }`}
                                        >
                                            🇬🇷 Ελληνικά
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleLanguageChange('en');
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all border-2 ${lang === 'en'
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-400'
                                                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                                }`}
                                        >
                                            🇺🇸 English
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {showStartButton && (
                                <div className={`pt-4 border-t border-white/10 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                    }`}
                                    style={{ transitionDelay: isMobileMenuOpen ? '300ms' : '0ms' }}>
                                    <Button
                                        onClick={() => {
                                            router.push(`/${lang}/auth/signin`);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                        className={`w-full text-lg py-4 ${buttons.primary.className} shadow-lg`}
                                    >
                                        {lang === 'el' ? 'Ξεκίνα τώρα!' : 'Play Now!'}
                                    </Button>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Click outside to close language menu */}
            {isLanguageMenuOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsLanguageMenuOpen(false)}
                />
            )}
        </header>
    );
}
