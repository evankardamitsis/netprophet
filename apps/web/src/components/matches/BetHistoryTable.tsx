'use client';

import CoinIcon from '@/components/CoinIcon';
import { useDictionary } from '@/context/DictionaryContext';

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
}

export function BetHistoryTable({ bets }: BetHistoryTableProps) {
    const { dict, prepForUppercaseDisplay } = useDictionary();
    const STATUS_STYLES: Record<string, { label: string; className: string }> = {
        active:  { label: '⏳ Ενεργή',       className: 'bg-[#38BDF8]/10 border-[#38BDF8]/25 text-[#38BDF8]' },
        won:     { label: '✅ Κερδισμένη',   className: 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' },
        lost:    { label: '❌ Χαμένη',       className: 'bg-[#FF4545]/10 border-[#FF4545]/30 text-[#FF4545]' },
    };

    const getStatusBadge = (status: string) => {
        const s = STATUS_STYLES[status];
        if (!s) return null;
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${s.className}`}>
                {s.label}
            </span>
        );
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
        <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-2">
                {bets.map((bet) => (
                    <div key={bet.id} className="bg-[#161F35] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-sm truncate mb-1">
                                    {bet.matchTitle}
                                </h3>
                                <p className="text-[#94A3B8] text-xs">
                                    {formatDate(bet.created_at)}
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                {getStatusBadge(bet.status)}
                            </div>
                        </div>

                        <div className="mb-3">
                            <p className="text-[#94A3B8] text-xs leading-relaxed break-words">
                                {formatPrediction(bet.prediction)}
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                            <div className="text-xs text-[#94A3B8]">
                                Νομίσματα: <span className="text-white font-bold tabular-nums">{bet.betAmount}</span>
                                <span className="ml-1 text-[#4B5975]">× {bet.multiplier}</span>
                            </div>
                            <div className="text-xs text-[#94A3B8]">
                                Πιθανά Κέρδη:{' '}
                                <span className="text-[#00E676] font-bold tabular-nums">
                                    {bet.potentialWinnings}
                                </span>
                                {bet.pointsEarned > 0 && (
                                    <span className="text-[#00E676] font-bold ml-1">
                                        (+{bet.pointsEarned})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop List View */}
            <div className="hidden md:block space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_3fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-[11px] font-bold text-[#4B5975] uppercase tracking-wider">
                    <span>{prepForUppercaseDisplay(dict?.myPicks?.match || 'Αγώνας')}</span>
                    <span>{prepForUppercaseDisplay(dict?.myPicks?.dateTime || 'Ημερομηνία')}</span>
                    <span>{prepForUppercaseDisplay(dict?.myPicks?.predictionDetails || 'Πρόβλεψη')}</span>
                    <span>{prepForUppercaseDisplay('Νομίσματα')}</span>
                    <span>{prepForUppercaseDisplay('Απόδοση')}</span>
                    <span>{prepForUppercaseDisplay('Πιθανά Κέρδη')}</span>
                    <span>{prepForUppercaseDisplay(dict?.myPicks?.status || 'Κατάσταση')}</span>
                </div>
                {bets.map((bet) => (
                    <div key={bet.id}
                         className="grid grid-cols-[2fr_1fr_3fr_1fr_1fr_1fr_1fr] gap-4 items-center px-4 py-4 bg-[#161F35] border border-white/[0.06] rounded-xl transition-all hover:border-white/[0.12]">
                        <div className="text-sm font-semibold text-white truncate">
                            {bet.matchTitle}
                        </div>
                        <div className="text-xs text-[#94A3B8]">
                            {formatDate(bet.created_at)}
                        </div>
                        <div className="text-xs text-[#94A3B8] leading-relaxed truncate" title={formatPrediction(bet.prediction)}>
                            {formatPrediction(bet.prediction)}
                        </div>
                        <div className="text-sm font-bold text-white tabular-nums flex items-center gap-1">
                            {bet.betAmount} <CoinIcon size={12} />
                        </div>
                        <div className="text-sm text-[#94A3B8] tabular-nums">
                            {bet.multiplier}×
                        </div>
                        <div className="text-sm font-bold tabular-nums flex items-center gap-1 text-[#00E676]">
                            {bet.potentialWinnings} <CoinIcon size={12} />
                        </div>
                        <div>
                            {getStatusBadge(bet.status)}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
