'use client';

import { Button } from '@netprophet/ui';

// Icon component
const MenuIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

interface TopNavigationProps {
    userEmail?: string;
    onMenuClick: () => void;
    onSignOut: () => void;
}

export function TopNavigation({ userEmail, onMenuClick, onSignOut }: TopNavigationProps) {
    return (
        <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                    >
                        <MenuIcon />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
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