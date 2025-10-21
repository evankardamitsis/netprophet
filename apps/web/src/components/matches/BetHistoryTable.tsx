'use client';

import { Dictionary } from '@/types/dictionary';
import CoinIcon from '@/components/CoinIcon';

interface Prediction {
    winner?: string;
    score?: string;
    tiebreak?: string;
    matchResult?: string;
    set1Score?: string;
    set2Score?: string;
    set3Score?: string;
    superTiebreakScore?: string;
}

interface BetHistoryItem {
    id: string;
    matchTitle: string;
    date: string;
    time: string;
    prediction: Prediction;
    status: 'active' | 'won' | 'lost';
    pointsEarned: number;
    betAmount: number;
    potentialWinnings: number;
    multiplier: number;
    created_at: string;
}

interface BetHistoryTableProps {
    bets: BetHistoryItem[];
    dict?: Dictionary;
}

export function BetHistoryTable({ bets, dict }: BetHistoryTableProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30">
                        Active
                    </span>
                );
            case 'won':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 border border-green-500/30">
                        Won
                    </span>
                );
            case 'lost':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-500/30">
                        Lost
                    </span>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatPrediction = (prediction: Prediction) => {
        const parts = [];
        if (prediction.winner) parts.push(`Winner: ${prediction.winner}`);
        if (prediction.matchResult) parts.push(`Result: ${prediction.matchResult}`);
        if (prediction.set1Score) parts.push(`Set 1: ${prediction.set1Score}`);
        if (prediction.set2Score) parts.push(`Set 2: ${prediction.set2Score}`);
        if (prediction.set3Score) parts.push(`Set 3: ${prediction.set3Score}`);
        if (prediction.superTiebreakScore) parts.push(`Super TB: ${prediction.superTiebreakScore}`);
        return parts.join(' | ');
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <thead className="bg-slate-700">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-48">
                            {dict?.myPicks?.match || 'Match'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-32">
                            {dict?.myPicks?.dateTime || 'Date'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-80">
                            {dict?.myPicks?.predictionDetails || 'Prediction Details'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-24">
                            {dict?.myPicks?.bet || 'Bet'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-20">
                            {dict?.myPicks?.multiplier || 'Mult'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-32">
                            {dict?.myPicks?.potential || 'Potential'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-20">
                            {dict?.myPicks?.status || 'Status'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 tracking-wider w-24">
                            {dict?.myPicks?.winnings || 'Winnings'}
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {bets.map((bet) => (
                        <tr key={bet.id} className="hover:bg-slate-750 transition-colors">
                            <td className="px-4 py-4">
                                <div className="text-sm font-medium text-white">
                                    {bet.matchTitle}
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="text-sm text-gray-300">
                                    {formatDate(bet.created_at)}
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="text-sm text-gray-300 leading-relaxed" title={formatPrediction(bet.prediction)}>
                                    {formatPrediction(bet.prediction)}
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300 flex items-center gap-1">
                                    {bet.betAmount} <CoinIcon size={14} />
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                    {bet.multiplier}x
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300 flex items-center gap-1">
                                    {bet.potentialWinnings} <CoinIcon size={14} />
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                {getStatusBadge(bet.status)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium flex items-center gap-1 ${bet.pointsEarned > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                    {bet.pointsEarned > 0 ? `+${bet.pointsEarned}` : '0'} <CoinIcon size={14} />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
