'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@netprophet/ui';
import { Wallet } from '@/components/matches/Wallet';


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
        <header className="w-full flex items-center justify-between px-4 py-3 sticky top-0 z-10 border-b border-[#23262F] bg-[#181A20] text-white">
            <div className="flex items-center gap-2">
                <button onClick={onMenuClick} className="text-accent text-2xl font-bold focus:outline-none md:hidden">☰</button>
                <Link
                    href="/"
                    className="text-xl font-extrabold tracking-tight text-accent hover:text-accent/80 transition-colors cursor-pointer px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                    NetProphet
                </Link>
            </div>
            {showNavigationTabs && (
                <nav className="flex-1 flex justify-center gap-4">
                    <button onClick={() => router.push('/matches')} className="px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white">Matches</button>
                    <button onClick={() => router.push('/matches/leaderboard')} className="px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white">Leaderboard</button>
                    <button onClick={() => router.push('/matches/rewards')} className="px-3 py-2 rounded-lg font-semibold transition hover:bg-accent/10 hover:text-accent text-white">Rewards</button>
                </nav>
            )}
            <div className="flex items-center gap-3">

                {/* Wallet Component */}
                <Wallet />

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
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 py-2 bg-[#23262F] text-white">
                            <button
                                className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80"
                                onClick={() => { setAccountDropdownOpen(false); router.push('/matches/my-profile'); }}
                            >
                                <UserIcon /> My Profile
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[#23262F]/80"
                                onClick={() => { setAccountDropdownOpen(false); router.push('/matches/my-picks'); }}
                            >
                                <LeaderboardIcon /> My Picks
                            </button>
                            <div className="border-t my-2 border-gray-700" />
                            <button
                                className="w-full text-left px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-[#23262F]/80"
                                onClick={() => { setAccountDropdownOpen(false); onSignOut(); }}
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
} 