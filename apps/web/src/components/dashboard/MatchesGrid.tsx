'use client';

import { Card, CardContent, Badge, Button } from '@netprophet/ui';
import { Match } from '@/types/dashboard';

interface MatchesGridProps {
    matches?: Match[];
    onSelectMatch: (match: Match) => void;
}

// Mock matches data
const mockMatches: Match[] = [
    {
        id: 1,
        tournament: 'Roland Garros 2024',
        player1: { name: 'Rafael Nadal', country: '🇪🇸', ranking: 1, odds: 2.15 },
        player2: { name: 'Novak Djokovic', country: '🇷🇸', ranking: 2, odds: 1.85 },
        time: '14:00',
        court: 'Philippe-Chatrier',
        status: 'live',
        points: 250,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago
        lockTime: new Date(Date.now() + 5 * 60 * 1000), // Locks in 5 minutes
        isLocked: false
    },
    {
        id: 2,
        tournament: 'Roland Garros 2024',
        player1: { name: 'Carlos Alcaraz', country: '🇪🇸', ranking: 3, odds: 1.65 },
        player2: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 2.35 },
        time: '16:30',
        court: 'Suzanne-Lenglen',
        status: 'upcoming',
        points: 200,
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starts in 2 hours
        lockTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // Locks in 1.5 hours
        isLocked: false
    },
    {
        id: 3,
        tournament: 'Wimbledon 2024',
        player1: { name: 'Jannik Sinner', country: '🇮🇹', ranking: 5, odds: 1.95 },
        player2: { name: 'Alexander Zverev', country: '🇩🇪', ranking: 6, odds: 1.95 },
        time: '13:00',
        court: 'Centre Court',
        status: 'upcoming',
        points: 180,
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Starts in 4 hours
        lockTime: new Date(Date.now() + 3.5 * 60 * 60 * 1000), // Locks in 3.5 hours
        isLocked: false
    },
    {
        id: 4,
        tournament: 'Wimbledon 2024',
        player1: { name: 'Andy Murray', country: '🇬🇧', ranking: 7, odds: 2.50 },
        player2: { name: 'Stefanos Tsitsipas', country: '🇬🇷', ranking: 8, odds: 1.60 },
        time: '15:30',
        court: 'Court 1',
        status: 'upcoming',
        points: 150,
        startTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // Starts in 6 hours
        lockTime: new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Locks in 5.5 hours
        isLocked: false
    },
    {
        id: 5,
        tournament: 'US Open 2024',
        player1: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 1.80 },
        player2: { name: 'Andrey Rublev', country: '🇷🇺', ranking: 9, odds: 2.20 },
        time: '20:00',
        court: 'Arthur Ashe',
        status: 'upcoming',
        points: 120,
        startTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // Starts in 8 hours
        lockTime: new Date(Date.now() + 7.5 * 60 * 60 * 1000), // Locks in 7.5 hours
        isLocked: false
    },
    {
        id: 6,
        tournament: 'Roland Garros 2024',
        player1: { name: 'Casper Ruud', country: '🇳🇴', ranking: 10, odds: 2.80 },
        player2: { name: 'Hubert Hurkacz', country: '🇵🇱', ranking: 11, odds: 1.40 },
        time: '18:00',
        court: 'Court 2',
        status: 'upcoming',
        points: 100,
        startTime: new Date(Date.now() + 10 * 60 * 60 * 1000), // Starts in 10 hours
        lockTime: new Date(Date.now() + 9.5 * 60 * 60 * 1000), // Locks in 9.5 hours
        isLocked: false
    }
];

export function MatchesGrid({ matches = mockMatches, onSelectMatch }: MatchesGridProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return 'destructive';
            case 'upcoming':
                return 'secondary';
            case 'finished':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const liveMatches = matches.filter(match => match.status === 'live');
    const upcomingMatches = matches.filter(match => match.status === 'upcoming');

    return (
        <div className="space-y-6">
            {/* Live Matches Section */}
            {liveMatches.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2" />
                        Live Matches ({liveMatches.length})
                    </h2>
                    <div className="grid gap-4">
                        {liveMatches.map((match) => (
                            <Card key={match.id} className="hover:shadow-md transition-shadow border-red-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="destructive" className="animate-pulse">
                                                LIVE
                                            </Badge>
                                            <span className="text-sm text-gray-500">{match.tournament}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">{match.time}</div>
                                            <div className="text-xs text-gray-400">{match.court}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div className="text-lg font-semibold text-gray-900">{match.player1.name}</div>
                                            <div className="text-sm text-gray-600">{match.player1.country} • #{match.player1.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player1.odds}</div>
                                        </div>
                                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div className="text-lg font-semibold text-gray-900">{match.player2.name}</div>
                                            <div className="text-sm text-gray-600">{match.player2.country} • #{match.player2.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player2.odds}</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-600">
                                            Points: <span className="font-semibold text-green-600">+{match.points}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => onSelectMatch(match)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            Make Predictions
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Matches Section */}
            {upcomingMatches.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Matches ({upcomingMatches.length})</h2>
                    <div className="grid gap-4">
                        {upcomingMatches.map((match) => (
                            <Card key={match.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="secondary">
                                                UPCOMING
                                            </Badge>
                                            <span className="text-sm text-gray-500">{match.tournament}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">{match.time}</div>
                                            <div className="text-xs text-gray-400">{match.court}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                                            <div className="text-lg font-semibold text-gray-900">{match.player1.name}</div>
                                            <div className="text-sm text-gray-600">{match.player1.country} • #{match.player1.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player1.odds}</div>
                                        </div>
                                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                                            <div className="text-lg font-semibold text-gray-900">{match.player2.name}</div>
                                            <div className="text-sm text-gray-600">{match.player2.country} • #{match.player2.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player2.odds}</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-600">
                                            Points: <span className="font-semibold text-green-600">+{match.points}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => onSelectMatch(match)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            Make Predictions
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* No Matches State */}
            {matches.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎾</div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Matches Available</h2>
                    <p className="text-gray-600">Check back later for upcoming matches</p>
                </div>
            )}
        </div>
    );
} 