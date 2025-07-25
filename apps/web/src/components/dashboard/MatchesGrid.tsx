'use client';

import { Card, CardContent, Badge, Button } from '@netprophet/ui';
import { Match } from '@/types/dashboard';
import { CardTitle } from '@/components/ui/card';
import { mockMatches } from '@/components/MatchesList';
import { useMatchSelect } from '@/context/MatchSelectContext';
import { useTheme } from '../Providers';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

interface MatchesGridProps {
    matches?: Match[];
    onSelectMatch?: (match: Match) => void;
}

export function MatchesGrid({ matches = mockMatches }: MatchesGridProps) {
    const onSelectMatch = useMatchSelect();
    const { theme } = useTheme();
    const { slipCollapsed } = usePredictionSlip();

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
        <div className={`flex flex-col flex-1 min-h-0 w-full overflow-auto gap-6 ${slipCollapsed === false ? 'xl:pr-96' : ''}`}>
            {/* Live Matches Section */}
            {liveMatches.length > 0 && (
                <div>
                    <h2 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'dark' ? 'text-accent' : 'text-yellow-600'}`}>
                        <span className={`w-3 h-3 rounded-full animate-pulse mr-2 ${theme === 'dark' ? 'bg-red-500' : 'bg-red-400'}`} />
                        Live Matches ({liveMatches.length})
                    </h2>
                    <div className="grid gap-4">
                        {liveMatches.map((match) => (
                            <Card key={match.id} className={`hover:shadow-md transition-shadow border-red-200 cursor-pointer ${theme === 'dark' ? '' : 'border-red-100'}`} onClick={() => onSelectMatch(match)}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="destructive" className="animate-pulse">
                                                LIVE
                                            </Badge>
                                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>{match.tournament}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>{match.time}</div>
                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{match.court}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className={`text-center p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-50/10 border-red-200/30 text-white' : 'bg-red-50 border-red-200 text-gray-900'}`}>
                                            <div className="text-lg font-semibold">{match.player1.name}</div>
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{match.player1.country} • #{match.player1.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player1.odds}</div>
                                        </div>
                                        <div className={`text-center p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-50/10 border-red-200/30 text-white' : 'bg-red-50 border-red-200 text-gray-900'}`}>
                                            <div className="text-lg font-semibold">{match.player2.name}</div>
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{match.player2.country} • #{match.player2.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player2.odds}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Points: <span className="font-semibold text-green-600">+{match.points}</span>
                                        </div>
                                        <Button
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents card click if needed, but still routes
                                                onSelectMatch(match);
                                            }}
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
                    <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-accent' : 'text-yellow-600'}`}>Upcoming Matches ({upcomingMatches.length})</h2>
                    <div className="grid gap-4">
                        {upcomingMatches.map((match) => (
                            <Card key={match.id} className={`hover:shadow-md transition-shadow cursor-pointer ${theme === 'dark' ? '' : 'border border-gray-200'}`} onClick={() => onSelectMatch(match)}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="secondary">
                                                UPCOMING
                                            </Badge>
                                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>{match.tournament}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>{match.time}</div>
                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{match.court}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}>
                                            <div className="text-lg font-semibold">{match.player1.name}</div>
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{match.player1.country} • #{match.player1.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player1.odds}</div>
                                        </div>
                                        <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}>
                                            <div className="text-lg font-semibold">{match.player2.name}</div>
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{match.player2.country} • #{match.player2.ranking}</div>
                                            <div className="text-lg font-bold text-blue-600 mt-2">{match.player2.odds}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Points: <span className="font-semibold text-green-600">+{match.points}</span>
                                        </div>
                                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onSelectMatch(match)}>
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
                    <h2 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>No Matches Available</h2>
                    <p className={`text-gray-600 ${theme === 'dark' ? 'text-gray-400' : ''}`}>Check back later for upcoming matches</p>
                </div>
            )}
        </div>
    );
} 