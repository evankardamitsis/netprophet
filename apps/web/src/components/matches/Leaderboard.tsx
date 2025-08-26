'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';
import { LeaderboardService, LeaderboardEntry } from '@netprophet/lib';

interface LeaderboardProps {
    className?: string;
    sidebarOpen?: boolean;
}

export function Leaderboard({ className, sidebarOpen = true }: LeaderboardProps) {
    const { dict } = useDictionary();
    const [timeFrame, setTimeFrame] = useState<'weekly' | 'allTime'>('weekly');
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        totalParticipants: number;
        topScore: number;
        bestStreak: number;
        averageAccuracy: number;
    } | null>(null);

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [data, summaryData] = await Promise.all([
                    timeFrame === 'weekly'
                        ? LeaderboardService.getWeeklyLeaderboard(50)
                        : LeaderboardService.getAllTimeLeaderboard(50),
                    LeaderboardService.getLeaderboardSummary(timeFrame)
                ]);

                setLeaderboardData(data);
                setSummary(summaryData);
            } catch (err) {
                console.error('Error fetching leaderboard data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [timeFrame]);

    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1:
                return <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">🥇</Badge>;
            case 2:
                return <Badge variant="default" className="bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0">🥈</Badge>;
            case 3:
                return <Badge variant="default" className="bg-gradient-to-r from-orange-400 to-orange-600 text-white border-0">🥉</Badge>;
            default:
                return <Badge variant="secondary" className="bg-slate-600 text-white">#{rank}</Badge>;
        }
    };

    const getStreakDisplay = (streak: number) => {
        if (streak === 0) return <span className="text-gray-400">-</span>;

        const multiplier = streak >= 5 ? `x${Math.floor(streak / 5) + 1}` : '';
        const fireCount = Math.min(Math.floor(streak / 3), 3); // Max 3 fires
        const fires = '🔥'.repeat(fireCount);

        return (
            <div className="flex items-center justify-center space-x-1 min-w-0">
                <span className="text-orange-500 text-sm">{fires}</span>
                <span className="font-semibold text-orange-600">{streak}</span>
                {multiplier && <Badge variant="destructive" className="text-xs px-1 py-0">{multiplier}</Badge>}
            </div>
        );
    };

    const getAccuracy = (accuracyPercentage: number) => {
        return `${accuracyPercentage}%`;
    };

    if (loading) {
        return (
            <div className={`space-y-6 ${className} ${!sidebarOpen ? 'w-full' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{dict?.leaderboard?.title || 'Leaderboard'}</h1>
                        <p className="text-gray-400">
                            {timeFrame === 'weekly' ? dict?.leaderboard?.weeklyTopPerformers || 'This week\'s top performers' : dict?.leaderboard?.allTimeChampions || 'All-time champions'}
                        </p>
                    </div>
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                        <Button
                            variant={timeFrame === 'weekly' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeFrame('weekly')}
                            className={`text-xs ${timeFrame === 'weekly' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                        >
                            {dict?.leaderboard?.weekly || 'Weekly'}
                        </Button>
                        <Button
                            variant={timeFrame === 'allTime' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeFrame('allTime')}
                            className={`text-xs ${timeFrame === 'allTime' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                        >
                            {dict?.leaderboard?.allTime || 'All Time'}
                        </Button>
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            <span className="ml-3 text-gray-400">Loading leaderboard...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`space-y-6 ${className} ${!sidebarOpen ? 'w-full' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{dict?.leaderboard?.title || 'Leaderboard'}</h1>
                        <p className="text-gray-400">
                            {timeFrame === 'weekly' ? dict?.leaderboard?.weeklyTopPerformers || 'This week\'s top performers' : dict?.leaderboard?.allTimeChampions || 'All-time champions'}
                        </p>
                    </div>
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                        <Button
                            variant={timeFrame === 'weekly' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeFrame('weekly')}
                            className={`text-xs ${timeFrame === 'weekly' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                        >
                            {dict?.leaderboard?.weekly || 'Weekly'}
                        </Button>
                        <Button
                            variant={timeFrame === 'allTime' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeFrame('allTime')}
                            className={`text-xs ${timeFrame === 'allTime' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                        >
                            {dict?.leaderboard?.allTime || 'All Time'}
                        </Button>
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-8">
                        <div className="text-center">
                            <p className="text-red-400 mb-4">{error}</p>
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                size="sm"
                            >
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className} ${!sidebarOpen ? 'w-full' : ''}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="px-2 sm:px-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">{dict?.leaderboard?.title || 'Leaderboard'}</h1>
                    <p className="text-sm sm:text-base text-gray-400 mt-1">
                        {timeFrame === 'weekly' ? dict?.leaderboard?.weeklyTopPerformers || 'This week\'s top performers' : dict?.leaderboard?.allTimeChampions || 'All-time champions'}
                    </p>
                </div>

                {/* Time Frame Toggle */}
                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                    <Button
                        variant={timeFrame === 'weekly' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFrame('weekly')}
                        className={`text-xs ${timeFrame === 'weekly' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                    >
                        {dict?.leaderboard?.weekly || 'Weekly'}
                    </Button>
                    <Button
                        variant={timeFrame === 'allTime' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFrame('allTime')}
                        className={`text-xs ${timeFrame === 'allTime' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                    >
                        {dict?.leaderboard?.allTime || 'All Time'}
                    </Button>
                </div>
            </div>

            {/* Leaderboard Table */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                        <span>{dict?.leaderboard?.topPlayers || 'Top Players'}</span>
                        <Badge variant="secondary" className="bg-slate-600 text-white">
                            {timeFrame === 'weekly' ? dict?.leaderboard?.thisWeek || 'This Week' : dict?.leaderboard?.allTime || 'All Time'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {leaderboardData.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No leaderboard data available yet.</p>
                            <p className="text-gray-500 text-sm mt-2">Start making predictions to appear on the leaderboard!</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700/50">
                                            <TableHead className="w-16 text-gray-300">{dict?.leaderboard?.rank || 'Rank'}</TableHead>
                                            <TableHead className="w-48 text-gray-300">{dict?.leaderboard?.player || 'Player'}</TableHead>
                                            <TableHead className="w-24 text-right text-gray-300">{dict?.leaderboard?.points || 'Points'}</TableHead>
                                            <TableHead className="w-32 text-center text-gray-300">{dict?.leaderboard?.streak || 'Streak'}</TableHead>
                                            <TableHead className="w-24 text-center text-gray-300">{dict?.leaderboard?.accuracy || 'Accuracy'}</TableHead>
                                            <TableHead className="w-20 text-center text-gray-300">{dict?.leaderboard?.picks || 'Picks'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboardData.map((entry) => (
                                            <TableRow key={entry.userId} className="hover:bg-slate-700/30 border-slate-700/50">
                                                <TableCell className="font-medium w-16">
                                                    {getRankBadge(entry.rank)}
                                                </TableCell>
                                                <TableCell className="w-48">
                                                    <div className="font-semibold text-white truncate">
                                                        {entry.username || 'Anonymous'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right w-24">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        {entry.hasActiveStreakMultiplier && (
                                                            <div className="flex items-center space-x-1 bg-orange-500/20 px-2 py-1 rounded-full border border-orange-500/30">
                                                                <span className="text-orange-400 text-xs">🔥</span>
                                                                <span className="text-orange-400 text-xs font-medium">1.5x</span>
                                                            </div>
                                                        )}
                                                        <div className="font-bold text-green-400 text-lg">
                                                            {entry.totalPoints.toLocaleString()}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center w-32">
                                                    {getStreakDisplay(entry.currentStreak)}
                                                </TableCell>
                                                <TableCell className="text-center w-24">
                                                    <div className="font-medium text-blue-400">
                                                        {getAccuracy(entry.accuracyPercentage)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center w-20 text-sm text-gray-400">
                                                    {entry.correctPicks}/{entry.totalPicks}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Compact List */}
                            <div className="md:hidden space-y-1">
                                {leaderboardData.map((entry) => (
                                    <div key={entry.userId} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                        {/* Player Name Row */}
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="flex-shrink-0">
                                                {getRankBadge(entry.rank)}
                                            </div>
                                            <div className="font-semibold text-white truncate">
                                                {entry.username || 'Anonymous'}
                                            </div>
                                        </div>
                                        {/* Stats Row */}
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-1">
                                                    <span className="text-orange-500">🔥</span>
                                                    <span className="text-orange-600 font-medium w-4 text-center">{entry.currentStreak}</span>
                                                </div>
                                                <div className="text-blue-400 font-medium w-12 text-center">
                                                    {getAccuracy(entry.accuracyPercentage)}
                                                </div>
                                                <div className="text-gray-400 w-16 text-center">
                                                    {entry.correctPicks}/{entry.totalPicks}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end space-x-2 w-20">
                                                {entry.hasActiveStreakMultiplier && (
                                                    <div className="flex items-center space-x-1 bg-orange-500/20 px-1 py-0.5 rounded-full border border-orange-500/30">
                                                        <span className="text-orange-400 text-xs">🔥</span>
                                                        <span className="text-orange-400 text-xs font-medium">1.5x</span>
                                                    </div>
                                                )}
                                                <div className="font-bold text-green-400 text-lg">
                                                    {entry.totalPoints.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Stats Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="p-3 md:p-4 text-center">
                            <div className="text-lg md:text-2xl font-bold text-green-400">
                                {summary.topScore.toLocaleString()}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">{dict?.leaderboard?.topScore || 'Top Score'}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="p-3 md:p-4 text-center">
                            <div className="text-lg md:text-2xl font-bold text-orange-400">
                                {summary.bestStreak}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">{dict?.leaderboard?.bestStreak || 'Best Streak'}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="p-3 md:p-4 text-center">
                            <div className="text-lg md:text-2xl font-bold text-blue-400">
                                {summary.averageAccuracy}%
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">{dict?.leaderboard?.avgAccuracy || 'Avg Accuracy'}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="p-3 md:p-4 text-center">
                            <div className="text-lg md:text-2xl font-bold text-purple-400">
                                {summary.totalParticipants}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">Participants</div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
} 