'use client';

import { motion } from 'framer-motion';
import { formatParlayOdds } from '@netprophet/lib';

interface ParlaySummaryProps {
    predictionsCount: number;
    parlayCalculation: any;
    parlayStake: number;
    isSafeBet: boolean;
    safeBetTokens: number;
    safeBetCost: number;
    onToggleSafeBet: () => void;
    dict?: any;
}

export function ParlaySummary({
    predictionsCount,
    parlayCalculation,
    parlayStake,
    isSafeBet,
    safeBetTokens,
    safeBetCost,
    onToggleSafeBet,
    dict
}: ParlaySummaryProps) {
    if (predictionsCount < 2 || !parlayCalculation) return null;

    const bonusDescriptions = parlayCalculation.bonusDescriptions || [];

    return (
        <motion.div
            className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-3 border border-purple-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div className="text-center mb-2">
                <h4 className="text-base font-bold text-yellow-200 mb-1">
                    {dict?.matches?.parlayBet?.replace('{count}', predictionsCount.toString()) ||
                        `🎯 Parlay Bet (${predictionsCount} picks)`}
                </h4>
                <div className="text-xl font-bold text-green-400">
                    {formatParlayOdds(parlayCalculation.finalOdds)}x
                </div>
                <div className="text-xs text-slate-300">
                    {dict?.matches?.base || 'Base'}: {formatParlayOdds(parlayCalculation.baseOdds)}x
                </div>
                <div className="text-xs text-blue-300 mt-1">
                    {dict?.matches?.stakeAutoCalculated?.replace('{stake}', parlayStake.toString()) ||
                        `Stake: ${parlayStake} 🌕 (auto-calculated)`}
                </div>
            </div>

            {/* Bonus Descriptions */}
            {bonusDescriptions.length > 0 && (
                <div className="space-y-1 mb-2">
                    {bonusDescriptions.map((desc: string, index: number) => (
                        <div key={index} className="text-xs text-yellow-300 flex items-center">
                            <span className="mr-1">✨</span>
                            {desc}
                        </div>
                    ))}
                </div>
            )}

            {/* Safe Bet Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <ShieldIcon />
                    <span className="text-xs text-slate-300">{dict?.matches?.safeBet || 'Safe Bet'}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">
                        {safeBetTokens} {dict?.matches?.tokens || 'tokens'}
                    </span>
                    <button
                        onClick={onToggleSafeBet}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSafeBet ? 'bg-green-600' : 'bg-slate-600'
                            } ${safeBetTokens < safeBetCost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        disabled={safeBetTokens < safeBetCost}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSafeBet ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function ShieldIcon() {
    return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}
