'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Gift, Star, Target, TrendingUp, Users, Activity } from 'lucide-react';

// Demo data for rewards overview
const rewardsStats = {
    totalCoinPacks: 5,
    activeCoinPacks: 4,
    totalRevenue: 45000,
    monthlyRevenue: 8500,
    totalUsers: 8500,
    payingUsers: 1200,
    averageSpend: 37.50,
    conversionRate: 14.1
};

const recentActivity = [
    { type: 'purchase', user: 'pro_gamer_123', amount: 19.99, pack: 'Champion Pack', time: '2 hours ago' },
    { type: 'purchase', user: 'coin_collector', amount: 9.99, pack: 'Pro Pack', time: '4 hours ago' },
    { type: 'purchase', user: 'lucky_streak', amount: 4.99, pack: 'Basic Pack', time: '6 hours ago' },
    { type: 'bonus', user: 'daily_grinder', amount: 100, pack: 'Login Streak', time: '1 day ago' },
    { type: 'purchase', user: 'newcomer_2024', amount: 1.99, pack: 'Starter Pack', time: '1 day ago' }
];

export default function RewardsPage() {
    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Coin Packs</CardTitle>
                        <Coins className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{rewardsStats.activeCoinPacks}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+1</span> from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Monthly Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">€{rewardsStats.monthlyRevenue.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+12.5%</span> from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Paying Users</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{rewardsStats.payingUsers.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+5.2%</span> from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg. Spend</CardTitle>
                        <Activity className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">€{rewardsStats.averageSpend}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+2.1%</span> from last month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
                    <p className="text-sm text-gray-600">Latest coin pack purchases and bonus distributions</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${activity.type === 'purchase'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {activity.type === 'purchase' ? <Coins className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                                        <p className="text-xs text-gray-500">{activity.pack}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {activity.type === 'purchase' ? `€${activity.amount}` : `${activity.amount} coins`}
                                    </p>
                                    <p className="text-xs text-gray-500">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>


        </div>
    );
}
