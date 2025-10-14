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
import { ProfileSetupModal } from '@/components/ProfileSetupModal';
import { gradients, shadows, borders, transitions, animations, typography, cx } from '@/styles/design-system';

// Icon components
function ChevronDownIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [modalRefresh, setModalRefresh] = useState(0);
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const isDev = process.env.NODE_ENV === 'development';
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

    const handleTestProfileClick = async () => {
        if (!user) return;

        try {
            // Reset only the claim status, keep the user's name for automatic lookup
            await supabase
                .from('profiles')
                .update({
                    profile_claim_status: null,
                    claimed_player_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            console.log('🔄 Profile claim status reset - automatic lookup will run with existing name');

            // Force refresh the modal
            setModalRefresh(prev => prev + 1);
            setShowProfileModal(true);
        } catch (error) {
            console.error('Error resetting profile:', error);
            // Still open the modal even if reset fails
            setShowProfileModal(true);
        }
    };

    return (
        <div className="relative">
            <header
                className={cx(
                    "w-full flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-50 text-white",
                    shadows.card,
                    "border-b border-white/10"
                )}
                style={{ backgroundColor: '#121A39' }}
            >
                {/* Left Section - Logo and Menu */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <motion.button
                        ref={burgerButtonRef}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={cx(
                            "text-white focus:outline-none lg:hidden p-2 rounded",
                            transitions.default,
                            "hover:bg-purple-600/30 hover:text-purple-300"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Mobile menu"
                    >
                        <BurgerIcon isOpen={mobileMenuOpen} />
                    </motion.button>
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
                        <motion.button
                            onClick={() => router.push(`/${currentLang}/matches`)}
                            className={cx(
                                "px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 font-semibold text-xs xl:text-sm",
                                borders.rounded.sm,
                                transitions.default,
                                pathname === `/${currentLang}/matches` || pathname === `/${currentLang}`
                                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {dict?.navigation?.matches || 'Matches'}
                        </motion.button>
                        <motion.button
                            onClick={() => router.push(`/${currentLang}/leaderboard`)}
                            className={cx(
                                "px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 font-semibold text-xs xl:text-sm",
                                borders.rounded.sm,
                                transitions.default,
                                pathname === `/${currentLang}/leaderboard`
                                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {dict?.navigation?.leaderboard || 'Leaderboard'}
                        </motion.button>
                        <motion.button
                            onClick={() => router.push(`/${currentLang}/players`)}
                            className={cx(
                                "px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 font-semibold text-xs xl:text-sm",
                                borders.rounded.sm,
                                transitions.default,
                                pathname === `/${currentLang}/players`
                                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {dict?.navigation?.players || 'Players'}
                        </motion.button>
                        <motion.button
                            onClick={() => router.push(`/${currentLang}/results`)}
                            className={cx(
                                "px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 font-semibold text-xs xl:text-sm",
                                borders.rounded.sm,
                                transitions.default,
                                pathname === `/${currentLang}/results`
                                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {dict?.navigation?.results || 'Results'}
                        </motion.button>
                        <motion.button
                            onClick={() => router.push(`/${currentLang}/my-picks`)}
                            className={cx(
                                "px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 font-semibold text-xs xl:text-sm",
                                borders.rounded.sm,
                                transitions.default,
                                pathname === `/${currentLang}/my-picks`
                                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {dict?.navigation?.myPicks || 'My Picks'}
                        </motion.button>
                        <motion.button
                            onClick={() => router.push(`/${currentLang}/rewards`)}
                            className={cx(
                                "px-1.5 xl:px-2.5 py-0.5 xl:py-1.5 font-semibold text-xs xl:text-sm",
                                borders.rounded.sm,
                                transitions.default,
                                pathname === `/${currentLang}/rewards`
                                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-purple-600/20 hover:text-purple-300 text-white'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {dict?.navigation?.rewards || 'Rewards'}
                        </motion.button>
                    </nav>
                )}

                {/* Right Section - Wallet, Notifications, Language, Account */}
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                    {/* Dev Test Button - Profile Claim */}
                    {/* Hidden but kept for future use
                    {isDev && (
                        <button
                            onClick={handleTestProfileClick}
                            className="px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold transition bg-blue-500 hover:bg-blue-600 text-white focus:outline-none text-xs"
                            title="Test Profile Claim Flow (Resets Profile)"
                        >
                            Test Profile
                        </button>
                    )}
                    */}

                    {/* Wallet Component */}
                    <div className="block relative group z-[100]">
                        <div className={cx(
                            "absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100]",
                            "bg-slate-800/95 backdrop-blur-sm",
                            borders.rounded.sm,
                            transitions.default,
                            shadows.card
                        )}>
                            {dict?.navigation?.myWallet || 'My Wallet'}
                        </div>
                        <div className="flex items-center gap-1">
                            <Wallet dict={dict} lang={lang} />
                        </div>
                    </div>

                    {/* Notifications Component */}
                    <div className="block relative z-[100]">
                        <Notifications />
                    </div>

                    {/* Low Balance Info Icon - Hidden on mobile */}
                    {showInfoIcon && (
                        <motion.button
                            onClick={showLowBalanceNotification}
                            className={cx(
                                "relative w-8 h-8 sm:w-9 sm:h-9 items-center justify-center font-semibold text-white focus:outline-none hidden sm:flex",
                                borders.rounded.full,
                                transitions.default,
                                "hover:bg-purple-600/30 hover:text-purple-300"
                            )}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title={isCriticalBalance
                                ? 'Critical low balance - Click to view options'
                                : isVeryLowBalance
                                    ? 'Very low balance - Click to view options'
                                    : 'Low balance - Click to view options'
                            }
                        >
                            <InfoIcon />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        </motion.button>
                    )}

                    {/* Language Switcher - Hidden on mobile */}
                    <div className="relative hidden lg:block z-[90]" ref={languageDropdownRef}>
                        <motion.button
                            onClick={() => setLanguageDropdownOpen((open) => !open)}
                            className={cx(
                                "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 font-semibold text-white focus:outline-none text-sm sm:text-base",
                                borders.rounded.sm,
                                transitions.default,
                                "hover:bg-purple-600/30 hover:text-purple-300"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Language menu"
                        >
                            <GlobeIcon />
                            <span className="hidden sm:inline text-xs">{currentLang === 'en' ? 'EN' : 'EL'}</span>
                            <ChevronDownIcon />
                        </motion.button>
                        <AnimatePresence>
                            {languageDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className={cx(
                                        "absolute right-0 mt-2 w-32 sm:w-36 py-2 text-white z-[90]",
                                        "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
                                        "backdrop-blur-md border border-slate-700/50",
                                        borders.rounded.sm,
                                        shadows.cardHover
                                    )}>
                                    <motion.button
                                        className={cx(
                                            "w-full text-left px-4 py-2 flex items-center gap-2 text-xs",
                                            transitions.default,
                                            "hover:bg-purple-600/30 hover:text-purple-300",
                                            currentLang === 'en' ? 'text-purple-300 bg-purple-600/20' : ''
                                        )}
                                        onClick={() => switchLanguage('en')}
                                        whileHover={{ x: 4 }}
                                    >
                                        🇺🇸 English
                                    </motion.button>
                                    <motion.button
                                        className={cx(
                                            "w-full text-left px-4 py-2 flex items-center gap-2 text-xs",
                                            transitions.default,
                                            "hover:bg-purple-600/30 hover:text-purple-300",
                                            currentLang === 'el' ? 'text-purple-300 bg-purple-600/20' : ''
                                        )}
                                        onClick={() => switchLanguage('el')}
                                        whileHover={{ x: 4 }}
                                    >
                                        🇬🇷 Ελληνικά
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Account dropdown with power-up badge */}
                    <div className="relative z-[90]" ref={dropdownRef}>
                        <motion.button
                            onClick={() => setAccountDropdownOpen((open) => !open)}
                            className={cx(
                                "relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-bold text-base sm:text-lg focus:outline-none",
                                borders.rounded.full,
                                transitions.default,
                                (totalActivePowerUps > 0 || (wallet.hasTournamentPass && !wallet.tournamentPassUsed))
                                    ? cx(gradients.purple, shadows.glow.purple, 'ring-2 ring-purple-400/30')
                                    : cx(gradients.purple, 'shadow-sm shadow-purple-500/30')
                            )}
                            style={(totalActivePowerUps > 0 || (wallet.hasTournamentPass && !wallet.tournamentPassUsed)) ? {
                                animation: 'slowPulse 2s ease-in-out infinite'
                            } : {}}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Account menu"
                        >
                            {userEmail?.charAt(0).toUpperCase() || 'U'}

                            {/* Power-up Badge */}
                            {totalActivePowerUps > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/30 shadow-orange-400/60 ring-1 ring-orange-300/50">
                                    <PowerUpIcon />
                                </div>
                            )}

                            {/* Tournament Pass Badge */}
                            {!totalActivePowerUps && wallet.hasTournamentPass && !wallet.tournamentPassUsed && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/30 shadow-purple-400/60 ring-1 ring-purple-300/50">
                                    🎫
                                </div>
                            )}
                        </motion.button>
                        <AnimatePresence>
                            {accountDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className={cx(
                                        "absolute right-0 mt-2 w-48 sm:w-56 py-2 text-white z-[90]",
                                        "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
                                        "backdrop-blur-md border border-slate-700/50",
                                        borders.rounded.sm,
                                        shadows.cardHover
                                    )}>
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
                                                                        {userPowerUp.quantity > 1 && (
                                                                            <span className="text-gray-400 text-xs">
                                                                                {userPowerUp.quantity}x
                                                                            </span>
                                                                        )}
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

                                    {/* Tournament Pass section */}
                                    {wallet.hasTournamentPass && !wallet.tournamentPassUsed && (
                                        <>
                                            <div className="px-4 py-2 border-b border-slate-700/50">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                                                    <span className="text-lg">🎫</span>
                                                    <span>Tournament Pass</span>
                                                    <span className="ml-auto bg-purple-600/20 px-2 py-1 rounded-full text-xs">
                                                        Available
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-700/50 my-2" />
                                        </>
                                    )}

                                    <motion.button
                                        className={cx(
                                            "w-full text-left px-4 py-2 flex items-center gap-2 text-xs sm:text-sm",
                                            transitions.default,
                                            "hover:bg-purple-600/30 hover:text-purple-300"
                                        )}
                                        onClick={() => { setAccountDropdownOpen(false); router.push(`/${currentLang}/my-profile`); }}
                                        whileHover={{ x: 4 }}
                                    >
                                        <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
                                    </motion.button>
                                    <div className="border-t my-2 border-gray-700/50" />
                                    <motion.button
                                        className={cx(
                                            "w-full text-left px-4 py-2 flex items-center gap-2 text-red-400 text-xs sm:text-sm",
                                            transitions.default,
                                            "hover:bg-red-900/30 hover:text-red-300"
                                        )}
                                        onClick={() => { setAccountDropdownOpen(false); onSignOut(); }}
                                        whileHover={{ x: 4 }}
                                    >
                                        {dict?.auth?.signOut || 'Sign Out'}
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                        className={cx(
                            "lg:hidden absolute top-full left-0 right-0 z-[60] overflow-hidden",
                            "bg-gradient-to-br from-slate-950/98 via-slate-900/98 to-slate-950/98",
                            "backdrop-blur-md border-b border-slate-700/50",
                            shadows.cardHover
                        )}
                    >
                        <div className="px-4 py-3 space-y-3">
                            {/* Navigation Links */}
                            <div className="space-y-2">
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/matches`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-base",
                                        borders.rounded.sm,
                                        transitions.default,
                                        pathname === `/${currentLang}/matches` || pathname === `/${currentLang}`
                                            ? cx('bg-purple-600/40 text-purple-200 border border-purple-400/60', shadows.card)
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {dict?.navigation?.matches || 'Matches'}
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/leaderboard`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-base",
                                        borders.rounded.sm,
                                        transitions.default,
                                        pathname === `/${currentLang}/leaderboard`
                                            ? cx('bg-purple-600/40 text-purple-200 border border-purple-400/60', shadows.card)
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {dict?.navigation?.leaderboard || 'Leaderboard'}
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/players`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-base",
                                        borders.rounded.sm,
                                        transitions.default,
                                        pathname === `/${currentLang}/players`
                                            ? cx('bg-purple-600/40 text-purple-200 border border-purple-400/60', shadows.card)
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {dict?.navigation?.players || 'Players'}
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/results`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-base",
                                        borders.rounded.sm,
                                        transitions.default,
                                        pathname === `/${currentLang}/results`
                                            ? cx('bg-purple-600/40 text-purple-200 border border-purple-400/60', shadows.card)
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {dict?.navigation?.results || 'Results'}
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/my-picks`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-base",
                                        borders.rounded.sm,
                                        transitions.default,
                                        pathname === `/${currentLang}/my-picks`
                                            ? cx('bg-purple-600/40 text-purple-200 border border-purple-400/60', shadows.card)
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {dict?.navigation?.myPicks || 'My Picks'}
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/rewards`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-base",
                                        borders.rounded.sm,
                                        transitions.default,
                                        pathname === `/${currentLang}/rewards`
                                            ? cx('bg-purple-600/40 text-purple-200 border border-purple-400/60', shadows.card)
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {dict?.navigation?.rewards || 'Rewards'}
                                </motion.button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700/50 my-3"></div>

                            {/* Account Links */}
                            <div className="space-y-2">
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push(`/${currentLang}/my-profile`);
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-white text-base flex items-center gap-2",
                                        borders.rounded.sm,
                                        transitions.default,
                                        "hover:bg-purple-600/30 hover:text-purple-300"
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <UserIcon /> {dict?.navigation?.myProfile || 'My Profile'}
                                </motion.button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700/50 my-3"></div>

                            {/* Language Switcher - Mobile */}
                            <div className="space-y-2">
                                <div className={cx(typography.body.sm, "font-bold text-gray-400 uppercase tracking-wide px-3")}>
                                    Language
                                </div>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        switchLanguage('en');
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-sm flex items-center gap-2",
                                        borders.rounded.sm,
                                        transitions.default,
                                        currentLang === 'en'
                                            ? 'text-purple-300 bg-purple-600/30'
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <GlobeIcon /> 🇺🇸 English
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        switchLanguage('el');
                                    }}
                                    className={cx(
                                        "w-full text-left px-3 py-2 font-semibold text-sm flex items-center gap-2",
                                        borders.rounded.sm,
                                        transitions.default,
                                        currentLang === 'el'
                                            ? 'text-purple-300 bg-purple-600/30'
                                            : 'hover:bg-purple-600/30 hover:text-purple-300 text-white'
                                    )}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <GlobeIcon /> 🇬🇷 Ελληνικά
                                </motion.button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-700/50 my-3"></div>

                            {/* Sign Out */}
                            <motion.button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    onSignOut();
                                }}
                                className={cx(
                                    "w-full text-left px-3 py-2 font-semibold text-red-400 text-base",
                                    borders.rounded.sm,
                                    transitions.default,
                                    "hover:bg-red-900/30 hover:text-red-300"
                                )}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {dict?.auth?.signOut || 'Sign Out'}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Claim Modal - Dev Test */}
            {isDev && showProfileModal && (
                <ProfileSetupModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    forceRefresh={modalRefresh}
                />
            )}
        </div>
    );
} 