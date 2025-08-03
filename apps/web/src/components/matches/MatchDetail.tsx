'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@netprophet/ui';

import { Match } from '@/types/dashboard';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { usePredictionSlipCollapse } from '../../app/ClientLayout';
import { useTheme } from '../Providers';
import {
    SESSION_KEYS,
    loadFromSessionStorage,
    saveToSessionStorage,
    clearFormPredictionsForMatch
} from '@/lib/sessionStorage';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { BettingSection } from './BettingSection';
import { PredictionForm } from './PredictionForm';
import { MatchHeader } from './MatchHeader';
import {
    PredictionOptions,
    createEmptyPredictions,
    getSetsToShowFromResult,
    getSetWinnersFromResult,
    buildPredictionText,
    getPredictionCount,
    hasPredictions
} from '@/lib/predictionHelpers';

interface MatchDetailProps {
    match: Match | null;
    onAddToPredictionSlip: (match: Match, prediction: string) => void;
    onBack: () => void;
    sidebarOpen?: boolean;
}

function loadFormPredictionsFromSession(matchId: number): PredictionOptions {
    const stored = loadFromSessionStorage<Record<number, PredictionOptions>>(SESSION_KEYS.FORM_PREDICTIONS, {});
    return stored[matchId] || createEmptyPredictions();
}

function saveFormPredictionsToSession(matchId: number, predictions: PredictionOptions): void {
    const stored = loadFromSessionStorage<Record<number, PredictionOptions>>(SESSION_KEYS.FORM_PREDICTIONS, {});
    stored[matchId] = predictions;
    saveToSessionStorage(SESSION_KEYS.FORM_PREDICTIONS, stored);
}

// Mock match data with additional details
const getMatchDetails = (matchId: number) => {
    const matchDetails = {
        1: {
            tournament: 'Roland Garros 2024',
            player1: { name: 'Rafael Nadal', country: '🇪🇸', ranking: 1, odds: 2.15, wins: 22, losses: 8 },
            player2: { name: 'Novak Djokovic', country: '🇷🇸', ranking: 2, odds: 1.85, wins: 24, losses: 6 },
            points: 250,
            headToHead: 'Nadal leads 30-29',
            surface: 'Clay',
            round: 'Final',
            format: 'best-of-5' // Grand Slam final
        },
        2: {
            tournament: 'Roland Garros 2024',
            player1: { name: 'Carlos Alcaraz', country: '🇪🇸', ranking: 3, odds: 1.65, wins: 20, losses: 10 },
            player2: { name: 'Daniil Medvedev', country: '🇷🇺', ranking: 4, odds: 2.35, wins: 18, losses: 12 },
            points: 200,
            headToHead: 'Alcaraz leads 3-2',
            surface: 'Clay',
            round: 'Semi-Final',
            format: 'best-of-5' // Grand Slam semi-final
        },
        3: {
            tournament: 'Roland Garros 2024',
            player1: { name: 'Jannik Sinner', country: '🇮🇹', ranking: 5, odds: 1.95, wins: 19, losses: 11 },
            player2: { name: 'Alexander Zverev', country: '🇩🇪', ranking: 6, odds: 1.95, wins: 17, losses: 13 },
            points: 180,
            headToHead: 'Sinner leads 4-3',
            surface: 'Clay',
            round: 'Quarter-Final',
            format: 'best-of-5' // Grand Slam quarter-final
        },
        4: {
            tournament: 'Wimbledon 2024',
            player1: { name: 'Andy Murray', country: '🇬🇧', ranking: 7, odds: 2.50, wins: 15, losses: 15 },
            player2: { name: 'Stefanos Tsitsipas', country: '🇬🇷', ranking: 8, odds: 1.60, wins: 21, losses: 9 },
            points: 150,
            headToHead: 'Tsitsipas leads 2-1',
            surface: 'Grass',
            round: 'Third Round',
            format: 'best-of-3' // Early rounds
        },
        5: {
            tournament: 'Local Amateur Tournament',
            player1: { name: 'John Smith', country: '🇺🇸', ranking: 150, odds: 1.80, wins: 12, losses: 8 },
            player2: { name: 'Mike Johnson', country: '🇺🇸', ranking: 180, odds: 2.20, wins: 10, losses: 10 },
            points: 50,
            headToHead: 'Smith leads 3-2',
            surface: 'Hard',
            round: 'Final',
            format: 'best-of-3-super-tiebreak' // Amateur format with super tiebreak
        },
        6: {
            tournament: 'Local Amateur Tournament',
            player1: { name: 'John Smith', country: '🇺🇸', ranking: 150, odds: 1.80, wins: 12, losses: 8 },
            player2: { name: 'Mike Johnson', country: '🇺🇸', ranking: 180, odds: 2.20, wins: 10, losses: 10 },
            points: 50,
            headToHead: 'Smith leads 3-2',
            surface: 'Hard',
            round: 'Final',
            format: 'best-of-3-super-tiebreak' // Amateur format with super tiebreak
        }
    };
    return matchDetails[matchId as keyof typeof matchDetails];
};

export function MatchDetail({ match, onAddToPredictionSlip, onBack, sidebarOpen = true }: MatchDetailProps) {
    const { predictions, addPrediction, removePrediction } = usePredictionSlip();
    const { theme } = useTheme();
    const { setIsPredictionSlipCollapsed } = usePredictionSlipCollapse();
    const { placeBet, wallet } = useWallet();

    // Local state for the form fields
    const [formPredictions, setFormPredictions] = useState<PredictionOptions>(createEmptyPredictions());
    const [betAmount, setBetAmount] = useState<number>(10); // Default bet amount
    const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1.5); // Default multiplier

    // Load form predictions from session storage when match changes
    useEffect(() => {
        if (match) {
            const existing = predictions.find(p => p.matchId === match.id);
            if (existing && typeof existing.prediction === 'object' && existing.prediction !== null && 'winner' in existing.prediction) {
                // Merge existing prediction with new fields to ensure compatibility
                const mergedPredictions = { ...createEmptyPredictions(), ...existing.prediction };
                setFormPredictions(mergedPredictions);
            } else {
                // Load from session storage if no existing prediction
                const sessionPredictions = loadFormPredictionsFromSession(match.id);
                setFormPredictions(sessionPredictions);
            }
        }
    }, [match, predictions]);

    // Save form predictions to session storage whenever they change
    useEffect(() => {
        if (match) {
            saveFormPredictionsToSession(match.id, formPredictions);
        }
    }, [formPredictions, match]);

    if (!match) {
        return (
            <div className="flex-1 bg-[#0F0F0F] text-white">
                <div className="text-center py-12 px-6">
                    <div className="text-6xl mb-4">🎾</div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Select a Match</h2>
                    <p className="text-gray-400">Choose a match from the sidebar to view details and make predictions</p>
                </div>
            </div>
        );
    }

    const details = getMatchDetails(match.id);
    if (!details) {
        return (
            <div className="flex-1 bg-[#0F0F0F] text-white">
                <div className="text-center py-12 px-6">
                    <h2 className="text-2xl font-semibold text-white mb-2">Match Not Found</h2>
                    <p className="text-gray-400">Details for this match are not available</p>
                </div>
            </div>
        );
    }

    const handlePredictionChange = (type: keyof PredictionOptions, value: string) => {
        setFormPredictions(prev => {
            const newPredictions = { ...prev, [type]: value };

            // If winner changes, clear dependent predictions
            if (type === 'winner') {
                newPredictions.matchResult = '';
                newPredictions.set1Score = '';
                newPredictions.set2Score = '';
                newPredictions.set3Score = '';
                newPredictions.set4Score = '';
                newPredictions.set5Score = '';
                newPredictions.set1Winner = '';
                newPredictions.set2Winner = '';
                newPredictions.set3Winner = '';
                newPredictions.set4Winner = '';
                newPredictions.set5Winner = '';
            }

            // If match result changes, clear set-specific predictions
            if (type === 'matchResult') {
                newPredictions.set1Score = '';
                newPredictions.set2Score = '';
                newPredictions.set3Score = '';
                newPredictions.set4Score = '';
                newPredictions.set5Score = '';
                newPredictions.set1Winner = '';
                newPredictions.set2Winner = '';
                newPredictions.set3Winner = '';
                newPredictions.set4Winner = '';
                newPredictions.set5Winner = '';
            }

            return newPredictions;
        });
    };

    const handleSubmitPredictions = () => {
        const predictionText = buildPredictionText(formPredictions);

        if (predictionText) {
            // Validate bet amount
            if (betAmount < COIN_CONSTANTS.MIN_BET) {
                alert(`Minimum bet amount is ${COIN_CONSTANTS.MIN_BET} 🌕`);
                return;
            }

            if (betAmount > wallet.balance) {
                alert(`Insufficient balance. You have ${wallet.balance} 🌕 but trying to bet ${betAmount} 🌕`);
                return;
            }

            // Add prediction to slip with betting information (don't place bet yet)
            addPrediction({
                matchId: match.id,
                match,
                prediction: formPredictions,
                points: match.points,
                betAmount: betAmount,
                multiplier: selectedMultiplier,
                potentialWinnings: potentialWinnings,
            });
            setIsPredictionSlipCollapsed(false); // Open slip if closed

            // Clear form predictions from session storage after successful submission
            clearFormPredictionsForMatch(match.id);
        }
    };

    // Helper function to render set score dropdowns
    const renderSetScoreDropdown = (setNumber: number, value: string, onChange: (value: string) => void) => {
        const setWinner = getSetWinner(setNumber);

        // All possible set scores
        const allSetScores = [
            "6-0", "6-1", "6-2", "6-3", "6-4", "7-5", "7-6",
            "6-7", "5-7", "4-6", "3-6", "2-6", "1-6", "0-6"
        ];

        // Filter scores based on set winner
        let availableScores = allSetScores;
        if (setWinner === details.player1.name) {
            // Player 1 wins - show scores where first number > second number
            availableScores = allSetScores.filter(score => {
                const [first, second] = score.split('-').map(Number);
                return first > second;
            });
        } else if (setWinner === details.player2.name) {
            // Player 2 wins - show scores where second number > first number
            availableScores = allSetScores.filter(score => {
                const [first, second] = score.split('-').map(Number);
                return second > first;
            });
        }
        // If no set winner selected, show all scores

        return (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
            >
                <option value="">Select set {setNumber} score</option>
                {availableScores.map(score => (
                    <option key={score} value={score}>{score}</option>
                ))}
            </select>
        );
    };

    // Determine which sets to show based on tournament format
    const isBestOf5 = details.format === 'best-of-5';
    const isAmateurFormat = details.format === 'best-of-3-super-tiebreak';
    const setsToShowFromResult = getSetsToShowFromResult(formPredictions.matchResult, isAmateurFormat);

    // Helper function to get set score value
    const getSetScore = (setNumber: number): string => {
        switch (setNumber) {
            case 1: return formPredictions.set1Score;
            case 2: return formPredictions.set2Score;
            case 3: return formPredictions.set3Score;
            case 4: return formPredictions.set4Score;
            case 5: return formPredictions.set5Score;
            default: return '';
        }
    };

    // Helper function to set set score value
    const setSetScore = (setNumber: number, value: string) => {
        switch (setNumber) {
            case 1: handlePredictionChange('set1Score', value); break;
            case 2: handlePredictionChange('set2Score', value); break;
            case 3: handlePredictionChange('set3Score', value); break;
            case 4: handlePredictionChange('set4Score', value); break;
            case 5: handlePredictionChange('set5Score', value); break;
        }
    };

    // Helper function to get set winner value
    const getSetWinner = (setNumber: number): string => {
        switch (setNumber) {
            case 1: return formPredictions.set1Winner;
            case 2: return formPredictions.set2Winner;
            case 3: return formPredictions.set3Winner;
            case 4: return formPredictions.set4Winner;
            case 5: return formPredictions.set5Winner;
            default: return '';
        }
    };

    // Helper function to set set winner value
    const setSetWinner = (setNumber: number, value: string) => {
        switch (setNumber) {
            case 1: handlePredictionChange('set1Winner', value); break;
            case 2: handlePredictionChange('set2Winner', value); break;
            case 3: handlePredictionChange('set3Winner', value); break;
            case 4: handlePredictionChange('set4Winner', value); break;
            case 5: handlePredictionChange('set5Winner', value); break;
        }
    };

    const setWinnersFromResult = getSetWinnersFromResult(formPredictions.matchResult, formPredictions.winner, details.player1.name, details.player2.name);
    const predictionCount = getPredictionCount(formPredictions);
    const hasAnyPredictions = hasPredictions(formPredictions);
    const potentialWinnings = Math.round(betAmount * selectedMultiplier);

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full bg-[#0F0F0F] text-white">
            {/* Compact Header Section */}
            <div className="p-4 pb-2 flex-shrink-0">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">Back to Matches</span>
                </button>

                <h1 className="text-xl font-bold text-white mb-1">Match Details</h1>
                <p className="text-gray-400 text-xs">Monitor live tennis events and place your predictions</p>
            </div>

            {/* Two-Column Layout: Left Column (MatchHeader + BettingSection) + Right Column (PredictionForm) */}
            <div className="px-4 flex-1 flex gap-4 min-h-0">
                {/* Left Column: MatchHeader + BettingSection */}
                <div className="w-1/3 flex-shrink-0 flex flex-col gap-4 h-full">
                    {/* MatchHeader at the top */}
                    <div className="flex-shrink-0">
                        <MatchHeader match={match} details={details} />
                    </div>

                    {/* BettingSection below MatchHeader */}
                    <div className="flex-1">
                        <BettingSection
                            predictionCount={predictionCount}
                            onBetAmountChange={setBetAmount}
                            onMultiplierChange={setSelectedMultiplier}
                            betAmount={betAmount}
                            selectedMultiplier={selectedMultiplier}
                            selectedWinner={formPredictions.winner}
                            player1={{ name: details.player1.name, odds: details.player1.odds }}
                            player2={{ name: details.player2.name, odds: details.player2.odds }}
                        />
                    </div>
                </div>

                {/* Right Column: Prediction Form - Full Height */}
                <div className="w-2/3 flex-1 min-h-0 flex flex-col h-full ">
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden flex flex-col h-full relative">
                        <div className="p-4 border-b border-[#2A2A2A] flex-shrink-0">
                            <h2 className="text-lg font-bold text-white mb-1">Make your predictions</h2>
                            <p className="text-gray-400 text-xs">Choose from multiple prediction types to maximize your points!</p>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 pb-24 flex flex-col">
                            <div className="p-4 pb-0 flex-1">
                                <PredictionForm
                                    formPredictions={formPredictions}
                                    onPredictionChange={handlePredictionChange}
                                    details={details}
                                    isBestOf5={isBestOf5}
                                    isAmateurFormat={isAmateurFormat}
                                    setsToShowFromResult={setsToShowFromResult}
                                    setWinnersFromResult={setWinnersFromResult}
                                    renderSetScoreDropdown={renderSetScoreDropdown}
                                    getSetScore={getSetScore}
                                    setSetScore={setSetScore}
                                    getSetWinner={getSetWinner}
                                    setSetWinner={setSetWinner}
                                />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2A2A2A] bg-[#1A1A1A] z-10">
                            <button
                                onClick={handleSubmitPredictions}
                                disabled={!hasAnyPredictions || betAmount < COIN_CONSTANTS.MIN_BET || betAmount > Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)}
                                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors text-sm ${hasAnyPredictions && betAmount >= COIN_CONSTANTS.MIN_BET && betAmount <= Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {hasAnyPredictions ? `Make your prediction: ${betAmount} 🌕 (${selectedMultiplier.toFixed(1)}x) - Win ${potentialWinnings} 🌕` : 'Select at least one prediction'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
