'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    Trophy,
    Gamepad2,
    Gift,
    FileText,
    Menu,
    X,
    Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/players', label: 'Players', icon: UserCheck },
    { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/admin/matches', label: 'Matches', icon: Gamepad2 },
    { href: '/admin/rewards', label: 'Rewards', icon: Gift },
    { href: '/admin/logs', label: 'Logs', icon: FileText },
    { href: '/admin/odds-demo', label: 'Odds Demo', icon: Brain },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                    // Close sidebar on mobile after navigation
                                    if (window.innerWidth < 1024) {
                                        onClose();
                                    }
                                }}
                                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }
                `}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </>
    );
} 