'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Gift, Star, Target, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface RewardsMenuItem {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const rewardsMenuItems: RewardsMenuItem[] = [
    {
        id: 'coin-packs',
        title: 'Coin Pack Management',
        description: 'Manage coin packages, pricing, and bonuses',
        icon: <Coins className="h-5 w-5" />,
        href: '/rewards/coin-packs',
        badge: 'Active',
        badgeVariant: 'default'
    },
    {
        id: 'daily-rewards',
        title: 'Daily Rewards',
        description: 'Configure login streaks and daily bonuses',
        icon: <Gift className="h-5 w-5" />,
        href: '/rewards/daily-rewards',
        badge: 'Coming Soon',
        badgeVariant: 'secondary'
    },
    {
        id: 'achievements',
        title: 'Achievements',
        description: 'Set up achievement systems and rewards',
        icon: <Star className="h-5 w-5" />,
        href: '/rewards/achievements',
        badge: 'Coming Soon',
        badgeVariant: 'secondary'
    },
    {
        id: 'leaderboards',
        title: 'Leaderboard Rewards',
        description: 'Configure weekly and monthly leaderboard prizes',
        icon: <Target className="h-5 w-5" />,
        href: '/rewards/leaderboards',
        badge: 'Coming Soon',
        badgeVariant: 'secondary'
    },
    {
        id: 'settings',
        title: 'Reward Settings',
        description: 'Global reward configuration and policies',
        icon: <Settings className="h-5 w-5" />,
        href: '/rewards/settings',
        badge: 'Coming Soon',
        badgeVariant: 'secondary'
    }
];

export default function RewardsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isOverviewPage = pathname === '/rewards';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Rewards Management</h1>
                <p className="text-gray-600 mt-2">
                    Configure and manage all reward systems, coin packs, and user incentives.
                </p>
            </div>

            {/* Navigation Menu - Only show on overview page */}
            {isOverviewPage && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardsMenuItems.map((item) => {
                        const isActive = item.href === pathname;

                        return (
                            <Link key={item.id} href={item.href}>
                                <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isActive
                                    ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                                    : 'hover:bg-gray-50'
                                    }`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.icon}
                                            </div>
                                            {item.badge && (
                                                <Badge variant={item.badgeVariant} className="text-xs">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className={`text-lg ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {item.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className={`text-sm ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                                            {item.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Content Area */}
            <div className={isOverviewPage ? 'mt-8' : ''}>
                {children}
            </div>
        </div>
    );
}
