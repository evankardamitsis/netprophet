'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@netprophet/ui';

import { Match } from '@/types/dashboard';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { usePredictionSlipCollapse } from '../../app/ClientLayout';
import { useTheme } from '../Providers';
import { useDictionary } from '@/context/DictionaryContext';
import {
    SESSION_KEYS,
    loadFromSessionStorage,
    saveToSessionStorage,
    clearFormPredictionsForMatch
} from '@/lib/sessionStorage';
import { useWallet, COIN_CONSTANTS } from '@/context/WalletContext';
import { OutrightsForm } from './OutrightsForm';
import { PredictionForm } from './PredictionForm';
import { MatchHeader } from './MatchHeader';
import {
    PredictionOptions,
    createEmptyPredictions,
    getSetsToShowFromResult,
    getSetWinnersFromResult,
    buildPredictionText,
    getPredictionCount,
    hasPredictions,
    calculateMultiplier
} from '@/lib/predictionHelpers';
import { BettingSection } from './BettingSection';


interface MatchDetailProps {
    match: Match | null;
    onAddToPredictionSlip: (match: Match, prediction: string) => void;
    onBack: () => void;
    sidebarOpen?: boolean;
}

function loadFormPredictionsFromSession(matchId: string): PredictionOptions {
    // First try to load from the main form predictions key (record format)
    const stored = loadFromSessionStorage<Record<string, PredictionOptions>>(SESSION_KEYS.FORM_PREDICTIONS, {});
    if (stored[matchId]) {
        return stored[matchId];
    }

    // If not found, try to load from individual key (used by PredictionForm)
    const individualKey = `${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`;
    const individualStored = loadFromSessionStorage<PredictionOptions>(individualKey, createEmptyPredictions());

    return individualStored;
}

function saveFormPredictionsToSession(matchId: string, predictions: PredictionOptions): void {
    // Save to main form predictions key (record format)
    const stored = loadFromSessionStorage<Record<string, PredictionOptions>>(SESSION_KEYS.FORM_PREDICTIONS, {});
    stored[matchId] = predictions;
    saveToSessionStorage(SESSION_KEYS.FORM_PREDICTIONS, stored);

    // Also save to individual key for consistency with PredictionForm
    const individualKey = `${SESSION_KEYS.FORM_PREDICTIONS}_${matchId}`;
    saveToSessionStorage(individualKey, predictions);
}

// Create match details from actual match data
const createMatchDetails = (match: Match) => {
    return {
        tournament: match.tournament,
        player1: {
            name: match.player1.name,
            odds: match.player1.odds,
            wins: match.player_a?.wins || 0,
            losses: match.player_a?.losses || 0
        },
        player2: {
            name: match.player2.name,
            odds: match.player2.odds,
            wins: match.player_b?.wins || 0,
            losses: match.player_b?.losses || 0
        },
        points: match.points,
        headToHead: `${match.player1.name} vs ${match.player2.name}`, // We can enhance this later with actual H2H data
        surface: match.tournaments?.surface || 'Unknown',
        round: match.tournament_categories?.name || 'Unknown',
        format: match.tournaments?.matches_type || 'best-of-3' // Use the tournament's matches_type
    };
};

export function MatchDetail({ match, onAddToPredictionSlip, onBack, sidebarOpen = true }: MatchDetailProps) {
    const { predictions, outrightsPredictions, addPrediction, addOutrightsPrediction, removePrediction, hasPrediction, hasOutrightsPrediction } = usePredictionSlip();
    const { theme } = useTheme();
    const { setIsPredictionSlipCollapsed } = usePredictionSlipCollapse();
    const { placeBet, wallet } = useWallet();
    const { dict, lang } = useDictionary();

    // Local state for the form fields
    const [formPredictions, setFormPredictions] = useState<PredictionOptions>(createEmptyPredictions());

    // Tab state
    const [activeTab, setActiveTab] = useState<'match' | 'outrights'>('match');



    // Outrights state
    const [outrightsBetAmount, setOutrightsBetAmount] = useState<number>(0);
    const [outrightsMultiplier, setOutrightsMultiplier] = useState<number>(1.2);
    const [selectedTournamentWinner, setSelectedTournamentWinner] = useState<string>('');
    const [selectedFinalsPair, setSelectedFinalsPair] = useState<string>('');

    // Track form changes to enable/disable CTA
    const [hasFormChanged, setHasFormChanged] = useState<boolean>(false);
    const [hasOutrightsFormChanged, setHasOutrightsFormChanged] = useState<boolean>(false);

    // Wrapper functions for outrights state setters that track changes
    const handleTournamentWinnerChange = (winner: string) => {
        setSelectedTournamentWinner(winner);
        setHasOutrightsFormChanged(true);
    };

    const handleFinalsPairChange = (pair: string) => {
        setSelectedFinalsPair(pair);
        setHasOutrightsFormChanged(true);
    };

    // Load form predictions from session storage when match changes
    useEffect(() => {
        if (match) {
            const existing = predictions.find(p => p.matchId === match.id);
            if (existing && typeof existing.prediction === 'object' && existing.prediction !== null && 'winner' in existing.prediction) {
                // Merge existing prediction with new fields to ensure compatibility
                const mergedPredictions = { ...createEmptyPredictions(), ...existing.prediction };
                setFormPredictions(mergedPredictions);
                // Don't set form change flag since this is loading existing data
            } else {
                // Load from session storage if no existing prediction
                const sessionPredictions = loadFormPredictionsFromSession(match.id);
                setFormPredictions(sessionPredictions);
                // Don't set form change flag since this is loading existing data
            }

            // Load saved outrights selections
            const outrightsStorageKey = `${SESSION_KEYS.FORM_PREDICTIONS}_outrights_${match.id}`;
            const savedOutrights = loadFromSessionStorage(outrightsStorageKey, {
                selectedCategory: '',
                selectedTournamentWinner: '',
                selectedFinalsPair: ''
            });

            if (savedOutrights.selectedTournamentWinner) {
                setSelectedTournamentWinner(savedOutrights.selectedTournamentWinner);
            }
            if (savedOutrights.selectedFinalsPair) {
                setSelectedFinalsPair(savedOutrights.selectedFinalsPair);
            }

            // Reset form change flags when match changes
            setHasFormChanged(false);
            setHasOutrightsFormChanged(false);
        }
    }, [match, predictions]);

    // Dynamic calculations based on form predictions (must be before conditional returns)
    const details = match ? createMatchDetails(match) : null;
    const predictionCount = useMemo(() => getPredictionCount(formPredictions), [formPredictions]);
    const hasAnyPredictions = useMemo(() => hasPredictions(formPredictions), [formPredictions]);

    // Calculate dynamic multiplier based on selections
    const selectedMultiplier = useMemo(() => {
        if (!formPredictions.winner || !details) return 1.0;

        return calculateMultiplier(
            formPredictions.winner,
            details.player1,
            details.player2,
            predictionCount
        );
    }, [formPredictions.winner, predictionCount, details]);

    // Default bet amount (will be set in slip)
    const betAmount = 0;
    const potentialWinnings = Math.round(betAmount * selectedMultiplier);

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
                    <h2 className="text-2xl font-semibold text-white mb-2">{dict?.matches?.selectMatch || 'Select a Match'}</h2>
                    <p className="text-gray-400">{dict?.matches?.selectMatchDescription || 'Choose a match from the sidebar to view details and make predictions'}</p>
                </div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="flex-1 bg-[#0F0F0F] text-white">
                <div className="text-center py-12 px-6">
                    <h2 className="text-2xl font-semibold text-white mb-2">{dict?.matches?.matchNotFound || 'Match Not Found'}</h2>
                    <p className="text-gray-400">{dict?.matches?.matchNotFoundDescription || 'Details for this match are not available'}</p>
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
        setHasFormChanged(true);
    };

    const handleSubmitPredictions = () => {
        const predictionText = buildPredictionText(formPredictions);

        if (predictionText) {
            // Add prediction to slip (bet amount will be set in the slip)
            addPrediction({
                matchId: match.id,
                match,
                prediction: formPredictions,
                points: match.points,
                betAmount: 0, // Start with 0, user will set in slip
                multiplier: selectedMultiplier,
                potentialWinnings: 0, // Will be calculated in slip based on bet amount
            });
            setIsPredictionSlipCollapsed(false); // Open slip if closed

            // Clear form predictions from session storage after successful submission
            clearFormPredictionsForMatch(match.id);

            // Reset form change flag after successful submission
            setHasFormChanged(false);
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
                className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
                <option value="">{dict?.matches?.selectSetScore?.replace('{setNumber}', setNumber.toString()) || `Select set ${setNumber} score`}</option>
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

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full text-white">
            {/* Compact Header Section */}
            <div className="p-0 sm:p-2 pb-2 flex-shrink-0">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">{dict?.matches?.backToMatches || 'Back to Matches'}</span>
                </button>

                <h1 className="text-lg sm:text-xl font-bold text-white mb-1">{dict?.matches?.matchDetails || 'Match Details'}</h1>
                <p className="text-gray-400 text-xs">{dict?.matches?.loading || 'Monitor live tennis events and place your predictions'}</p>
            </div>

            {/* Tab Navigation */}
            <div className="px-0 sm:px-4 pb-2">
                <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('match')}
                        className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'match'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-600/50 border-2 border-slate-500/60 text-gray-200 hover:text-white hover:bg-slate-600/70 hover:border-slate-400/70'
                            }`}
                    >
                        {dict?.matches?.matchTab || 'Match'}
                    </button>
                    <button
                        onClick={() => setActiveTab('outrights')}
                        className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'outrights'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-600/50 border-2 border-slate-500/60 text-gray-200 hover:text-white hover:bg-slate-600/70 hover:border-slate-400/70'
                            }`}
                    >
                        {dict?.matches?.outrightsTab || 'Outrights'}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'match' ? (
                /* Match Tab Content */
                <div className="px-0 sm:px-4 flex-1 flex flex-col lg:flex-row gap-0 sm:gap-4 min-h-0">
                    {/* Left Column: MatchHeader - Full width on mobile, 20% on large screens */}
                    <div className="w-full lg:w-1/5 flex-shrink-0">
                        <MatchHeader
                            match={match}
                            details={details}
                            player1Id={match.player_a_id}
                            player2Id={match.player_b_id}
                        />
                    </div>

                    {/* Right Column: Prediction Form - Full width on mobile, 80% on large screens */}
                    <div className="w-full lg:w-4/5 flex-1 min-h-0 flex flex-col mt-4">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-full relative">
                            <div className="p-0 sm:p-4 border-b border-slate-700/50 flex-shrink-0 mt-4">
                                <h2 className="text-base sm:text-lg font-bold text-white mb-1 px-4">{dict?.matches?.makePredictions || 'Make your predictions'}</h2>

                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 pb-20 sm:pb-24 flex flex-col">
                                <div className="p-0 sm:p-4 pb-0 flex-1">
                                    <PredictionForm
                                        matchId={match.id}
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
                                        locked={match.locked || false}
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-0 sm:p-4 border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm z-10">
                                <button
                                    onClick={handleSubmitPredictions}
                                    disabled={!hasAnyPredictions || !hasFormChanged || match.locked || false}
                                    className={`w-full py-2.5 sm:py-3 px-4 rounded-lg font-semibold transition-colors text-sm ${match.locked
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : (hasAnyPredictions && hasFormChanged
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed')
                                        }`}
                                >
                                    {match.locked ? (dict?.sidebar?.locked || 'LOCKED') : (hasAnyPredictions ? (hasPrediction(match.id) ? dict?.matches?.updateSlip || 'Update Slip' : dict?.matches?.addToSlip || 'Add to Slip') : dict?.matches?.selectAtLeastOne || 'Select at least one prediction')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Outrights Tab Content */
                <div className="px-0 sm:px-4 flex-1 flex flex-col gap-0 sm:gap-4 min-h-0">
                    {/* OutrightsForm - Full Width */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-full relative">
                            <div className="p-0 sm:p-4 border-b border-slate-700/50 flex-shrink-0">
                                <h2 className="text-base sm:text-lg font-bold text-white mb-1">{dict?.matches?.outrights || 'Outrights'}</h2>
                                <p className="text-gray-400 text-xs">{dict?.matches?.outrightsDescription || 'Predict the tournament winner and finals pair for big wins!'}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 pb-20 sm:pb-24 flex flex-col">
                                <div className="p-0 sm:p-4 pb-0 flex-1">
                                    <OutrightsForm
                                        matchId={match.id}
                                        selectedTournamentWinner={selectedTournamentWinner}
                                        selectedFinalsPair={selectedFinalsPair}
                                        onTournamentWinnerChange={handleTournamentWinnerChange}
                                        onFinalsPairChange={handleFinalsPairChange}
                                        tournament={details.tournament}
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-0 sm:p-4 border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm z-10">
                                <button
                                    onClick={() => {
                                        // Handle outrights submission
                                        const hasOutrightsPredictions = selectedTournamentWinner || selectedFinalsPair;
                                        if (hasOutrightsPredictions) {
                                            // Add to outrights predictions (separate from regular predictions)
                                            addOutrightsPrediction({
                                                matchId: match.id,
                                                match,
                                                prediction: {
                                                    tournamentWinner: selectedTournamentWinner,
                                                    finalsPair: selectedFinalsPair
                                                },
                                                points: match.points * 2, // Higher points for outrights
                                                betAmount: 0, // Start with 0, user will set in slip
                                                multiplier: outrightsMultiplier,
                                                potentialWinnings: 0, // Will be calculated in slip based on bet amount
                                                isOutrights: true
                                            });
                                            setIsPredictionSlipCollapsed(false);

                                            // Reset form change flag after successful submission
                                            setHasOutrightsFormChanged(false);
                                        }
                                    }}
                                    disabled={!selectedTournamentWinner && !selectedFinalsPair || !hasOutrightsFormChanged || match.locked || false}
                                    className={`w-full py-2.5 sm:py-3 px-4 rounded-lg font-semibold transition-colors text-sm ${match.locked
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : ((selectedTournamentWinner || selectedFinalsPair) && hasOutrightsFormChanged
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed')
                                        }`}
                                >
                                    {match.locked ? (dict?.sidebar?.locked || 'LOCKED') : ((selectedTournamentWinner || selectedFinalsPair) ? (hasOutrightsPrediction(match.id) ? dict?.matches?.updateSlip || 'Update Slip' : dict?.matches?.addToSlip || 'Add to Slip') : 'Select at least one outright prediction')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
