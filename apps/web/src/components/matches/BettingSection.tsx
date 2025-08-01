'use client';

import { useState, useEffect } from 'react';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { useTheme } from '../Providers';
import { calculateMultiplier, getMultiplierOptions, PlayerOdds } from '@/lib/predictionHelpers';

interface BettingSectionProps {
    predictionCount: number;
    onBetAmountChange: (amount: number) => void;
    onMultiplierChange: (multiplier: number) => void;
    betAmount: number;
    selectedMultiplier: number;
    selectedWinner: string;
    player1: PlayerOdds;
    player2: PlayerOdds;
}

export function BettingSection({
    predictionCount,
    onBetAmountChange,
    onMultiplierChange,
    betAmount,
    selectedMultiplier,
    selectedWinner,
    player1,
    player2
}: BettingSectionProps) {

    const { theme } = useTheme();
    const { wallet } = useWallet();

    // Calculate potential winnings based on bet amount and multiplier
    const potentialWinnings = Math.round(betAmount * selectedMultiplier);

    // Update multiplier based on selected winner and prediction count
    useEffect(() => {
        if (selectedWinner) {
            const newMultiplier = calculateMultiplier(selectedWinner, player1, player2, predictionCount);
            onMultiplierChange(newMultiplier);
        }
    }, [selectedWinner, predictionCount, player1, player2, onMultiplierChange]);

    return (
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <h3 className="text-base font-bold text-white mb-3">💰 Place Your Bet</h3>

            {/* Bet Amount Input */}
            <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-gray-300">
                    Bet Amount (🌕)
                </label>
                <div className="flex gap-1">
                    <input
                        type="number"
                        min={COIN_CONSTANTS.MIN_BET}
                        max={Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)}
                        value={betAmount}
                        onChange={(e) => onBetAmountChange(Number(e.target.value))}
                        className="flex-1 p-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Enter bet amount"
                    />
                    <div className="flex gap-1">
                        {[10, 25, 50, 100].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => onBetAmountChange(amount)}
                                className={`px-2 py-2 text-xs rounded-lg border transition-colors ${betAmount === amount
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-xs text-gray-400">
                    Min: {COIN_CONSTANTS.MIN_BET} 🌕 | Max: {Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)} 🌕 | Balance: {wallet.balance} 🌕
                </div>
            </div>

            {/* Multiplier Display */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#2A2A2A] p-3 rounded-lg border border-[#3A3A3A]">
                    <div className="text-xs text-gray-400 mb-1">Multiplier</div>
                    <div className="text-xl font-bold text-purple-400">
                        {selectedMultiplier.toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-500">
                        {selectedWinner ? `${selectedWinner.split(' ')[1]} odds + bonus` : 'Select winner first'}
                    </div>
                </div>
                <div className="bg-[#2A2A2A] p-3 rounded-lg border border-[#3A3A3A]">
                    <div className="text-xs text-gray-400 mb-1">Potential Win</div>
                    <div className="text-xl font-bold text-green-400">
                        {potentialWinnings} 🌕
                    </div>
                    <div className="text-xs text-gray-500">
                        +{potentialWinnings - betAmount} profit
                    </div>
                </div>
            </div>

            {/* Multiplier Progress */}
            <div className="space-y-2">
                <div className="text-xs text-gray-300">
                    Multiplier increases with more predictions:
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                    {getMultiplierOptions(player1, player2).map((option, index) => (
                        <div
                            key={index}
                            className={`px-2 py-1 rounded-lg border ${selectedMultiplier >= option.value
                                ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                                : 'bg-[#2A2A2A] text-gray-400 border-[#3A3A3A]'
                                }`}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 