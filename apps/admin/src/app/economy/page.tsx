'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Users, Coins, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// Demo data
const demoEconomyStats = {
    totalCoinsInjected: 3700000,
    totalCoinsBurned: 3200000,
    payingUsers: 1200,
    averageCoinBalance: 850,
    totalUsers: 8500,
    conversionRate: 14.1,
    burnRatio: 86.5,
};

const demoCoinFlowData = [
    { date: '2024-01-01', inflow: 45000, outflow: 38000 },
    { date: '2024-01-02', inflow: 52000, outflow: 41000 },
    { date: '2024-01-03', inflow: 38000, outflow: 35000 },
    { date: '2024-01-04', inflow: 61000, outflow: 48000 },
    { date: '2024-01-05', inflow: 49000, outflow: 42000 },
    { date: '2024-01-06', inflow: 55000, outflow: 39000 },
    { date: '2024-01-07', inflow: 67000, outflow: 52000 },
    { date: '2024-01-08', inflow: 43000, outflow: 36000 },
    { date: '2024-01-09', inflow: 58000, outflow: 44000 },
    { date: '2024-01-10', inflow: 51000, outflow: 38000 },
];

const demoInflowBreakdown = [
    { name: 'Top-Ups', value: 2800000, color: '#10b981' },
    { name: 'Bonuses', value: 650000, color: '#f59e0b' },
    { name: 'Admin', value: 250000, color: '#3b82f6' },
];

const demoOutflowBreakdown = [
    { name: 'Bets', value: 2200000, color: '#ef4444' },
    { name: 'Shop', value: 750000, color: '#8b5cf6' },
    { name: 'Power-Ups', value: 250000, color: '#06b6d4' },
];

const demoTopUsers = [
    { username: 'pro_gamer_123', totalSpent: 45000, lastTopUp: '2024-01-08', betsPlaced: 156 },
    { username: 'coin_collector', totalSpent: 38000, lastTopUp: '2024-01-09', betsPlaced: 89 },
    { username: 'lucky_streak', totalSpent: 32000, lastTopUp: '2024-01-07', betsPlaced: 234 },
    { username: 'high_roller', totalSpent: 29000, lastTopUp: '2024-01-10', betsPlaced: 67 },
    { username: 'casual_player', totalSpent: 25000, lastTopUp: '2024-01-06', betsPlaced: 123 },
    { username: 'weekend_warrior', totalSpent: 22000, lastTopUp: '2024-01-05', betsPlaced: 78 },
    { username: 'daily_grinder', totalSpent: 19000, lastTopUp: '2024-01-04', betsPlaced: 345 },
    { username: 'newcomer_2024', totalSpent: 16000, lastTopUp: '2024-01-03', betsPlaced: 45 },
    { username: 'veteran_player', totalSpent: 14000, lastTopUp: '2024-01-02', betsPlaced: 567 },
    { username: 'occasional_better', totalSpent: 12000, lastTopUp: '2024-01-01', betsPlaced: 23 },
];

const demoConversionTrend = [
    { month: 'Oct', rate: 12.5 },
    { month: 'Nov', rate: 13.2 },
    { month: 'Dec', rate: 13.8 },
    { month: 'Jan', rate: 14.1 },
];

const demoBurnRatioTrend = [
    { month: 'Oct', ratio: 82.3 },
    { month: 'Nov', ratio: 84.1 },
    { month: 'Dec', ratio: 85.7 },
    { month: 'Jan', ratio: 86.5 },
];

export default function EconomyPage() {
    const [timeFilter, setTimeFilter] = useState('month');

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    };

    const formatCurrency = (num: number) => {
        return '€' + (num / 100).toFixed(2);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Economy Monitoring</h1>
                <p className="text-gray-600 mt-2">
                    Live metrics of coin inflow, outflow and user monetization performance.
                </p>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Time Period:</span>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Coins Injected</CardTitle>
                        <Coins className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(demoEconomyStats.totalCoinsInjected)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+12.5%</span> from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Coins Burned</CardTitle>
                        <Activity className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(demoEconomyStats.totalCoinsBurned)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-red-600">+8.3%</span> from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Paying Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(demoEconomyStats.payingUsers)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+5.2%</span> from last month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg. Coins per User</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(demoEconomyStats.averageCoinBalance)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-green-600">+2.1%</span> from last month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart - Coin Flow Over Time */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900">Coin Flow Over Time</CardTitle>
                        <p className="text-sm text-gray-600">Daily inflow vs outflow trends</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={demoCoinFlowData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis tickFormatter={formatNumber} />
                                <Tooltip
                                    formatter={(value: any) => [formatNumber(value), '']}
                                    labelFormatter={(label: any) => new Date(label).toLocaleDateString()}
                                />
                                <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} name="Inflow" />
                                <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} name="Outflow" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pie Chart - Coin Inflow Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900">Coin Inflow Breakdown</CardTitle>
                        <p className="text-sm text-gray-600">Distribution of coin sources</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={demoInflowBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={false}
                                >
                                    {demoInflowBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [formatNumber(value), '']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Rate Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900">Conversion Rate</CardTitle>
                        <p className="text-sm text-gray-600">Paying users / Total users</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-3xl font-bold text-gray-900">{demoEconomyStats.conversionRate}%</div>
                            <Badge variant="secondary" className="text-green-600 bg-green-50">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +2.3%
                            </Badge>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={demoConversionTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => [`${value}%`, 'Conversion Rate']} />
                                <Bar dataKey="rate" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Coin Burn Ratio Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900">Coin Burn Ratio</CardTitle>
                        <p className="text-sm text-gray-600">Burned / Injected coins ratio</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-3xl font-bold text-gray-900">{demoEconomyStats.burnRatio}%</div>
                            <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +1.2%
                            </Badge>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={demoBurnRatioTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => [`${value}%`, 'Burn Ratio']} />
                                <Bar dataKey="ratio" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Top Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Top Users by Coin Spend</CardTitle>
                    <p className="text-sm text-gray-600">Users with highest coin purchases</p>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Total Spent</TableHead>
                                <TableHead>Last Top-Up</TableHead>
                                <TableHead>Bets Placed</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {demoTopUsers.map((user, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{formatNumber(user.totalSpent)} coins</TableCell>
                                    <TableCell>{new Date(user.lastTopUp).toLocaleDateString()}</TableCell>
                                    <TableCell>{user.betsPlaced}</TableCell>
                                    <TableCell>
                                        <Badge variant={index < 3 ? "default" : "secondary"}>
                                            {index < 3 ? "VIP" : "Active"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
