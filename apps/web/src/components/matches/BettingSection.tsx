'use client';

import { useState, useEffect } from 'react';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { useTheme } from '../Providers';
import { useDictionary } from '@/context/DictionaryContext';
import { calculateMultiplier, getMultiplierOptions, PlayerOdds } from '@/lib/predictionHelpers';
import { Badge } from '@netprophet/ui';

// Warning Icon Component
function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
}

interface BettingSectionProps {
    predictionCount: number;
    onBetAmountChange: (amount: number) => void;
    onMultiplierChange: (multiplier: number) => void;
    betAmount: number;
    selectedMultiplier: number;
    selectedWinner: string;
    player1: PlayerOdds;
    player2: PlayerOdds;
    matchStatus?: string;
}

export function BettingSection({
    predictionCount,
    onBetAmountChange,
    onMultiplierChange,
    betAmount,
    selectedMultiplier,
    selectedWinner,
    player1,
    player2,
    matchStatus
}: BettingSectionProps) {

    const { theme } = useTheme();
    const { wallet } = useWallet();
    const { dict, lang } = useDictionary();

    // Low balance thresholds (matching Wallet component)
    const isLowBalance = wallet.balance <= 200;
    const isVeryLowBalance = wallet.balance < 100;
    const isCriticalBalance = wallet.balance < 50;

    // Calculate potential winnings based on bet amount and multiplier
    const potentialWinnings = Math.round(betAmount * selectedMultiplier);

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

    // Update multiplier based on selected winner and prediction count
    useEffect(() => {
        if (selectedWinner) {
            const newMultiplier = calculateMultiplier(selectedWinner, player1, player2, predictionCount);
            onMultiplierChange(newMultiplier);
        }
    }, [selectedWinner, predictionCount, player1, player2, onMultiplierChange]);

    return (
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 border-2 border-slate-500 shadow-2xl ring-1 ring-slate-400/20">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">💰 {dict?.matches?.bettingSection || 'Place Your Bet'}</h3>
                <Badge variant="destructive" className="text-xs px-2 py-1">
                    TEST
                </Badge>
            </div>

            {/* Bet Amount Input */}
            <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-gray-300">
                    {dict?.matches?.stake || 'Bet Amount'} (🌕)
                </label>
                <div className="flex gap-1">
                    <input
                        type="number"
                        min={COIN_CONSTANTS.MIN_BET}
                        max={Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)}
                        value={betAmount}
                        onChange={(e) => onBetAmountChange(Number(e.target.value))}
                        className="flex-1 p-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder={dict?.matches?.enterBetAmount || "Enter bet amount"}
                    />
                    <div className="flex gap-1">
                        {[10, 25, 50, 100].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => onBetAmountChange(amount)}
                                className={`px-2 py-2 text-xs rounded-lg border transition-colors ${betAmount === amount
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-slate-600 border-slate-500 text-gray-300 hover:bg-slate-500'
                                    }`}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                    {dict?.matches?.minMaxBalance?.replace('{min}', COIN_CONSTANTS.MIN_BET.toString()).replace('{max}', Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance).toString()).replace('{balance}', wallet.balance.toString()) || `Min: ${COIN_CONSTANTS.MIN_BET} 🌕 | Max: ${Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)} 🌕 | Balance: ${wallet.balance} 🌕`}
                    {isLowBalance && (
                        <WarningIcon className="h-3 w-3 text-red-400 drop-shadow-sm" />
                    )}
                </div>
            </div>

            {/* Multiplier Display */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-600 p-3 rounded-lg border border-slate-500">
                    <div className="text-xs text-gray-400 mb-1">{dict?.matches?.multiplier || 'Multiplier'}</div>
                    <div className="text-xl font-bold text-purple-400">
                        {selectedMultiplier.toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-500">
                        {selectedWinner ? `${selectedWinner.split(' ')[1]} odds + bonus` : dict?.matches?.selectWinnerFirst || 'Select winner first'}
                    </div>
                </div>
                <div className="bg-slate-600 p-3 rounded-lg border border-slate-500">
                    <div className="text-xs text-gray-400 mb-1">{dict?.matches?.potentialWin || 'Potential Win'}</div>
                    <div className="text-xl font-bold text-green-400">
                        {potentialWinnings} 🌕
                    </div>
                    <div className="text-xs text-gray-500">
                        {betAmount > 0 ? `Bet ${betAmount} × ${selectedMultiplier.toFixed(2)}x` : dict?.matches?.enterBetAmountFirst || 'Enter bet amount'}
                    </div>
                </div>
            </div>

            {/* Multiplier Progress */}
            <div className="space-y-2">
                <div className="text-xs text-gray-300">
                    {dict?.matches?.multiplierIncreases || 'Multiplier increases with more predictions:'}
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                    {(() => {
                        const baseOdds = selectedWinner
                            ? (selectedWinner === player1.name ? player1.odds : player2.odds)
                            : Math.min(player1.odds, player2.odds);

                        const options = [
                            { value: baseOdds, label: `${baseOdds.toFixed(2)}x`, description: '1 prediction' },
                            { value: baseOdds + 0.1, label: `${(baseOdds + 0.05).toFixed(2)}x`, description: '2+ predictions' },
                            { value: baseOdds + 0.2, label: `${(baseOdds + 0.1).toFixed(2)}x`, description: '4+ predictions' },
                            { value: baseOdds + 0.25, label: `${(baseOdds + 0.15).toFixed(2)}x`, description: '6+ predictions' },
                            { value: baseOdds + 0.3, label: `${(baseOdds + 0.2).toFixed(2)}x`, description: '8+ predictions' }
                        ];

                        return options.map((option, index) => (
                            <div
                                key={index}
                                className={`px-2 py-1 rounded-lg border ${selectedMultiplier >= option.value
                                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                                    : 'bg-slate-600 text-gray-400 border-slate-500'
                                    }`}
                            >
                                {option.label}
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>
    );
} 