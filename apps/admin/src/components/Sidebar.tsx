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
    Brain,
    DollarSign,
    Award,
    TrendingUp,
    Calculator,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MenuItem {
    href: string;
    label: string;
    icon: any;
    children?: MenuItem[];
}

const menuItems: MenuItem[] = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/players', label: 'Players', icon: UserCheck },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/match-results', label: 'Match Results', icon: Award },
    { href: '/bets', label: 'Bets', icon: DollarSign },
    {
        href: '/rewards',
        label: 'Rewards',
        icon: Gift,
        children: [
            { href: '/rewards', label: 'Overview', icon: Gift },
            { href: '/rewards/coin-packs', label: 'Coin Packs', icon: DollarSign },
            { href: '/rewards/daily-rewards', label: 'Daily Rewards', icon: Award },
            { href: '/rewards/achievements', label: 'Achievements', icon: Trophy },
            { href: '/rewards/leaderboards', label: 'Leaderboards', icon: TrendingUp },
            { href: '/rewards/settings', label: 'Settings', icon: Calculator }
        ]
    },
    {
        href: '/economy',
        label: 'Economy',
        icon: TrendingUp,
        children: [
            { href: '/economy', label: 'Monitoring', icon: TrendingUp },
            { href: '/economy/calculator', label: 'Calculator', icon: Calculator }
        ]
    },
    { href: '/logs', label: 'Logs', icon: FileText },
    { href: '/odds-demo', label: 'Odds Demo', icon: Brain }
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleExpanded = (href: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(href)) {
            newExpanded.delete(href);
        } else {
            newExpanded.add(href);
        }
        setExpandedItems(newExpanded);
    };

    const isActive = (href: string) => pathname === href;

    const isParentActive = (href: string) => {
        // For parent items with children, only show as active if exactly on that path
        // and not on any child path
        return pathname === href;
    };

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
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <div className="hidden lg:flex items-center">
                            <Logo size="sm" showText={false} />
                            <span className="text-xl font-bold text-gray-900 ml-2">Admin Panel</span>
                        </div>
                    </Link>
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
                        const hasChildren = item.children && item.children.length > 0;
                        const itemIsActive = hasChildren ? isParentActive(item.href) : isActive(item.href);
                        const isExpanded = expandedItems.has(item.href);

                        return (
                            <div key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                        ${itemIsActive
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }
                                    `}
                                    onClick={() => {
                                        if (hasChildren) {
                                            toggleExpanded(item.href);
                                        }
                                        // Close sidebar on mobile after navigation
                                        if (window.innerWidth < 1024) {
                                            onClose();
                                        }
                                    }}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </div>
                                    {hasChildren && (
                                        isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                                    )}
                                </Link>

                                {hasChildren && isExpanded && (
                                    <div className="ml-6 mt-2 space-y-1">
                                        {item.children!.map((child) => {
                                            const ChildIcon = child.icon;
                                            const childIsActive = isActive(child.href);

                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => {
                                                        // Close sidebar on mobile after navigation
                                                        if (window.innerWidth < 1024) {
                                                            onClose();
                                                        }
                                                    }}
                                                    className={`
                                                        flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                                        ${childIsActive
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                        }
                                                    `}
                                                >
                                                    <ChildIcon className="h-4 w-4" />
                                                    <span>{child.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
        </>
    );
} 