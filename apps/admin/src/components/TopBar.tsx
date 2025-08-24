'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

interface TopBarProps {
    userEmail?: string;
    onMenuClick: () => void;
    onSignOut: () => void;
}

export function TopBar({ userEmail, onMenuClick, onSignOut }: TopBarProps) {
    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left side - Menu button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Center - Logo and Page title (mobile only) */}
                <div className="flex-1 lg:flex-none flex items-center justify-center lg:justify-start">
                    <div className="lg:hidden flex items-center">
                        <Logo size="sm" showText={false} />
                        <h2 className="text-lg font-semibold text-gray-900 ml-2">
                            Admin Panel
                        </h2>
                    </div>
                </div>

                {/* Right side - User info and sign out */}
                <div className="flex items-center space-x-4">
                    <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{userEmail}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSignOut}
                        title="Sign out"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
} 