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
        <div className="space-y-3">
            {/* Compact Match Info */}
            <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-sm font-bold text-white">{details.tournament}</h3>
                        <p className="text-xs text-gray-400">{details.round} • {details.surface} • {match.court}</p>
                    </div>
                    <Badge variant={getStatusColor(match.status)} className="text-xs">
                        {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
                    </Badge>
                </div>

                {/* Compact Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                        <div className="text-gray-400">H2H</div>
                        <div className="text-white font-medium">{details.headToHead}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-400">Surface</div>
                        <div className="text-white font-medium">{details.surface}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-400">Format</div>
                        <div className="text-white font-medium">{isBestOf5 ? 'Best of 5' : 'Best of 3'}</div>
                    </div>
                </div>
            </div>

            {/* Compact Player Cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* Player 1 */}
                <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
                    <div className="text-center">
                        <div className="text-sm font-bold text-white mb-1">{details.player1.name.split(' ')[1]}</div>
                        <div className="text-lg mb-2">{details.player1.country}</div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">Rank</span>
                            <span className="text-blue-400 font-bold">#{details.player1.ranking}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">Record</span>
                            <span className="text-white">{details.player1.wins}-{details.player1.losses}</span>
                        </div>
                        <div className="text-lg font-bold text-purple-400">{details.player1.odds.toFixed(2)}x</div>
                    </div>
                </div>

                {/* Player 2 */}
                <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
                    <div className="text-center">
                        <div className="text-sm font-bold text-white mb-1">{details.player2.name.split(' ')[1]}</div>
                        <div className="text-lg mb-2">{details.player2.country}</div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">Rank</span>
                            <span className="text-blue-400 font-bold">#{details.player2.ranking}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">Record</span>
                            <span className="text-white">{details.player2.wins}-{details.player2.losses}</span>
                        </div>
                        <div className="text-lg font-bold text-purple-400">{details.player2.odds.toFixed(2)}x</div>
                    </div>
                </div>
            </div>
        </div>
    );
} 