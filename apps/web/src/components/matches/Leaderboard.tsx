'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';
import { LeaderboardService, LeaderboardEntry } from '@netprophet/lib';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
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
        const fireCount = Math.max(0, Math.min(Math.floor(streak / 3), 3)); // Max 3 fires, min 0
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
            <div className="px-2 sm:px-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{dict?.leaderboard?.title || 'Leaderboard'}</h1>
                <p className="text-sm sm:text-base text-gray-400 mt-1 max-w-2xl">
                    {timeFrame === 'weekly' ? dict?.leaderboard?.weeklyTopPerformers || 'This week\'s top performers' : dict?.leaderboard?.allTimeChampions || 'All-time champions'}
                </p>
            </div>

            {/* Compact Description Section */}
            <Card className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600/50">
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-white text-sm sm:text-lg">🏆</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base sm:text-lg font-semibold text-white">
                                    {dict?.leaderboard?.howItWorks || 'How the Leaderboard Works'}
                                </h3>
                                <p className="text-gray-400 text-xs sm:text-sm">
                                    {dict?.leaderboard?.learnAboutPoints || 'Learn about points calculation, prizes, and strategies'}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowHowItWorksModal(true)}
                            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl text-sm"
                        >
                            {dict?.leaderboard?.learnMore || 'Learn More'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Time Frame Toggle */}
            <div className="flex justify-center">
                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50 shadow-lg">
                    <Button
                        variant={timeFrame === 'weekly' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFrame('weekly')}
                        className={`text-sm px-6 py-2 ${timeFrame === 'weekly' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
                    >
                        {dict?.leaderboard?.weekly || 'Weekly'}
                    </Button>
                    <Button
                        variant={timeFrame === 'allTime' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFrame('allTime')}
                        className={`text-sm px-6 py-2 ${timeFrame === 'allTime' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-slate-700/50'}`}
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

            {/* How It Works Modal */}
            <AnimatePresence>
                {showHowItWorksModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20 border border-purple-500/20 shadow-2xl rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden relative"
                        >
                            {/* Animated background elements */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 animate-pulse"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-2xl"></div>

                            <div className="relative z-10">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-purple-500/20">
                                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                            <span className="text-lg sm:text-2xl">🏆</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-lg sm:text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                                {dict?.leaderboard?.howItWorks || 'How the Leaderboard Works'}
                                            </h2>
                                            <p className="text-gray-400 text-xs sm:text-sm">
                                                {dict?.leaderboard?.completeGuide || 'Complete guide to climbing the leaderboard'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setShowHowItWorksModal(false)}
                                        className="w-8 h-8 sm:w-10 sm:h-10 p-0 bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 hover:text-white rounded-lg transition-colors flex-shrink-0 ml-2"
                                    >
                                        ✕
                                    </Button>
                                </div>

                                {/* Modal Content */}
                                <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {/* Points Calculation - Left Column */}
                                        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-xl p-3 sm:p-4 border border-green-500/20 hover:border-green-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                                            <div className="flex items-center mb-3 sm:mb-4">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 shadow-lg flex-shrink-0">
                                                    <span className="text-white text-sm sm:text-lg">📊</span>
                                                </div>
                                                <h3 className="text-base sm:text-lg font-bold text-green-400">
                                                    {dict?.leaderboard?.pointsCalculation || 'Points Calculation'}
                                                </h3>
                                            </div>
                                            <div className="space-y-2 sm:space-y-3">
                                                {dict?.leaderboard?.pointsCalculationList?.map((item, index) => (
                                                    <div key={index} className="flex items-start space-x-2 sm:space-x-3 group hover:bg-green-500/10 rounded-lg p-1.5 sm:p-2 transition-all duration-200">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                                                            <span className="text-white text-xs font-bold">{index + 1}</span>
                                                        </div>
                                                        <span className="text-gray-200 text-xs sm:text-sm leading-relaxed group-hover:text-green-100 transition-colors">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Prizes - Center Column */}
                                        <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-xl p-4 border border-yellow-500/20 hover:border-yellow-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                                            <div className="flex items-center mb-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center mr-3 shadow-lg animate-pulse">
                                                    <span className="text-white text-lg">🎁</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-yellow-400">
                                                    {dict?.leaderboard?.prizes || '🏆 Prizes & Rewards'}
                                                </h3>
                                            </div>
                                            <p className="text-gray-300 text-sm mb-4 italic">
                                                {dict?.leaderboard?.prizesDescription || 'Top performers can win:'}
                                            </p>
                                            <div className="space-y-3">
                                                {dict?.leaderboard?.prizesList?.map((item, index) => (
                                                    <div key={index} className="flex items-start space-x-3 group hover:bg-yellow-500/10 rounded-lg p-2 transition-all duration-200">
                                                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
                                                            <span className="text-white text-xs">🏆</span>
                                                        </div>
                                                        <span className="text-gray-200 text-sm leading-relaxed group-hover:text-yellow-100 transition-colors">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* How to Climb - Right Column */}
                                        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                                            <div className="flex items-center mb-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                                                    <span className="text-white text-lg">🚀</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-blue-400">
                                                    {dict?.leaderboard?.howToClimb || 'How to Climb'}
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                {dict?.leaderboard?.howToClimbList?.map((item, index) => (
                                                    <div key={index} className="flex items-start space-x-3 group hover:bg-blue-500/10 rounded-lg p-2 transition-all duration-200">
                                                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                                                            <span className="text-white text-xs">📈</span>
                                                        </div>
                                                        <span className="text-gray-200 text-sm leading-relaxed group-hover:text-blue-100 transition-colors">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom CTA */}
                                    <div className="mt-6 text-center">
                                        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-purple-500/30">
                                            <span className="text-purple-400 text-base sm:text-lg">⚡</span>
                                            <span className="text-white font-semibold text-sm sm:text-base">
                                                {dict?.leaderboard?.readyToCompete || 'Ready to compete?'}
                                            </span>
                                            <span className="text-blue-400 text-base sm:text-lg">⚡</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
} 