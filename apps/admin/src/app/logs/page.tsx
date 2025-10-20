'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@netprophet/lib';
import { format } from 'date-fns';
import { count } from 'console';

type LogEntry = {
    id: string;
    type: 'transaction' | 'power_up' | 'daily_reward' | 'bet' | 'match_result';
    timestamp: string;
    user_id?: string;
    user_email?: string;
    description: string;
    amount?: number;
    status?: string;
    details?: any;
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<string>('7d');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 20;

    // Calculate statistics
    const stats = {
        total: totalCount,
        transactions: logs.filter(log => log.type === 'transaction').length,
        powerUps: logs.filter(log => log.type === 'power_up').length,
        dailyRewards: logs.filter(log => log.type === 'daily_reward').length,
        bets: logs.filter(log => log.type === 'bet').length,
        matchResults: logs.filter(log => log.type === 'match_result').length,
        totalAmount: logs.reduce((sum, log) => sum + (log.amount || 0), 0)
    };

    // State for total coins calculation
    const [totalCoins, setTotalCoins] = useState<number>(0);
    const [loadingCoins, setLoadingCoins] = useState<boolean>(false);

    // Cache for user emails and power-up names
    const [userEmailCache, setUserEmailCache] = useState<Map<string, string>>(new Map());
    const [powerUpNameCache, setPowerUpNameCache] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        setCurrentPage(1);
        setLogs([]);
        fetchLogs(true);
    }, [filter, dateRange]);

    useEffect(() => {
        // Fetch data whenever page changes (except for initial load)
        if (logs.length > 0) {
            fetchLogs(false);
        }
    }, [currentPage]);

    // Calculate total coins across all logs
    const calculateTotalCoins = async () => {
        setLoadingCoins(true);
        try {
            // Calculate date range
            const now = new Date();
            let startDate = new Date();
            switch (dateRange) {
                case '1d':
                    startDate.setDate(now.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(now.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(now.getDate() - 90);
                    break;
                default:
                    startDate.setDate(now.getDate() - 7);
            }

            // Get total amounts from all tables
            const [transactionsResult, betsResult, dailyRewardsResult] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('amount')
                    .gte('created_at', startDate.toISOString()),
                supabase
                    .from('bets')
                    .select('bet_amount')
                    .gte('created_at', startDate.toISOString()),
                supabase
                    .from('daily_rewards')
                    .select('reward_amount')
                    .gte('created_at', startDate.toISOString())
            ]);

            const transactionTotal = transactionsResult.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
            const betTotal = betsResult.data?.reduce((sum, bet) => sum + (bet.bet_amount || 0), 0) || 0;
            const rewardTotal = dailyRewardsResult.data?.reduce((sum, reward) => sum + (reward.reward_amount || 0), 0) || 0;

            setTotalCoins(transactionTotal + betTotal + rewardTotal);
        } catch (error) {
            console.error('Error calculating total coins:', error);
            setTotalCoins(0);
        } finally {
            setLoadingCoins(false);
        }
    };

    // Calculate total coins when filters change
    useEffect(() => {
        calculateTotalCoins();
    }, [filter, dateRange]);

    // Helper function to get user emails with caching
    const getUserEmails = async (userIds: string[]) => {
        const uncachedIds = userIds.filter(id => !userEmailCache.has(id));

        if (uncachedIds.length === 0) {
            return userEmailCache;
        }

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', uncachedIds);

        if (!error && profiles) {
            const newCache = new Map(userEmailCache);
            profiles.forEach(profile => {
                newCache.set(profile.id, profile.email);
            });
            setUserEmailCache(newCache);
            return newCache;
        }

        return userEmailCache;
    };

    // Helper function to get power-up names with caching
    const getPowerUpNames = async (powerUpIds: string[]) => {
        const uncachedIds = powerUpIds.filter(id => !powerUpNameCache.has(id));

        if (uncachedIds.length === 0) {
            return powerUpNameCache;
        }

        const { data: powerUps, error } = await supabase
            .from('power_ups')
            .select('power_up_id, name')
            .in('power_up_id', uncachedIds);

        if (!error && powerUps) {
            const newCache = new Map(powerUpNameCache);
            powerUps.forEach(powerUp => {
                newCache.set(powerUp.power_up_id, powerUp.name);
            });
            setPowerUpNameCache(newCache);
            return newCache;
        }

        return powerUpNameCache;
    };

    const fetchLogs = async (reset: boolean = true) => {
        if (reset) {
            setLoading(true);
            setError(null);
            setLogs([]);
            setCurrentPage(1);
        } else {
            setLoadingMore(true);
        }

        const newLogs: LogEntry[] = [];
        const offset = reset ? 0 : (currentPage - 1) * PAGE_SIZE;
        let totalCount = 0;
        let hasData = false;

        try {
            // Calculate date range
            const now = new Date();
            let startDate = new Date();
            switch (dateRange) {
                case '1d':
                    startDate.setDate(now.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(now.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(now.getDate() - 90);
                    break;
                default:
                    startDate.setDate(now.getDate() - 7);
            }

            // For "all" filter, we need to get total counts from all tables
            if (reset && filter === 'all') {
                const totalCounts = await Promise.all([
                    supabase.from('transactions').select('*', { count: 'exact', head: true })
                        .gte('created_at', startDate.toISOString()),
                    supabase.from('power_up_usage_log').select('*', { count: 'exact', head: true })
                        .gte('created_at', startDate.toISOString()),
                    supabase.from('daily_rewards').select('*', { count: 'exact', head: true })
                        .gte('created_at', startDate.toISOString()),
                    supabase.from('bets').select('*', { count: 'exact', head: true })
                        .gte('created_at', startDate.toISOString()),
                    supabase.from('match_results').select('*', { count: 'exact', head: true })
                        .gte('created_at', startDate.toISOString())
                ]);

                totalCount = totalCounts.reduce((sum, result) => sum + (result.count || 0), 0);
            }

            // Fetch transactions
            if (filter === 'all' || filter === 'transaction') {
                const { data: transactions, error: txError, count } = await supabase
                    .from('transactions')
                    .select('*', { count: 'exact' })
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (txError) {
                    console.error('Error fetching transactions:', txError);
                } else if (transactions) {
                    if (reset && filter !== 'all') {
                        totalCount = count || 0;
                    }
                    hasData = true;
                    // Get unique user IDs to fetch emails with caching
                    const userIds = [...new Set(transactions.map(tx => tx.user_id))];
                    const emailMap = await getUserEmails(userIds);

                    transactions.forEach(tx => {
                        newLogs.push({
                            id: tx.id,
                            type: 'transaction',
                            timestamp: tx.created_at || '',
                            user_id: tx.user_id,
                            user_email: emailMap.get(tx.user_id),
                            description: `${tx.type}: ${tx.description || 'No description'}`,
                            amount: tx.amount,
                            details: tx
                        });
                    });
                }
            }

            // Fetch power-up usage logs
            if (filter === 'all' || filter === 'power_up') {
                const { data: powerUpLogs, error: puError, count } = await supabase
                    .from('power_up_usage_log')
                    .select('*', { count: 'exact' })
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (puError) {
                    console.error('Error fetching power-up logs:', puError);
                } else if (powerUpLogs) {
                    if (reset && filter !== 'all') {
                        totalCount = count || 0;
                    }
                    hasData = true;
                    // Get unique user IDs and power-up IDs with caching
                    const userIds = [...new Set(powerUpLogs.map(log => log.user_id))];
                    const powerUpIds = [...new Set(powerUpLogs.map(log => log.power_up_id))];

                    const [emailMap, powerUpMap] = await Promise.all([
                        getUserEmails(userIds),
                        getPowerUpNames(powerUpIds)
                    ]);

                    powerUpLogs.forEach(log => {
                        newLogs.push({
                            id: log.id,
                            type: 'power_up',
                            timestamp: log.created_at || '',
                            user_id: log.user_id,
                            user_email: emailMap.get(log.user_id),
                            description: `Used power-up: ${powerUpMap.get(log.power_up_id) || log.power_up_id}`,
                            details: log
                        });
                    });
                }
            }

            // Fetch daily rewards
            if (filter === 'all' || filter === 'daily_reward') {
                const { data: dailyRewards, error: drError, count } = await supabase
                    .from('daily_rewards')
                    .select('*', { count: 'exact' })
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (drError) {
                    console.error('Error fetching daily rewards:', drError);
                } else if (dailyRewards) {
                    if (reset && filter !== 'all') {
                        totalCount = count || 0;
                    }
                    hasData = true;
                    // Get unique user IDs to fetch emails with caching
                    const userIds = [...new Set(dailyRewards.map(reward => reward.user_id))];
                    const emailMap = await getUserEmails(userIds);

                    dailyRewards.forEach(reward => {
                        newLogs.push({
                            id: reward.id,
                            type: 'daily_reward',
                            timestamp: reward.created_at || '',
                            user_id: reward.user_id,
                            user_email: emailMap.get(reward.user_id),
                            description: `Daily reward claimed (streak: ${reward.streak_count})`,
                            amount: reward.reward_amount,
                            details: reward
                        });
                    });
                }
            }

            // Fetch recent bets
            if (filter === 'all' || filter === 'bet') {
                const { data: bets, error: betError, count } = await supabase
                    .from('bets')
                    .select('*', { count: 'exact' })
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (betError) {
                    console.error('Error fetching bets:', betError);
                } else if (bets) {
                    if (reset && filter !== 'all') {
                        totalCount = count || 0;
                    }
                    hasData = true;
                    // Get unique user IDs to fetch emails with caching
                    const userIds = [...new Set(bets.map(bet => bet.user_id))];
                    const emailMap = await getUserEmails(userIds);

                    bets.forEach(bet => {
                        newLogs.push({
                            id: bet.id,
                            type: 'bet',
                            timestamp: bet.created_at,
                            user_id: bet.user_id,
                            user_email: emailMap.get(bet.user_id),
                            description: `Bet placed: ${bet.description || 'No description'}`,
                            amount: bet.bet_amount,
                            status: bet.status,
                            details: bet
                        });
                    });
                }
            }

            // Fetch match results
            if (filter === 'all' || filter === 'match_result') {
                const { data: matchResults, error: mrError, count } = await supabase
                    .from('match_results')
                    .select('*', { count: 'exact' })
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (mrError) {
                    console.error('Error fetching match results:', mrError);
                } else if (matchResults) {
                    if (reset && filter !== 'all') {
                        totalCount = count || 0;
                    }
                    hasData = true;
                    // Get unique user IDs to fetch emails with caching
                    const userIds = [...new Set(matchResults.map(result => result.created_by).filter(Boolean))];
                    const emailMap = await getUserEmails(userIds);

                    matchResults.forEach(result => {
                        newLogs.push({
                            id: result.id,
                            type: 'match_result',
                            timestamp: result.created_at || '',
                            user_id: result.created_by,
                            user_email: emailMap.get(result.created_by),
                            description: `Match result recorded: ${result.match_result}`,
                            status: result.match_result,
                            details: result
                        });
                    });
                }
            }

            // Sort all logs by timestamp
            newLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Update logs state
            if (reset) {
                setLogs(newLogs);
                setTotalCount(totalCount);
                setHasMore(newLogs.length === PAGE_SIZE);
            } else {
                // For traditional pagination, replace logs instead of appending
                setLogs(newLogs);
                setHasMore(newLogs.length === PAGE_SIZE);
            }

            // If we're on a page that doesn't exist, go back to page 1
            const maxPage = Math.ceil(totalCount / PAGE_SIZE);
            if (currentPage > maxPage && maxPage > 0) {
                setCurrentPage(1);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            setError('Failed to fetch logs. Please try again.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const getTypeBadge = (type: string) => {
        const colors = {
            transaction: 'bg-blue-100 text-blue-800',
            power_up: 'bg-purple-100 text-purple-800',
            daily_reward: 'bg-green-100 text-green-800',
            bet: 'bg-orange-100 text-orange-800',
            match_result: 'bg-red-100 text-red-800'
        };
        return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const getAmountColor = (amount?: number) => {
        if (!amount) return 'text-gray-600';
        return amount > 0 ? 'text-green-600' : 'text-red-600';
    };

    const filteredLogs = logs.filter(log => {
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                log.description.toLowerCase().includes(searchLower) ||
                log.user_email?.toLowerCase().includes(searchLower) ||
                log.status?.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    const exportLogs = () => {
        const csvContent = [
            ['Type', 'Timestamp', 'User Email', 'User ID', 'Description', 'Amount', 'Status'],
            ...filteredLogs.map(log => [
                log.type,
                log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
                log.user_email || '',
                log.user_id || '',
                log.description,
                log.amount?.toString() || '',
                log.status || ''
            ])
        ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
                <p className="text-gray-600 mt-2">
                    View system activity and user actions
                </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total Logs</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.transactions}</div>
                        <div className="text-sm text-gray-600">Transactions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">{stats.powerUps}</div>
                        <div className="text-sm text-gray-600">Power-ups</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-orange-600">{stats.bets}</div>
                        <div className="text-sm text-gray-600">Bets</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-red-600">{stats.matchResults}</div>
                        <div className="text-sm text-gray-600">Match Results</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-emerald-600">{stats.dailyRewards}</div>
                        <div className="text-sm text-gray-600">Daily Rewards</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-indigo-600">
                            {loadingCoins ? (
                                <span className="text-sm">Loading...</span>
                            ) : (
                                totalCoins.toLocaleString()
                            )}
                        </div>
                        <div className="text-sm text-gray-600">Total Coins</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search
                            </label>
                            <Input
                                placeholder="Search logs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-[150px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="transaction">Transactions</SelectItem>
                                    <SelectItem value="power_up">Power-ups</SelectItem>
                                    <SelectItem value="daily_reward">Daily Rewards</SelectItem>
                                    <SelectItem value="bet">Bets</SelectItem>
                                    <SelectItem value="match_result">Match Results</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[150px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Time Range
                            </label>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1d">Last 24 hours</SelectItem>
                                    <SelectItem value="7d">Last 7 days</SelectItem>
                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                    <SelectItem value="90d">Last 90 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={() => fetchLogs(true)} disabled={loading}>
                                {loading ? 'Loading...' : 'Refresh'}
                            </Button>
                            <Button
                                onClick={exportLogs}
                                disabled={filteredLogs.length === 0}
                                variant="outline"
                            >
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Activity Logs ({filteredLogs.length} entries)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-red-800">{error}</div>
                        </div>
                    )}
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="text-gray-500">Loading logs...</div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-500">No logs found for the selected criteria</div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex items-center space-x-4">
                                        <Badge className={getTypeBadge(log.type)}>
                                            {log.type.replace('_', ' ')}
                                        </Badge>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {log.description}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {log.user_email && `by ${log.user_email}`}
                                                {log.user_id && (
                                                    <div className="text-xs text-gray-400 font-mono">
                                                        ID: {log.user_id}
                                                    </div>
                                                )}
                                                {log.user_email && log.timestamp && ' • '}
                                                {log.timestamp && format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {log.amount !== undefined && (
                                            <span className={`font-medium ${getAmountColor(log.amount)}`}>
                                                {log.amount > 0 ? '+' : ''}{log.amount}
                                            </span>
                                        )}
                                        {log.status && (
                                            <Badge variant="outline" className="text-xs">
                                                {log.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            <div className="mt-6 flex items-center justify-between">
                                {/* Pagination Info */}
                                <div className="text-sm text-gray-500">
                                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} entries
                                </div>

                                {/* Pagination Buttons */}
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1 || loading}
                                    >
                                        First
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1 || loading}
                                    >
                                        Previous
                                    </Button>

                                    {/* Page Numbers */}
                                    <div className="flex items-center space-x-1">
                                        {(() => {
                                            const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                                            const startPage = Math.max(1, currentPage - 2);
                                            const endPage = Math.min(totalPages, startPage + 4);
                                            const pages = [];

                                            for (let i = startPage; i <= endPage; i++) {
                                                pages.push(i);
                                            }

                                            return pages.map(pageNum => (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    disabled={loading}
                                                    className="w-8 h-8 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            ));
                                        })()}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || loading || !hasMore}
                                    >
                                        Next
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.ceil(totalCount / PAGE_SIZE))}
                                        disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || loading}
                                    >
                                        Last
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 