'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@netprophet/ui';
import { useTheme } from '../Providers';
import { useDictionary } from '@/context/DictionaryContext';

interface MatchDetails {
    tournament: string;
    round: string;
    surface: string;
    player1: { name: string; odds: number; wins: number; losses: number };
    player2: { name: string; odds: number; wins: number; losses: number };
    headToHead: string;
    format: string;
}

interface Match {
    id: number;
    status: string;
}

interface MatchHeaderProps {
    match: Match;
    details: MatchDetails;
}

export function MatchHeader({ match, details }: MatchHeaderProps) {
    const { theme } = useTheme();
    const { dict, lang } = useDictionary();

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
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50 h-full flex flex-col">
            {/* Tournament Info */}
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-white mb-1">{details.tournament}</h3>
                <p className="text-xs text-gray-400 mb-1">{details.round} • {details.surface}</p>
                <div className="text-xs text-gray-400">
                    {isBestOf5 ? dict?.matches?.bestOf5 || 'Best of 5' : dict?.matches?.bestOf3 || 'Best of 3'}
                </div>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
                <Badge variant={getStatusColor(match.status)} className="text-xs px-2 py-1">
                    {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
                </Badge>
            </div>

            {/* Players */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-3">
                    <div className="text-sm font-medium text-white mb-1">{details.player1.name.split(' ')[1]}</div>
                    <div className="text-sm text-purple-400 font-bold">{details.player1.odds.toFixed(2)}x</div>
                </div>

                <div className="text-xs text-gray-400 font-bold text-center mb-3">VS</div>

                <div className="text-center mb-3">
                    <div className="text-sm font-medium text-white mb-1">{details.player2.name.split(' ')[1]}</div>
                    <div className="text-sm text-purple-400 font-bold">{details.player2.odds.toFixed(2)}x</div>
                </div>
            </div>

            {/* Head to Head */}
            <div className="text-xs text-gray-400 text-center">
                H2H: {details.headToHead}
            </div>
        </div>
    );
} 