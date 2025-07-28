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
    const { wallet } = useWallet();
    const { theme } = useTheme();

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
        <div className="space-y-4 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50">
            <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>💰 Place Your Bet</h3>

            {/* Bet Amount Input */}
            <div className="space-y-2">
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Bet Amount (🌕)
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min={COIN_CONSTANTS.MIN_BET}
                        max={Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)}
                        value={betAmount}
                        onChange={(e) => onBetAmountChange(Number(e.target.value))}
                        className={`flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
                        placeholder="Enter bet amount"
                    />
                    <div className="flex gap-1">
                        {[10, 25, 50, 100].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => onBetAmountChange(amount)}
                                className={`px-3 py-2 text-sm rounded-md border transition ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} ${betAmount === amount ? 'bg-blue-500 text-white border-blue-500' : ''}`}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Min: {COIN_CONSTANTS.MIN_BET} 🌕 | Max: {Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)} 🌕 | Balance: {wallet.balance} 🌕
                </div>
            </div>

            {/* Multiplier Display */}
            <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border border-gray-200`}>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Multiplier</div>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                        {selectedMultiplier.toFixed(2)}x
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {selectedWinner ? `${selectedWinner.split(' ')[1]} odds + complexity bonus` : 'Select winner first'}
                    </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border border-gray-200`}>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Potential Win</div>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {potentialWinnings} 🌕
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        +{potentialWinnings - betAmount} profit
                    </div>
                </div>
            </div>

            {/* Multiplier Progress */}
            <div className="space-y-2">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Multiplier increases with more predictions:
                </div>
                <div className="flex gap-2 text-xs">
                    {getMultiplierOptions(player1, player2).map((option, index) => (
                        <div
                            key={index}
                            className={`px-2 py-1 rounded ${selectedMultiplier >= option.value ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 