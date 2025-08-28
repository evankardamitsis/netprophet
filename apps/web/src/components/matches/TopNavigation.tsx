'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet } from './Wallet';
import { Notifications } from '@/components/Notifications';
import { Dictionary } from '@/types/dictionary';
import Logo from '@/components/Logo';
import { ProfilesService, fetchUserPowerUps, supabase, type UserPowerUp } from '@netprophet/lib';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/context/WalletContext';

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

function PlayersIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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

function PowerUpIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
}

function InfoIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    const { wallet } = useWallet();

    // Check if low balance notification was dismissed
    const isLowBalanceNotificationDismissed = () => {
        if (typeof window === 'undefined') return false;
        const dismissed = localStorage.getItem('lowBalanceNotificationDismissed');
        if (!dismissed) return false;

        const dismissedTime = parseInt(dismissed);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        return (now - dismissedTime) < oneDay;
    };

    // Check if user has low balance
    const isLowBalance = wallet.balance <= 200;
    const isVeryLowBalance = wallet.balance < 100;
    const isCriticalBalance = wallet.balance < 50;

    // Show info icon if notification was dismissed and balance is still low
    const showInfoIcon = isLowBalanceNotificationDismissed() && isLowBalance;

    // Function to clear dismissal and show notification again
    const showLowBalanceNotification = () => {
        localStorage.removeItem('lowBalanceNotificationDismissed');
        // Dispatch event to show notification immediately
        window.dispatchEvent(new CustomEvent('showLowBalanceNotification'));
    };

    // Listen for notification dismissal events
    useEffect(() => {
        const handleNotificationDismissed = () => {
            // Force re-render to show info icon immediately
            setAccountDropdownOpen(false); // This will trigger a re-render
        };

        window.addEventListener('notificationDismissed', handleNotificationDismissed);
        return () => {
            window.removeEventListener('notificationDismissed', handleNotificationDismissed);
        };
    }, []);

    // Force re-render when localStorage changes
    useEffect(() => {
        const handleStorageChange = () => {
            // Force re-render when localStorage changes
            setAccountDropdownOpen(false);
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    // Add CSS for slow pulse animation
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slowPulse {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.05);
                }
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userPowerUps, setUserPowerUps] = useState<UserPowerUp[]>([]);
    const [powerUpsLoading, setPowerUpsLoading] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const burgerButtonRef = useRef<HTMLButtonElement>(null);

    // Extract current language from pathname
    const currentLang = pathname.startsWith('/el') ? 'el' : 'en';

    // Load user power-ups
    useEffect(() => {
        const loadUserPowerUps = async () => {
            if (!user) return;

            setPowerUpsLoading(true);
            try {
                const powerUps = await fetchUserPowerUps(user.id);
                setUserPowerUps(powerUps);
            } catch (error) {
                console.error('Error loading user power-ups:', error);
            } finally {
                setPowerUpsLoading(false);
            }
        };

        loadUserPowerUps();
    }, [user]);



    // Manual refresh listener
    useEffect(() => {
        const handleManualRefresh = () => {
            if (user) {
                const loadUserPowerUps = async () => {
                    try {
                        const powerUps = await fetchUserPowerUps(user.id);
                        setUserPowerUps(powerUps);
                    } catch (error) {
                        console.error('Error manually refreshing user power-ups:', error);
                    }
                };
                loadUserPowerUps();
            }
        };

        window.addEventListener('refreshPowerUps', handleManualRefresh);

        return () => {
            window.removeEventListener('refreshPowerUps', handleManualRefresh);
        };
    }, [user]);

    // Calculate total active power-ups
    const totalActivePowerUps = userPowerUps.reduce((total, powerUp) => {
        // Check if power-up has expired
        if (powerUp.expires_at && new Date(powerUp.expires_at) < new Date()) {
            return total;
        }
        return total + powerUp.quantity;
    }, 0);

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

    const switchLanguage = async (newLang: 'en' | 'el') => {
        setLanguageDropdownOpen(false);

        try {
            // Save language preference to user profile
            await ProfilesService.updateLanguagePreference(newLang);
        } catch (error) {
            console.error('Failed to save language preference:', error);
            // Continue with language switch even if saving fails
        }

        // Replace the current language in the pathname
        const newPath = pathname.replace(/^\/(en|el)/, `/${newLang}`);
        router.push(newPath);
    };

    return (
        <div className="relative">
            <header className="w-full flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-10  bg-gradient-to-r from-slate-900 via-blue-950 to-purple-950 text-white shadow-lg">
                {/* Left Section - Logo and Menu */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        ref={burgerButtonRef}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="text-white focus:outline-none lg:hidden p-2 rounded hover:bg-purple-600/20 hover:text-purple-300 transition-colors"
                        aria-label="Mobile menu"
                    >
                        <BurgerIcon isOpen={mobileMenuOpen} />
                    </button>
                    <Link
                        href={`/${currentLang}`}
                        className="focus:outline-none focus:ring-2 focus:ring-accent/50 rounded group"
                    >
                        <Logo size="md" />
                    </Link>
                </div>

                {/* Center Section - Navigation Tabs (Hidden on mobile) */}
                {showNavigationTabs && (
                    <nav className="hidden lg:flex flex-1 justify-center gap-1.5 xl:gap-3">
                        <button
                            onClick={() => router.push(`/${currentLang}/matches`)}
                            className={`px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 rounded-lg font-semibold transition text-xs xl:text-sm ${pathname === `/${currentLang}/matches` || pathname === `/${currentLang}`
                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                }`}
                        >
                            {dict?.navigation?.matches || 'Matches'}
                        </button>
                        <button
                            onClick={() => router.push(`/${currentLang}/matches/leaderboard`)}
                            className={`px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 rounded-lg font-semibold transition text-xs xl:text-sm ${pathname === `/${currentLang}/matches/leaderboard`
                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                }`}
                        >
                            {dict?.navigation?.leaderboard || 'Leaderboard'}
                        </button>
                        <button
                            onClick={() => router.push(`/${currentLang}/matches/my-picks`)}
                            className={`px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 rounded-lg font-semibold transition text-xs xl:text-sm ${pathname === `/${currentLang}/matches/my-picks`
                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                }`}
                        >
                            {dict?.navigation?.myPicks || 'My Picks'}
                        </button>
                        <button
                            onClick={() => router.push(`/${currentLang}/players`)}
                            className={`px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 rounded-lg font-semibold transition text-xs xl:text-sm ${pathname === `/${currentLang}/players`
                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                }`}
                        >
                            {dict?.navigation?.players || 'Players'}
                        </button>
                        <button
                            onClick={() => router.push(`/${currentLang}/matches/rewards`)}
                            className={`px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 rounded-lg font-semibold transition text-xs xl:text-sm ${pathname === `/${currentLang}/matches/rewards`
                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                }`}
                        >
                            {dict?.navigation?.rewards || 'Rewards'}
                        </button>
                    </nav>
                )}

                {/* Right Section - Wallet, Notifications, Language, Account */}
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                    {/* Wallet Component */}
                    <div className="block">
                        <Wallet dict={dict} lang={lang} />
                    </div>

                    {/* Notifications Component */}
                    <div className="block">
                        <Notifications />
                    </div>

                    {/* Low Balance Info Icon */}
                    {showInfoIcon && (
                        <button
                            onClick={showLowBalanceNotification}
                            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-semibold transition hover:bg-purple-600/20 hover:text-purple-300 text-white focus:outline-none"
                            title={isCriticalBalance
                                ? 'Critical low balance - Click to view options'
                                : isVeryLowBalance
                                    ? 'Very low balance - Click to view options'
                                    : 'Low balance - Click to view options'
                            }
                        >
                            <InfoIcon />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        </button>
                    )}

                    {/* Language Switcher - Hidden on mobile */}
                    <div className="relative hidden lg:block" ref={languageDropdownRef}>
                        <button
                            onClick={() => setLanguageDropdownOpen((open) => !open)}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold transition hover:bg-purple-600/20 hover:text-purple-300 text-white focus:outline-none text-sm sm:text-base"
                            aria-label="Language menu"
                        >
                            <GlobeIcon />
                            <span className="hidden sm:inline text-xs">{currentLang === 'en' ? 'EN' : 'EL'}</span>
                            <ChevronDownIcon />
                        </button>
                        {languageDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-32 sm:w-36 rounded-lg shadow-lg z-50 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                                <button
                                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-purple-600/20 hover:text-purple-300 text-xs ${currentLang === 'en' ? 'text-purple-300' : ''}`}
                                    onClick={() => switchLanguage('en')}
                                >
                                    🇺🇸 English
                                </button>
                                <button
                                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-purple-600/20 hover:text-purple-300 text-xs ${currentLang === 'el' ? 'text-purple-300' : ''}`}
                                    onClick={() => switchLanguage('el')}
                                >
                                    🇬🇷 Ελληνικά
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Account dropdown with power-up badge */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setAccountDropdownOpen((open) => !open)}
                            className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-base sm:text-lg focus:outline-none transition-all duration-300 ${totalActivePowerUps > 0
                                ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 shadow-lg shadow-purple-500/50 ring-2 ring-purple-400/30'
                                : 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 shadow-sm shadow-purple-500/30'
                                }`}
                            style={totalActivePowerUps > 0 ? {
                                animation: 'slowPulse 2s ease-in-out infinite'
                            } : {}}
                            aria-label="Account menu"
                        >
                            {userEmail?.charAt(0).toUpperCase() || 'U'}

                            {/* Power-up Badge */}
                            {totalActivePowerUps > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/30 shadow-orange-400/60 ring-1 ring-orange-300/50">
                                    <PowerUpIcon />
                                </div>
                            )}
                        </button>
                        {accountDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 sm:w-56 rounded-lg shadow-lg z-50 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/50">
                                {/* Power-ups section */}
                                {totalActivePowerUps > 0 && (
                                    <>
                                        <div className="px-4 py-2 border-b border-slate-700/50">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                                                <PowerUpIcon />
                                                <span>Active Power-ups</span>
                                                <span className="ml-auto bg-purple-600/20 px-2 py-1 rounded-full text-xs">
                                                    {totalActivePowerUps}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto">
                                            {userPowerUps.map((userPowerUp) => {
                                                // Skip expired power-ups
                                                if (userPowerUp.expires_at && new Date(userPowerUp.expires_at) < new Date()) {
                                                    return null;
                                                }

                                                // Calculate time until expiry
                                                const getExpiryText = () => {
                                                    if (!userPowerUp.expires_at) return null;

                                                    const now = new Date();
                                                    const expiryDate = new Date(userPowerUp.expires_at);
                                                    const diffTime = expiryDate.getTime() - now.getTime();
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

                                                    if (diffDays > 1) {
                                                        return `Expires in: ${diffDays} days`;
                                                    } else if (diffDays === 1) {
                                                        return 'Expires in: 1 day';
                                                    } else if (diffHours > 1) {
                                                        return `Expires in: ${diffHours} hours`;
                                                    } else if (diffHours === 1) {
                                                        return 'Expires in: 1 hour';
                                                    } else {
                                                        return 'Expires soon';
                                                    }
                                                };

                                                const expiryText = getExpiryText();

                                                return (
                                                    <div key={userPowerUp.id} className="px-4 py-2 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{userPowerUp.power_up?.icon || '⚡'}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-white truncate">
                                                                    {userPowerUp.power_up?.name || 'Power-up'}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-400 text-xs">
                                                                        {userPowerUp.quantity}x
                                                                    </span>
                                                                    {expiryText && (
                                                                        <span className="text-orange-400 text-xs font-medium">
                                                                            {expiryText}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="border-t border-slate-700/50 my-2" />
                                    </>
                                )}

                                <button
                                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-purple-600/20 hover:text-purple-300 text-xs sm:text-sm"
                                    onClick={() => { setAccountDropdownOpen(false); router.push(`/${currentLang}/matches/my-profile`); }}
                                >
                                    <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
                                </button>
                                <div className="border-t my-2 border-gray-700" />
                                <button
                                    className="w-full text-left px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-[#23262F]/80 text-xs sm:text-sm"
                                    onClick={() => { setAccountDropdownOpen(false); onSignOut(); }}
                                >
                                    {dict?.auth?.signOut || 'Sign Out'}
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
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition text-base ${pathname === `/${currentLang}/matches` || pathname === `/${currentLang}`
                                        ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                        : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                        }`}
                                >
                                    {dict?.navigation?.matches || 'Matches'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/leaderboard`);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition text-base ${pathname === `/${currentLang}/matches/leaderboard`
                                        ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                        : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                        }`}
                                >
                                    {dict?.navigation?.leaderboard || 'Leaderboard'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/my-picks`);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition text-base ${pathname === `/${currentLang}/matches/my-picks`
                                        ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                        : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                        }`}
                                >
                                    {dict?.navigation?.myPicks || 'My Picks'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/players`);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition text-base ${pathname === `/${currentLang}/players`
                                        ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                        : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                        }`}
                                >
                                    {dict?.navigation?.players || 'Players'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches/rewards`);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition text-base ${pathname === `/${currentLang}/matches/rewards`
                                        ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                        : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                                        }`}
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
                                    className="w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-purple-600/20 hover:text-purple-300 text-white text-base flex items-center gap-2"
                                >
                                    <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
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
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-purple-600/20 hover:text-purple-300 text-white text-sm flex items-center gap-2 ${currentLang === 'en' ? 'text-purple-300' : ''}`}
                                >
                                    <GlobeIcon /> 🇺🇸 English
                                </button>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        switchLanguage('el');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition hover:bg-purple-600/20 hover:text-purple-300 text-white text-sm flex items-center gap-2 ${currentLang === 'el' ? 'text-purple-300' : ''}`}
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