'use client';

import { Button } from '@netprophet/ui';
import { useRouter } from 'next/navigation';
import { SOCIAL_LINKS } from '@/lib/social-links';
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
            <div className="max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20 relative">
                    {/* Mobile Menu Button and Logo (left) */}
                    <div className="flex md:hidden items-center space-x-1.5 flex-shrink-0 min-w-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-white hover:text-[#F7E65D] transition-all duration-300 p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0"
                        >
                            <svg
                                className={`w-5 h-5 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
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
                            className="cursor-pointer scale-75 origin-left flex-shrink-0"
                            onClick={() => router.push(`/${lang}`)}
                        >
                            <Logo size="md" />
                        </div>
                    </div>

                    {/* Left Navigation (Desktop) */}
                    <nav className="hidden md:flex items-center space-x-2 lg:space-x-4 xl:space-x-6 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex gap-2 lg:gap-4 xl:gap-6 min-w-max">
                            <button
                                onClick={() => router.push(`/${lang}/how-it-works`)}
                                className="text-xs md:text-sm lg:text-base font-bold text-white hover:text-[#F7E65D] transition-colors whitespace-nowrap px-2 md:px-2.5 lg:px-3 py-1.5 md:py-2 rounded-xl flex-shrink-0"
                            >
                                {lang === 'el' ? 'Πώς Λειτουργεί' : 'How It Works'}
                            </button>
                            <button
                                onClick={() => router.push(`/${lang}/faq`)}
                                className="text-xs md:text-sm lg:text-base font-bold text-white hover:text-[#F7E65D] transition-colors whitespace-nowrap px-2 md:px-2.5 lg:px-3 py-1.5 md:py-2 rounded-xl flex-shrink-0"
                            >
                                FAQ
                            </button>
                            <button
                                onClick={() => router.push(`/${lang}/contact`)}
                                className="text-xs md:text-sm lg:text-base font-bold text-white hover:text-[#F7E65D] transition-colors whitespace-nowrap px-2 md:px-2.5 lg:px-3 py-1.5 md:py-2 rounded-xl flex-shrink-0"
                            >
                                {lang === 'el' ? 'Επικοινωνία' : 'Contact'}
                            </button>
                        </div>
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

                    {/* Right side - Social links, Language switch and Start Now button */}
                    <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0 ml-auto">
                        {/* Social links - Desktop only */}
                        <div className="hidden md:flex items-center gap-1.5">
                            <a
                                href={SOCIAL_LINKS.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-white/70 hover:text-[#F7E65D] transition-colors rounded-lg hover:bg-white/5"
                                aria-label="Instagram"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>
                            <a
                                href={SOCIAL_LINKS.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-white/70 hover:text-[#F7E65D] transition-colors rounded-lg hover:bg-white/5"
                                aria-label="TikTok"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                            </a>
                        </div>
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

                        {/* Start Now and Login Buttons */}
                        {showStartButton && (
                            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/register`)}
                                    style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                    className={`px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-[10px] sm:text-xs md:text-sm lg:text-base ${buttons.primary.className} shadow-lg whitespace-nowrap`}
                                >
                                    <span className="hidden md:inline">{lang === 'el' ? 'Ξεκίνα τώρα!' : 'Play Now!'}</span>
                                    <span className="md:hidden">{lang === 'el' ? 'Παίξε!' : 'Play!'}</span>
                                </Button>
                                <Button
                                    onClick={() => router.push(`/${lang}/auth/signin`)}
                                    className="px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-[10px] sm:text-xs md:text-sm lg:text-base border-2 border-white/30 hover:bg-white/10 text-white backdrop-blur-md bg-transparent whitespace-nowrap"
                                >
                                    {lang === 'el' ? 'Σύνδεση' : 'Login'}
                                </Button>
                            </div>
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

                            {/* Social links - Mobile */}
                            <div className={`pt-4 border-t border-white/10 flex gap-3 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                }`}
                                style={{ transitionDelay: isMobileMenuOpen ? '300ms' : '0ms' }}>
                                <a
                                    href={SOCIAL_LINKS.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-white/70 hover:text-[#F7E65D] transition-colors rounded-xl hover:bg-white/5"
                                    aria-label="Instagram"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                </a>
                                <a
                                    href={SOCIAL_LINKS.tiktok}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-white/70 hover:text-[#F7E65D] transition-colors rounded-xl hover:bg-white/5"
                                    aria-label="TikTok"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                                </a>
                            </div>

                            {showStartButton && (
                                <div className={`pt-4 border-t border-white/10 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                    }`}
                                    style={{ transitionDelay: isMobileMenuOpen ? '350ms' : '0ms' }}>
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => {
                                                router.push(`/${lang}/auth/register`);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            style={{ backgroundColor: buttons.primary.bg, color: buttons.primary.color }}
                                            className={`w-full text-lg py-4 ${buttons.primary.className} shadow-lg`}
                                        >
                                            {lang === 'el' ? 'Ξεκίνα τώρα!' : 'Play Now!'}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                router.push(`/${lang}/auth/signin`);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="w-full text-lg py-4 border-2 border-white/30 hover:bg-white/10 text-white backdrop-blur-md bg-transparent"
                                        >
                                            {lang === 'el' ? 'Σύνδεση' : 'Login'}
                                        </Button>
                                    </div>
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
