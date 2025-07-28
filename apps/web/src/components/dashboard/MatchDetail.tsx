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
                setFormPredictions(existing.prediction);
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
            <div className="flex-1 p-6">
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎾</div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a Match</h2>
                    <p className="text-gray-600">Choose a match from the sidebar to view details and make predictions</p>
                </div>
            </div>
        );
    }

    const details = getMatchDetails(match.id);
    if (!details) {
        return (
            <div className="flex-1 p-6">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Match Not Found</h2>
                    <p className="text-gray-600">Details for this match are not available</p>
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
    const renderSetScoreDropdown = (setNumber: number, value: string, onChange: (value: string) => void) => (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
        >
            <option value="">Select set {setNumber} score</option>
            <option value="6-0">6-0</option>
            <option value="6-1">6-1</option>
            <option value="6-2">6-2</option>
            <option value="6-3">6-3</option>
            <option value="6-4">6-4</option>
            <option value="7-5">7-5</option>
            <option value="7-6">7-6</option>
            <option value="6-7">6-7</option>
            <option value="5-7">5-7</option>
            <option value="4-6">4-6</option>
            <option value="3-6">3-6</option>
            <option value="2-6">2-6</option>
            <option value="1-6">1-6</option>
            <option value="0-6">0-6</option>
        </select>
    );

    // Determine which sets to show based on tournament format
    const isBestOf5 = details.format === 'best-of-5';
    const setsToShowFromResult = getSetsToShowFromResult(formPredictions.matchResult);

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
        <div className={`flex flex-col flex-1 min-h-0 w-full overflow-auto gap-6 ${theme === 'dark' ? 'bg-[#181A20] text-white' : 'bg-white text-black'} ${!sidebarOpen ? 'w-full' : ''}`}>
            {/* Back to Matches button at the top, small and not full width */}
            <div className="mb-2">
                <Button onClick={onBack} variant="outline" size="sm" className={`w-auto px-4 ${theme === 'dark' ? 'border-gray-700 text-gray-200' : 'border-gray-300 text-gray-700'}`}>← Back to Matches</Button>
            </div>

            {/* Match Header with tournament info and player cards */}
            <MatchHeader match={match} details={details} />

            {/* Prediction Form Card */}
            <div className="w-full">
                <Card className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-900/20 to-green-900/20 border-blue-900' : 'bg-gradient-to-r from-blue-50 to-green-50 border-blue-200'} flex-1 flex flex-col h-full`}>
                    <CardHeader>
                        <CardTitle className="text-xl">Make Your Predictions</CardTitle>
                        <p className={`text-gray-600 ${theme === 'dark' ? 'text-gray-400' : ''}`}>Choose from multiple prediction types to maximize your points!</p>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-6 pb-32">
                        {/* Betting Section */}
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

                        {/* Prediction Form */}
                        <PredictionForm
                            formPredictions={formPredictions}
                            onPredictionChange={handlePredictionChange}
                            details={details}
                            isBestOf5={isBestOf5}
                            setsToShowFromResult={setsToShowFromResult}
                            setWinnersFromResult={setWinnersFromResult}
                            renderSetScoreDropdown={renderSetScoreDropdown}
                            getSetScore={getSetScore}
                            setSetScore={setSetScore}
                            getSetWinner={getSetWinner}
                            setSetWinner={setSetWinner}
                        />
                    </CardContent>
                    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50 to-green-50 border-t border-blue-200 p-6 pt-4 z-10">
                        <Button
                            onClick={handleSubmitPredictions}
                            disabled={!hasAnyPredictions || betAmount < COIN_CONSTANTS.MIN_BET || betAmount > Math.min(COIN_CONSTANTS.MAX_BET, wallet.balance)}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                            size="lg"
                        >
                            {hasAnyPredictions ? `Place Bet: ${betAmount} 🌕 (${selectedMultiplier.toFixed(1)}x) - Win ${potentialWinnings} 🌕` : 'Select at least one prediction'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
