'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Users, Coins, DollarSign, Activity, Search, ArrowUpDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { supabase } from '@netprophet/lib';



export default function EconomyPage() {
    const [timeFilter, setTimeFilter] = useState('month');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [economyData, setEconomyData] = useState<any>(null);

    // Sorting and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<'username' | 'totalSpent' | 'lastSpend' | 'betsPlaced'>('totalSpent');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

    // Sorting and filtering functions
    const handleSort = (field: 'username' | 'totalSpent' | 'lastSpend' | 'betsPlaced') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getSortedAndFilteredUsers = () => {
        if (!economyData?.topUsers) return [];

        let filtered = economyData.topUsers.filter((user: any) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.status?.label.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.sort((a: any, b: any) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            // Handle date sorting
            if (sortField === 'lastSpend') {
                aValue = aValue ? new Date(aValue).getTime() : 0;
                bValue = bValue ? new Date(bValue).getTime() : 0;
            }

            // Handle string sorting
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    };

    const getSortIcon = (field: string) => {
        if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return sortDirection === 'asc'
            ? <TrendingUp className="ml-2 h-4 w-4" />
            : <TrendingDown className="ml-2 h-4 w-4" />;
    };

    // Fetch economy data
    useEffect(() => {
        const fetchEconomyData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get the current session token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    throw new Error('No authentication token available');
                }

                const response = await fetch(`/api/admin/economy-metrics?timePeriod=${timeFilter}`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to fetch economy data');
                }

                setEconomyData(result.data);
            } catch (err) {
                console.error('Error fetching economy data:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch economy data');
            } finally {
                setLoading(false);
            }
        };

        fetchEconomyData();
    }, [timeFilter]);

    // Show loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Economy Monitoring</h1>
                    <p className="text-gray-600 mt-2">
                        Live metrics of coin inflow, outflow and user monetization performance.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse space-y-4">
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Economy Monitoring</h1>
                    <p className="text-gray-600 mt-2">
                        Live metrics of coin inflow, outflow and user monetization performance.
                    </p>
                </div>
                <Card>
                    <CardContent className="p-12 text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Only use real data - no demo data fallback
    if (!economyData) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Economy Monitoring</h1>
                    <p className="text-gray-600 mt-2">
                        Live metrics of coin inflow, outflow and user monetization performance.
                    </p>
                </div>
                <Card>
                    <CardContent className="p-12 text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Economy Data</h3>
                        <p className="text-gray-600">Please wait while we fetch the latest metrics...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const data = economyData;

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
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">Total Coins Injected</CardTitle>
                            <Coins className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Coins added to the economy through purchases, bonuses, and admin actions
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.totalCoinsInjected)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {timeFilter === 'all' ? (
                                <span>All time total</span>
                            ) : (
                                <span className={data.trends.coinsInjectedChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {data.trends.coinsInjectedChange >= 0 ? "+" : ""}{data.trends.coinsInjectedChange.toFixed(1)}%
                                </span>
                            )}
                            {timeFilter !== 'all' && ` from last ${timeFilter}`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">Total Coins Burned</CardTitle>
                            <Activity className="h-4 w-4 text-red-600" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Coins removed from circulation through bets, shop purchases, and power-ups
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.totalCoinsBurned)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {timeFilter === 'all' ? (
                                <span>All time total</span>
                            ) : (
                                <span className={data.trends.coinsBurnedChange >= 0 ? "text-red-600" : "text-green-600"}>
                                    {data.trends.coinsBurnedChange >= 0 ? "+" : ""}{data.trends.coinsBurnedChange.toFixed(1)}%
                                </span>
                            )}
                            {timeFilter !== 'all' && ` from last ${timeFilter}`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Paying Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.payingUsers)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {timeFilter === 'all' ? (
                                <span>All time total</span>
                            ) : (
                                <span className={data.trends.payingUsersChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {data.trends.payingUsersChange >= 0 ? "+" : ""}{data.trends.payingUsersChange.toFixed(1)}%
                                </span>
                            )}
                            {timeFilter !== 'all' && ` from last ${timeFilter}`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg. Coins per User</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.averageCoinBalance)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {timeFilter === 'all' ? (
                                <span>All time total</span>
                            ) : (
                                <span className={data.trends.averageCoinsChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {data.trends.averageCoinsChange >= 0 ? "+" : ""}{data.trends.averageCoinsChange.toFixed(1)}%
                                </span>
                            )}
                            {timeFilter !== 'all' && ` from last ${timeFilter}`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.totalUsers)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            All registered users
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.activeUsers)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {timeFilter === 'all' ? (
                                <span>All time total</span>
                            ) : (
                                <span className={data.trends.activeUsersChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {data.trends.activeUsersChange >= 0 ? "+" : ""}{data.trends.activeUsersChange.toFixed(1)}%
                                </span>
                            )}
                            {timeFilter !== 'all' && ` from last 14 days`}
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
                            <LineChart data={data.charts.coinFlowData}>
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
                                    data={data.charts.inflowBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={false}
                                >
                                    {data.charts.inflowBreakdown.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [formatNumber(value), '']} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap gap-4 justify-center">
                            {data.charts.inflowBreakdown.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm text-gray-600">
                                        {entry.name} ({entry.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                            ))}
                        </div>
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
                            <div className="text-3xl font-bold text-gray-900">{data.summary.conversionRate.toFixed(1)}%</div>
                            <Badge variant="secondary" className={data.trends.payingUsersChange >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}>
                                {data.trends.payingUsersChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {data.trends.payingUsersChange >= 0 ? "+" : ""}{data.trends.payingUsersChange.toFixed(1)}%
                            </Badge>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.charts.conversionRateTrend}>
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
                            <div className="text-3xl font-bold text-gray-900">{data.summary.burnRatio.toFixed(1)}%</div>
                            <Badge variant="secondary" className={data.trends.coinsBurnedChange >= 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"}>
                                {data.trends.coinsBurnedChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {data.trends.coinsBurnedChange >= 0 ? "+" : ""}{data.trends.coinsBurnedChange.toFixed(1)}%
                            </Badge>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.charts.burnRatioTrend}>
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
                    <CardTitle className="text-lg font-semibold text-gray-900">Top Coin Spenders</CardTitle>
                    <p className="text-sm text-gray-600">Users who spent the most coins</p>
                </CardHeader>
                <CardContent>
                    {/* Status Legend */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Legend:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-purple-100 text-purple-800">Whale</Badge>
                                <span className="text-gray-600">10,000+ coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                                <span className="text-gray-600">5,000-9,999 coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-800">Regular</Badge>
                                <span className="text-gray-600">1,000-4,999 coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800">Casual</Badge>
                                <span className="text-gray-600">100-999 coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-gray-100 text-gray-800">New</Badge>
                                <span className="text-gray-600">&lt;100 coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-gray-100 text-gray-600">(Inactive)</Badge>
                                <span className="text-gray-600">No spend in 30+ days</span>
                            </div>
                        </div>
                    </div>

                    {/* Search and Results Count */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search users or status..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="text-sm text-gray-600">
                            {getSortedAndFilteredUsers().length} of {data.topUsers?.length || 0} users
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('username')}
                                        className="h-auto p-0 font-semibold hover:bg-transparent"
                                    >
                                        Username
                                        {getSortIcon('username')}
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('totalSpent')}
                                        className="h-auto p-0 font-semibold hover:bg-transparent"
                                    >
                                        Coins Spent
                                        {getSortIcon('totalSpent')}
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('lastSpend')}
                                        className="h-auto p-0 font-semibold hover:bg-transparent"
                                    >
                                        Last Spend
                                        {getSortIcon('lastSpend')}
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('betsPlaced')}
                                        className="h-auto p-0 font-semibold hover:bg-transparent"
                                    >
                                        Bets Placed
                                        {getSortIcon('betsPlaced')}
                                    </Button>
                                </TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getSortedAndFilteredUsers().length > 0 ? (
                                getSortedAndFilteredUsers().map((user: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{formatNumber(user.totalSpent)} coins</TableCell>
                                        <TableCell>{user.lastSpend ? new Date(user.lastSpend).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>{user.betsPlaced}</TableCell>
                                        <TableCell>
                                            <Badge className={user.status?.color || "bg-gray-100 text-gray-800"}>
                                                {user.status?.label || "Unknown"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        {searchTerm ? 'No users found matching your search.' : 'No users available.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
