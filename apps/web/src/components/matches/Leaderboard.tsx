'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface LeaderboardEntry {
    id: number;
    username: string;
    totalPoints: number;
    streak: number;
    correctPicks: number;
    totalPicks: number;
    rank: number;
}

interface LeaderboardProps {
    className?: string;
    sidebarOpen?: boolean;
}

// Mock leaderboard data
const weeklyLeaderboard: LeaderboardEntry[] = [
    {
        id: 1,
        username: '@tennis_pro',
        totalPoints: 1250,
        streak: 7,
        correctPicks: 23,
        totalPicks: 28,
        rank: 1
    },
    {
        id: 2,
        username: '@maria_ace',
        totalPoints: 1180,
        streak: 5,
        correctPicks: 21,
        totalPicks: 26,
        rank: 2
    },
    {
        id: 3,
        username: '@greek_tennis',
        totalPoints: 1120,
        streak: 4,
        correctPicks: 19,
        totalPicks: 24,
        rank: 3
    },
    {
        id: 4,
        username: '@netprophet',
        totalPoints: 980,
        streak: 3,
        correctPicks: 17,
        totalPicks: 22,
        rank: 4
    },
    {
        id: 5,
        username: '@court_king',
        totalPoints: 920,
        streak: 2,
        correctPicks: 16,
        totalPicks: 20,
        rank: 5
    },
    {
        id: 6,
        username: '@serve_master',
        totalPoints: 850,
        streak: 1,
        correctPicks: 15,
        totalPicks: 18,
        rank: 6
    },
    {
        id: 7,
        username: '@backhand_boss',
        totalPoints: 780,
        streak: 0,
        correctPicks: 14,
        totalPicks: 16,
        rank: 7
    },
    {
        id: 8,
        username: '@volley_victor',
        totalPoints: 720,
        streak: 0,
        correctPicks: 13,
        totalPicks: 15,
        rank: 8
    },
    {
        id: 9,
        username: '@smash_sam',
        totalPoints: 680,
        streak: 0,
        correctPicks: 12,
        totalPicks: 14,
        rank: 9
    },
    {
        id: 10,
        username: '@rally_roy',
        totalPoints: 640,
        streak: 0,
        correctPicks: 11,
        totalPicks: 13,
        rank: 10
    }
];

const allTimeLeaderboard: LeaderboardEntry[] = [
    {
        id: 1,
        username: '@tennis_legend',
        totalPoints: 8500,
        streak: 15,
        correctPicks: 156,
        totalPicks: 180,
        rank: 1
    },
    {
        id: 2,
        username: '@grand_slam_guru',
        totalPoints: 7800,
        streak: 12,
        correctPicks: 142,
        totalPicks: 165,
        rank: 2
    },
    {
        id: 3,
        username: '@ace_master',
        totalPoints: 7200,
        streak: 10,
        correctPicks: 128,
        totalPicks: 150,
        rank: 3
    },
    {
        id: 4,
        username: '@court_champion',
        totalPoints: 6800,
        streak: 8,
        correctPicks: 115,
        totalPicks: 135,
        rank: 4
    },
    {
        id: 5,
        username: '@serve_king',
        totalPoints: 6400,
        streak: 7,
        correctPicks: 108,
        totalPicks: 125,
        rank: 5
    },
    {
        id: 6,
        username: '@volley_victor',
        totalPoints: 6000,
        streak: 6,
        correctPicks: 98,
        totalPicks: 115,
        rank: 6
    },
    {
        id: 7,
        username: '@backhand_boss',
        totalPoints: 5600,
        streak: 5,
        correctPicks: 89,
        totalPicks: 105,
        rank: 7
    },
    {
        id: 8,
        username: '@rally_roy',
        totalPoints: 5200,
        streak: 4,
        correctPicks: 82,
        totalPicks: 95,
        rank: 8
    },
    {
        id: 9,
        username: '@smash_sam',
        totalPoints: 4800,
        streak: 3,
        correctPicks: 75,
        totalPicks: 88,
        rank: 9
    },
    {
        id: 10,
        username: '@net_ninja',
        totalPoints: 4400,
        streak: 2,
        correctPicks: 68,
        totalPicks: 80,
        rank: 10
    }
];

export function Leaderboard({ className, sidebarOpen = true }: LeaderboardProps) {
    const { dict } = useDictionary();
    const [timeFrame, setTimeFrame] = useState<'weekly' | 'allTime'>('weekly');

    const currentLeaderboard = timeFrame === 'weekly' ? weeklyLeaderboard : allTimeLeaderboard;

    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1:
                return <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">🥇</Badge>;
            case 2:
                return <Badge variant="default" className="bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0">🥈</Badge>;
            case 3:
                return <Badge variant="default" className="bg-gradient-to-r from-orange-400 to-orange-600 text-white border-0">🥉</Badge>;
            default:
                return <Badge variant="secondary">#{rank}</Badge>;
        }
    };

    const getStreakDisplay = (streak: number) => {
        if (streak === 0) return <span className="text-gray-400">-</span>;

        const multiplier = streak >= 5 ? `x${Math.floor(streak / 5) + 1}` : '';
        const fireCount = Math.min(Math.floor(streak / 3), 3); // Max 3 fires
        const fires = '🔥'.repeat(fireCount);

        return (
            <div className="flex items-center space-x-1">
                <span className="text-orange-500">{fires}</span>
                <span className="font-semibold text-orange-600">{streak}</span>
                {multiplier && <Badge variant="destructive" className="text-xs">{multiplier}</Badge>}
            </div>
        );
    };

    const getAccuracy = (correct: number, total: number) => {
        if (total === 0) return '0%';
        return `${Math.round((correct / total) * 100)}%`;
    };

    return (
        <div className={`space-y-6 ${className} ${!sidebarOpen ? 'w-full' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{dict?.leaderboard?.title || 'Leaderboard'}</h1>
                    <p className="text-gray-400">
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
                        <Badge variant="secondary">
                            {timeFrame === 'weekly' ? dict?.leaderboard?.thisWeek || 'This Week' : dict?.leaderboard?.allTime || 'All Time'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-700/50">
                                <TableHead className="w-16 text-gray-300">{dict?.leaderboard?.rank || 'Rank'}</TableHead>
                                <TableHead className="text-gray-300">{dict?.leaderboard?.player || 'Player'}</TableHead>
                                <TableHead className="text-right text-gray-300">{dict?.leaderboard?.points || 'Points'}</TableHead>
                                <TableHead className="text-center text-gray-300">{dict?.leaderboard?.streak || 'Streak'}</TableHead>
                                <TableHead className="text-center text-gray-300">{dict?.leaderboard?.accuracy || 'Accuracy'}</TableHead>
                                <TableHead className="text-center text-gray-300">{dict?.leaderboard?.picks || 'Picks'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentLeaderboard.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-slate-700/30 border-slate-700/50">
                                    <TableCell className="font-medium">
                                        {getRankBadge(entry.rank)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-white">
                                            {entry.username}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-bold text-green-400">
                                            {entry.totalPoints.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getStreakDisplay(entry.streak)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="font-medium text-blue-400">
                                            {getAccuracy(entry.correctPicks, entry.totalPicks)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-gray-400">
                                        {entry.correctPicks}/{entry.totalPicks}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {currentLeaderboard[0]?.totalPoints.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">{dict?.leaderboard?.topScore || 'Top Score'}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-400">
                            {Math.max(...currentLeaderboard.map(e => e.streak))}
                        </div>
                        <div className="text-sm text-gray-400">{dict?.leaderboard?.bestStreak || 'Best Streak'}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">
                            {Math.round(currentLeaderboard.reduce((acc, e) => acc + (e.correctPicks / e.totalPicks), 0) / currentLeaderboard.length * 100)}%
                        </div>
                        <div className="text-sm text-gray-400">{dict?.leaderboard?.avgAccuracy || 'Avg Accuracy'}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 