'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { useTheme } from '../Providers';

interface MatchDetails {
    tournament: string;
    round: string;
    surface: string;
    player1: { name: string; country: string; ranking: number; odds: number; wins: number; losses: number };
    player2: { name: string; country: string; ranking: number; odds: number; wins: number; losses: number };
    headToHead: string;
    format: string;
}

interface Match {
    id: number;
    status: string;
    court: string;
}

interface MatchHeaderProps {
    match: Match;
    details: MatchDetails;
}

export function MatchHeader({ match, details }: MatchHeaderProps) {
    const { theme } = useTheme();

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

    const isBestOf5 = details.format === 'best-of-5';

    return (
        <div className="space-y-6">
            {/* Match Info Card */}
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                <CardTitle>{details.tournament}</CardTitle>
                <CardContent>
                    <div className="flex items-center justify-between mt-2 mb-6">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {details.round} • {details.surface} • {match.court}
                        </span>
                        <Badge variant={getStatusColor(match.status)}>
                            {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
                        </Badge>
                    </div>
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 text-center rounded-lg ${theme === 'dark' ? 'bg-[#1F222A]' : 'bg-gray-50'}`}>
                            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Head to Head</div>
                            <div className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{details.headToHead}</div>
                        </div>
                        <div className={`p-4 text-center rounded-lg ${theme === 'dark' ? 'bg-[#1F222A]' : 'bg-gray-50'}`}>
                            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Surface</div>
                            <div className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{details.surface}</div>
                        </div>
                        <div className={`p-4 text-center rounded-lg ${theme === 'dark' ? 'bg-[#1F222A]' : 'bg-gray-50'}`}>
                            <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Match Format</div>
                            <div className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                                {isBestOf5 ? 'Best of 5' : 'Best of 3'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Player Cards */}
            <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Player 1 Card */}
                    <Card className={`hover:shadow-lg transition-shadow ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                        <CardHeader>
                            <CardTitle className="text-center">{details.player1.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <div className="text-4xl">{details.player1.country}</div>
                            <div className="space-y-2">
                                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>World Ranking</div>
                                <div className="text-2xl font-bold text-blue-600">#{details.player1.ranking}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className={`text-gray-400 ${theme === 'dark' ? '' : 'text-gray-600'}`}>Wins</div>
                                    <div className="font-semibold text-green-600">{details.player1.wins}</div>
                                </div>
                                <div>
                                    <div className={`text-gray-400 ${theme === 'dark' ? '' : 'text-gray-600'}`}>Losses</div>
                                    <div className="font-semibold text-red-600">{details.player1.losses}</div>
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-blue-600">{details.player1.odds}</div>
                        </CardContent>
                    </Card>

                    {/* Player 2 Card */}
                    <Card className={`hover:shadow-lg transition-shadow ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                        <CardHeader>
                            <CardTitle className="text-center">{details.player2.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <div className="text-4xl">{details.player2.country}</div>
                            <div className="space-y-2">
                                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>World Ranking</div>
                                <div className="text-2xl font-bold text-blue-600">#{details.player2.ranking}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className={`text-gray-400 ${theme === 'dark' ? '' : 'text-gray-600'}`}>Wins</div>
                                    <div className="font-semibold text-green-600">{details.player2.wins}</div>
                                </div>
                                <div>
                                    <div className={`text-gray-400 ${theme === 'dark' ? '' : 'text-gray-600'}`}>Losses</div>
                                    <div className="font-semibold text-red-600">{details.player2.losses}</div>
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-blue-600">{details.player2.odds}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 