'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@netprophet/ui';
import { Wallet } from './Wallet';
import { Dictionary } from '@/types/dictionary';
import Logo from '@/components/Logo';

// Icon components
function ChevronDownIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
}

function LeaderboardIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
}

function RewardsIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
}

function UserIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
}

function GlobeIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
}

// Animated Burger Icon Component
function BurgerIcon({ isOpen }: { isOpen: boolean }) {
    return (
        <div className="relative w-6 h-6 flex flex-col justify-center items-center">
            <motion.span
                className="absolute w-6 h-0.5 bg-current rounded-full"
                animate={{
                    rotate: isOpen ? 45 : 0,
                    y: isOpen ? 0 : -6,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />
            <motion.span
                className="absolute w-6 h-0.5 bg-current rounded-full"
                animate={{
                    opacity: isOpen ? 0 : 1,
                    scale: isOpen ? 0 : 1,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
            />
            <motion.span
                className="absolute w-6 h-0.5 bg-current rounded-full"
                animate={{
                    rotate: isOpen ? -45 : 0,
                    y: isOpen ? 0 : 6,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />
        </div>
    );
}

interface TopNavigationProps {
    userEmail?: string;
    onMenuClick: () => void;
    onSignOut: () => void;
    showNavigationTabs?: boolean;
    dict?: Dictionary;
    lang?: 'en' | 'el';
}

export function TopNavigation({
    userEmail,
    onMenuClick,
    onSignOut,
    showNavigationTabs = true,
    dict,
    lang = 'en'
}: TopNavigationProps) {
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const burgerButtonRef = useRef<HTMLButtonElement>(null);

    // Extract current language from pathname
    const currentLang = pathname.startsWith('/el') ? 'el' : 'en';

    useEffect(() => {
        if (!accountDropdownOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setAccountDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [accountDropdownOpen]);

    useEffect(() => {
        if (!languageDropdownOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (
                languageDropdownRef.current &&
                !languageDropdownRef.current.contains(event.target as Node)
            ) {
                setLanguageDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [languageDropdownOpen]);

    useEffect(() => {
        if (!mobileMenuOpen) return;
        function handleClickOutside(event: MouseEvent) {
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target as Node) &&
                burgerButtonRef.current &&
                !burgerButtonRef.current.contains(event.target as Node)
            ) {
                setMobileMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [mobileMenuOpen]);

    const switchLanguage = (newLang: 'en' | 'el') => {
        setLanguageDropdownOpen(false);
        // Replace the current language in the pathname
        const newPath = pathname.replace(/^\/(en|el)/, `/${newLang}`);
        router.push(newPath);
    };

    return (
        <div className="relative">
            <header className="w-full flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-10 border-b border-slate-700/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-lg">
                {/* Left Section - Logo and Menu */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        ref={burgerButtonRef}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="text-accent focus:outline-none lg:hidden p-2 rounded hover:bg-accent/10 transition-colors"
                        aria-label="Mobile menu"
                    >
                        <BurgerIcon isOpen={mobileMenuOpen} />
                    </button>
                    <Link
                        href={`/${currentLang}`}
                        className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent/50 rounded"
                    >
                        <Logo size="md" />
                    </Link>
                </div>

                {/* Center Section - Navigation Tabs (Hidden on mobile) */}
                {showNavigationTabs && (
                    <nav className="hidden lg:flex flex-1 justify-center gap-2 xl:gap-4">
                        <button
                            onClick={() => router.push(`/${currentLang}/matches`)}
                            className="px-2 xl:px-3 py-1 xl:py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-sm xl:text-base"
                        >
                            {dict?.navigation?.matches || 'Matches'}
                        </button>
                        <button
                            onClick={() => router.push(`/${currentLang}/matches/leaderboard`)}
                            className="px-2 xl:px-3 py-1 xl:py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-sm xl:text-base"
                        >
                            {dict?.navigation?.leaderboard || 'Leaderboard'}
                        </button>
                        <button
                            onClick={() => router.push(`/${currentLang}/matches/rewards`)}
                            className="px-2 xl:px-3 py-1 xl:py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-sm xl:text-base"
                        >
                            {dict?.navigation?.rewards || 'Rewards'}
                        </button>
                    </nav>
                )}

                {/* Right Section - Wallet, Account, Language */}
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                    {/* Wallet Component */}
                    <div className="block">
                        <Wallet dict={dict} lang={lang} />
                    </div>

                    {/* Account dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setAccountDropdownOpen((open) => !open)}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent flex items-center justify-center font-bold text-base sm:text-lg focus:outline-none hover:bg-accent/80 transition-colors"
                            aria-label="Account menu"
                        >
                            U
                            <ChevronDownIcon />
                        </button>
                        {accountDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 sm:w-48 rounded-lg shadow-lg z-50 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                                <button
                                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80 text-sm sm:text-base"
                                    onClick={() => { setAccountDropdownOpen(false); router.push(`/${currentLang}/matches/my-profile`); }}
                                >
                                    <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80 text-sm sm:text-base"
                                    onClick={() => { setAccountDropdownOpen(false); router.push(`/${currentLang}/matches/my-picks`); }}
                                >
                                    <LeaderboardIcon /> {dict?.navigation?.myPicks || 'My Picks'}
                                </button>
                                <div className="border-t my-2 border-gray-700" />
                                <button
                                    className="w-full text-left px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-[#23262F]/80 text-sm sm:text-base"
                                    onClick={() => { setAccountDropdownOpen(false); onSignOut(); }}
                                >
                                    {dict?.auth?.signOut || 'Sign Out'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Language Switcher - Hidden on mobile */}
                    <div className="relative hidden lg:block" ref={languageDropdownRef}>
                        <button
                            onClick={() => setLanguageDropdownOpen((open) => !open)}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white focus:outline-none text-sm sm:text-base"
                            aria-label="Language menu"
                        >
                            <GlobeIcon />
                            <span className="hidden sm:inline">{currentLang === 'en' ? 'EN' : 'EL'}</span>
                            <ChevronDownIcon />
                        </button>
                        {languageDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-32 sm:w-36 rounded-lg shadow-lg z-50 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                                <button
                                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80 text-sm sm:text-base ${currentLang === 'en' ? 'text-accent' : ''}`}
                                    onClick={() => switchLanguage('en')}
                                >
                                    🇺🇸 English
                                </button>
                                <button
                                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80 text-sm sm:text-base ${currentLang === 'el' ? 'text-accent' : ''}`}
                                    onClick={() => switchLanguage('el')}
                                >
                                    🇬🇷 Ελληνικά
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        ref={mobileMenuRef}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="lg:hidden absolute top-full left-0 right-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-700/50 shadow-lg overflow-hidden"
                    >
                        <div className="px-4 py-3 space-y-3">
                            {/* Navigation Links */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches`);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base"
                                >
                                    {dict?.navigation?.matches || 'Matches'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/leaderboard`);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base"
                                >
                                    {dict?.navigation?.leaderboard || 'Leaderboard'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/rewards`);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base"
                                >
                                    {dict?.navigation?.rewards || 'Rewards'}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700/50 my-3"></div>

                            {/* Account Links */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/my-profile`);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base flex items-center gap-2"
                                >
                                    <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/my-picks`);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base flex items-center gap-2"
                                >
                                    <LeaderboardIcon /> {dict?.navigation?.myPicks || 'My Picks'}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700/50 my-3"></div>

                            {/* Language Switcher - Mobile */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide px-3">
                                    Language
                                </div>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        switchLanguage('en');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base flex items-center gap-2 ${currentLang === 'en' ? 'text-accent' : ''}`}
                                >
                                    <GlobeIcon /> 🇺🇸 English
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        switchLanguage('el');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white text-base flex items-center gap-2 ${currentLang === 'el' ? 'text-accent' : ''}`}
                                >
                                    <GlobeIcon /> 🇬🇷 Ελληνικά
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700/50 my-3"></div>

                            {/* Sign Out */}
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    onSignOut();
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-red-900/20 hover:text-red-400 text-red-600 text-base"
                            >
                                {dict?.auth?.signOut || 'Sign Out'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 