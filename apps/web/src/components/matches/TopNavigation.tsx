'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@netprophet/ui';
import { Wallet } from './Wallet';
import { Dictionary } from '@/types/dictionary';

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
    const router = useRouter();
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const languageDropdownRef = useRef<HTMLDivElement>(null);

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

    const switchLanguage = (newLang: 'en' | 'el') => {
        setLanguageDropdownOpen(false);
        // Replace the current language in the pathname
        const newPath = pathname.replace(/^\/(en|el)/, `/${newLang}`);
        router.push(newPath);
    };

    return (
        <header className="w-full flex items-center justify-between px-4 py-3 sticky top-0 z-10 border-b border-slate-700/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-lg">
            <div className="flex items-center gap-2">
                <button onClick={onMenuClick} className="text-accent text-2xl font-bold focus:outline-none md:hidden">☰</button>
                <Link
                    href={`/${currentLang}`}
                    className="text-xl font-extrabold tracking-tight text-accent hover:text-accent/80 transition-colors cursor-pointer px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                    NetProphet
                </Link>
            </div>
            {showNavigationTabs && (
                <nav className="flex-1 flex justify-center gap-4">
                    <button onClick={() => router.push(`/${currentLang}/matches`)} className="px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white">
                        {dict?.navigation?.matches || 'Matches'}
                    </button>
                    <button onClick={() => router.push(`/${currentLang}/matches/leaderboard`)} className="px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white">
                        {dict?.navigation?.leaderboard || 'Leaderboard'}
                    </button>
                    <button onClick={() => router.push(`/${currentLang}/matches/rewards`)} className="px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white">
                        {dict?.navigation?.rewards || 'Rewards'}
                    </button>
                </nav>
            )}
            <div className="flex items-center gap-3">

                {/* Language Switcher */}
                <div className="relative" ref={languageDropdownRef}>
                    <button
                        onClick={() => setLanguageDropdownOpen((open) => !open)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white focus:outline-none"
                        aria-label="Language menu"
                    >
                        <GlobeIcon />
                        {currentLang === 'en' ? 'EN' : 'EL'}
                        <ChevronDownIcon />
                    </button>
                    {languageDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-32 rounded-lg shadow-lg z-50 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                            <button
                                className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80 ${currentLang === 'en' ? 'text-accent' : ''}`}
                                onClick={() => switchLanguage('en')}
                            >
                                🇺🇸 English
                            </button>
                            <button
                                className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80 ${currentLang === 'el' ? 'text-accent' : ''}`}
                                onClick={() => switchLanguage('el')}
                            >
                                🇬🇷 Ελληνικά
                            </button>
                        </div>
                    )}
                </div>

                {/* Wallet Component */}
                <Wallet dict={dict} lang={lang} />

                {/* Account dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setAccountDropdownOpen((open) => !open)}
                        className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-bold text-lg focus:outline-none"
                        aria-label="Account menu"
                    >
                        U
                        <ChevronDownIcon />
                    </button>
                    {accountDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                            <button
                                className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80"
                                onClick={() => { setAccountDropdownOpen(false); router.push(`/${currentLang}/matches/my-profile`); }}
                            >
                                <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80"
                                onClick={() => { setAccountDropdownOpen(false); router.push(`/${currentLang}/matches/my-picks`); }}
                            >
                                <LeaderboardIcon /> {dict?.navigation?.myPicks || 'My Picks'}
                            </button>
                            <div className="border-t my-2 border-gray-700" />
                            <button
                                className="w-full text-left px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-[#23262F]/80"
                                onClick={() => { setAccountDropdownOpen(false); onSignOut(); }}
                            >
                                {dict?.auth?.signOut || 'Sign Out'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
} 