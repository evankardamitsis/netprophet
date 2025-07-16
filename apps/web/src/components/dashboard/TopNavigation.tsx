'use client';

import { Button } from '@netprophet/ui';

// Icon components
const MenuIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const DashboardIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
    </svg>
);

const LeaderboardIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

interface TopNavigationProps {
    userEmail?: string;
    onMenuClick: () => void;
    onSignOut: () => void;
    currentPage?: 'dashboard' | 'leaderboard';
    onPageChange?: (page: 'dashboard' | 'leaderboard') => void;
}

export function TopNavigation({
    userEmail,
    onMenuClick,
    onSignOut,
    currentPage = 'dashboard',
    onPageChange
}: TopNavigationProps) {
    return (
        <div className="bg-white/80 backdrop-blur-md border-b border-white/20">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                    >
                        <MenuIcon />
                    </button>

                    {/* Navigation Tabs */}
                    <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                        <Button
                            variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onPageChange?.('dashboard')}
                            className="flex items-center space-x-2 text-xs"
                        >
                            <DashboardIcon />
                            <span>Dashboard</span>
                        </Button>
                        <Button
                            variant={currentPage === 'leaderboard' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onPageChange?.('leaderboard')}
                            className="flex items-center space-x-2 text-xs"
                        >
                            <LeaderboardIcon />
                            <span>Leaderboard</span>
                        </Button>
                    </div>

                    {/* Mobile Page Title */}
                    <h1 className="md:hidden text-xl font-semibold text-gray-900">
                        {currentPage === 'dashboard' ? 'Dashboard' : 'Leaderboard'}
                    </h1>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600 hidden sm:block">
                        Welcome, {userEmail}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSignOut}
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
} 