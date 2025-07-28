'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@netprophet/ui';
import { useTheme } from '../Providers';
import { Wallet } from './Wallet';

// Icon components
function MenuIcon() {
    return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
}

function DashboardIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
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

function ChevronDownIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
}

function SunIcon() {
    return <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><path stroke="currentColor" strokeWidth="2" d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 6.95l-1.414-1.414M6.464 6.464L5.05 5.05m12.02 0l-1.414 1.414M6.464 17.536l-1.414 1.414" /></svg>;
}
function MoonIcon() {
    return <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>;
}

interface TopNavigationProps {
    userEmail?: string;
    onMenuClick: () => void;
    onSignOut: () => void;
    // Removed currentPage and onPageChange, not needed for direct routing
    showNavigationTabs?: boolean;
}

export function TopNavigation({
    userEmail,
    onMenuClick,
    onSignOut,
    showNavigationTabs = true
}: TopNavigationProps) {
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useTheme();

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

    return (
        <header className={`w-full flex items-center justify-between px-4 py-3 sticky top-0 z-10 ${theme === 'dark' ? 'border-b border-[#23262F] bg-[#181A20] text-white' : 'border-b border-gray-200 bg-white text-black'}`}>
            <div className="flex items-center gap-2">
                <button onClick={onMenuClick} className="text-accent text-2xl font-bold focus:outline-none md:hidden">☰</button>
                <span className="text-xl font-extrabold tracking-tight text-accent">NetProphet</span>
            </div>
            {showNavigationTabs && (
                <nav className="flex-1 flex justify-center gap-4">
                    <button onClick={() => router.push('/dashboard')} className={`px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Dashboard</button>
                    <button onClick={() => router.push('/dashboard/leaderboard')} className={`px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Leaderboard</button>
                    <button onClick={() => router.push('/dashboard/rewards')} className={`px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Rewards</button>
                </nav>
            )}
            <div className="flex items-center gap-3">

                {/* Wallet Component */}
                <Wallet />

                {/* Account dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setAccountDropdownOpen((open) => !open)}
                        className={`w-9 h-9 rounded-full bg-accent flex items-center justify-center font-bold text-lg focus:outline-none ${theme === 'dark' ? '' : 'text-black'}`}
                        aria-label="Account menu"
                    >
                        U
                        <ChevronDownIcon />
                    </button>
                    {accountDropdownOpen && (
                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 py-2 ${theme === 'dark' ? 'bg-[#23262F] text-white' : 'bg-white text-black'}`}>
                            <button
                                className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-[#23262F]/80' : ''}`}
                                onClick={() => { setAccountDropdownOpen(false); router.push('/dashboard/my-profile'); }}
                            >
                                <UserIcon /> My Profile
                            </button>
                            <button
                                className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-[#23262F]/80' : ''}`}
                                onClick={() => { setAccountDropdownOpen(false); router.push('/dashboard/my-picks'); }}
                            >
                                <LeaderboardIcon /> My Picks
                            </button>
                            <div className={`border-t my-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />
                            <button
                                className={`w-full text-left px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-[#23262F]/80' : ''}`}
                                onClick={() => { setAccountDropdownOpen(false); onSignOut(); }}
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
                {/* Theme switch */}
                <button
                    onClick={toggleTheme}
                    className={`rounded-full p-2 transition ${theme === 'dark' ? 'bg-[#23262F] hover:bg-accent/20' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
                    aria-label="Toggle dark/light mode"
                >
                    {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </header>
    );
} 