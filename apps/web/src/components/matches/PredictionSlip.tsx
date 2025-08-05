'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Button } from '@netprophet/ui';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useWallet } from '@/context/WalletContext';
import { useDictionary } from '@/context/DictionaryContext';
import { useState, useEffect } from 'react';
import {
    calculateParlayOdds,
    calculateSafeBetCost,
    formatParlayOdds,
    formatWinnings,
    getBonusDescription,
    validateParlayBet,
    PARLAY_CONSTANTS
} from '@netprophet/lib';
import { PredictionItem } from '@/types/dashboard';
// BetsService will be imported dynamically in handleSubmit
import {
    SESSION_KEYS,
    removeFromSessionStorage,
    clearFormPredictionsForMatch
} from '@/lib/sessionStorage';

// Icon component
function XIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
}

function BettingSlipIcon({ className = "h-8 w-8 text-green-500" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
}

function ChevronUpIcon() {
    return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
}

function ShieldIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
}

function ParlayIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
}

interface PredictionSlipProps {
    onRemovePrediction: (matchId: number) => void;
    onSubmitPredictions: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function PredictionSlip({
    onRemovePrediction,
    onSubmitPredictions,
    isCollapsed = false,
    onToggleCollapse
}: PredictionSlipProps) {
    const { predictions, outrightsPredictions, clearPredictions, clearOutrightsPredictions, removePrediction, removeOutrightsPrediction } = usePredictionSlip();
    const { wallet, placeBet } = useWallet();
    const { dict, lang } = useDictionary();

    // Parlay state
    const [isParlayMode, setIsParlayMode] = useState<boolean>(false);
    const [isSafeBet, setIsSafeBet] = useState<boolean>(false);
    const [userStreak, setUserStreak] = useState<number>(5); // Mock user streak - in real app this would come from user stats
    const [safeBetTokens, setSafeBetTokens] = useState<number>(3); // Mock safe bet tokens

    // Reset parlay mode if less than 2 predictions
    useEffect(() => {
        if (predictions.length < 2 && isParlayMode) {
            setIsParlayMode(false);
        }
    }, [predictions.length, isParlayMode]);

    // Convert StructuredPredictionItem to PredictionItem for parlay calculations
    const predictionItems: PredictionItem[] = predictions.map(p => ({
        matchId: p.matchId,
        match: p.match,
        prediction: formatPrediction(p.prediction),
        points: p.points || 0
    }));

    // Calculate individual bet totals using existing betAmount from predictions
    const getTotalIndividualStake = () => {
        return predictions.reduce((total, prediction) => {
            return total + (prediction.betAmount || 0);
        }, 0);
    };

    const getTotalIndividualWinnings = () => {
        return predictions.reduce((total, prediction) => {
            return total + (prediction.potentialWinnings || 0);
        }, 0);
    };

    // Use total individual stake as parlay stake
    const parlayStake = getTotalIndividualStake();

    // Calculate parlay odds and winnings (only when in parlay mode)
    const parlayCalculation = isParlayMode ? calculateParlayOdds(predictionItems, parlayStake, userStreak, isSafeBet) : null;
    const bonusDescriptions = isParlayMode ? getBonusDescription(predictionItems, userStreak) : [];
    const safeBetCost = isParlayMode ? calculateSafeBetCost(predictions.length) : 0;
    const parlayValidation = isParlayMode ? validateParlayBet(predictionItems, parlayStake, wallet.balance) : null;

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

    const handleSubmit = async () => {
        try {
            // Dynamic import to work around module resolution issue
            const { BetsService: BetsServiceModule } = await import('@netprophet/lib');

            if (isParlayMode) {
                // Parlay mode - place single parlay bet
                if (!parlayValidation?.isValid) {
                    alert(parlayValidation?.error || 'Invalid parlay bet');
                    return;
                }

                // Create parlay bet using the new parlay method
                const parlayPredictions = predictionItems.map((item, index) => ({
                    matchId: item.matchId.toString(),
                    betAmount: item.points || 0,
                    multiplier: (item.match.player1.odds + item.match.player2.odds) / 2,
                    prediction: formatPrediction(item.prediction),
                    description: `${item.match.player1.name} vs ${item.match.player2.name}`
                }));

                await BetsServiceModule.createParlayBet({
                    predictions: parlayPredictions,
                    totalStake: parlayStake,
                    baseOdds: parlayCalculation!.baseOdds,
                    finalOdds: parlayCalculation!.finalOdds,
                    bonusMultiplier: parlayCalculation!.bonusMultiplier,
                    streakBooster: parlayCalculation!.streakBooster,
                    isSafeBet: isSafeBet,
                    safeBetCost: safeBetCost
                });

                // Update wallet balance
                await placeBet(
                    parlayStake,
                    1, // Using a simple number for matchId
                    `${dict?.matches?.parlayBetDescription?.replace('{count}', predictionItems.length.toString()).replace('{odds}', formatParlayOdds(parlayCalculation!.finalOdds)) || `Parlay bet - ${predictionItems.length} predictions - ${formatParlayOdds(parlayCalculation!.finalOdds)}x odds`}`
                );

                // Use safe bet token if enabled
                if (isSafeBet) {
                    setSafeBetTokens(prev => prev - 1);
                }
            } else {
                // Individual mode - place separate bets for each prediction using existing betAmount
                for (const prediction of predictions) {
                    const betAmount = prediction.betAmount || 0;
                    if (betAmount > 0) {
                        const placeholderMatchId = '00000000-0000-0000-0000-000000000001';
                        const multiplier = prediction.multiplier || 1;
                        const potentialWinnings = prediction.potentialWinnings || 0;

                        await BetsServiceModule.createBet({
                            matchId: placeholderMatchId,
                            betAmount: betAmount,
                            multiplier: multiplier,
                            potentialWinnings: potentialWinnings,
                            prediction: formatPrediction(prediction.prediction),
                            description: `${prediction.match.player1.name} vs ${prediction.match.player2.name} - ${multiplier.toFixed(2)}x multiplier`
                        });

                        // Update wallet balance
                        await placeBet(
                            betAmount,
                            1, // Using a simple number for matchId
                            `${dict?.matches?.individualBetDescription?.replace('{name}', `${prediction.match.player1.name} vs ${prediction.match.player2.name}`).replace('{multiplier}', multiplier.toFixed(2)) || `${prediction.match.player1.name} vs ${prediction.match.player2.name} - ${multiplier.toFixed(2)}x multiplier`}`
                        );
                    }
                }
            }

            // Call the original submit handler
            onSubmitPredictions();

            // Clear the slip after successful placement
            clearPredictions();

            // Clear all form predictions from session storage when submitting
            removeFromSessionStorage(SESSION_KEYS.FORM_PREDICTIONS);

        } catch (error) {
            // Handle insufficient balance or other errors
            if (error instanceof Error) {
                alert(`Error placing ${isParlayMode ? 'parlay' : 'individual'} bet(s): ${error.message}`);
            } else {
                alert(`Error placing ${isParlayMode ? 'parlay' : 'individual'} bet(s). Please check your balance and try again.`);
            }
        }
    };

    const handleRemovePrediction = (matchId: number) => {
        removePrediction(matchId);
        // Clear form predictions for this match from session storage
        clearFormPredictionsForMatch(matchId);
    };

    function formatPrediction(prediction: any) {
        const parts = [];
        if (prediction.winner) parts.push(`Winner: ${prediction.winner}`);
        if (prediction.matchResult) parts.push(`Result: ${prediction.matchResult}`);
        if (prediction.tieBreak) parts.push(`Tie-break: ${prediction.tieBreak}`);
        if (prediction.totalGames) parts.push(`Games: ${prediction.totalGames}`);
        if (prediction.acesLeader) parts.push(`Aces: ${prediction.acesLeader}`);
        if (prediction.doubleFaults) parts.push(`DF: ${prediction.doubleFaults}`);
        if (prediction.breakPoints) parts.push(`BP: ${prediction.breakPoints}`);
        return parts.join(' | ');
    }

    const handleSafeBetToggle = () => {
        if (!isSafeBet && safeBetTokens < safeBetCost) {
            alert(`You need ${safeBetCost} safe bet tokens to use this feature. You have ${safeBetTokens}.`);
            return;
        }
        setIsSafeBet(!isSafeBet);
    };

    const isIndividualModeValid = () => {
        const totalStake = getTotalIndividualStake();
        return totalStake > 0 && totalStake <= wallet.balance;
    };

    return (
        <motion.div
            className="h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-xl rounded-l-2xl relative overflow-hidden"
            initial={false}
            animate={{
                opacity: isCollapsed ? 0 : 1,
                y: isCollapsed ? 32 : 0,
            }}
            transition={{
                type: "tween",
                duration: 0.3
            }}
            style={{
                transformOrigin: "bottom right"
            }}
        >
            <div className="flex-shrink-0 p-6 border-b border-dashed border-slate-700 bg-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-yellow-300 tracking-wider uppercase">{dict?.matches?.bettingSlip || 'Betting Slip'}</h3>
                {onToggleCollapse && (
                    <motion.button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-yellow-300 transition-colors duration-200 p-1 rounded-full hover:bg-slate-700"
                        title={dict?.matches?.minimizeSlip || 'Minimize slip'}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ChevronUpIcon />
                    </motion.button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {predictions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <BettingSlipIcon className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                        <p>{dict?.matches?.noPredictionsYet || 'No predictions yet'}</p>
                        <p className="text-sm">{dict?.matches?.selectMatchesToAdd || 'Select matches to add to your slip'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Mode Toggle - Only show when 2+ predictions */}
                        {predictions.length >= 2 && (
                            <motion.div
                                className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-lg p-4 border-2 border-purple-400 shadow-lg"
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-white/20 p-2 rounded-full">
                                            <ParlayIcon />
                                        </div>
                                        <div>
                                            <span className="text-white font-bold text-lg">{dict?.matches?.parlayMode || '🎯 Parlay Mode'}</span>
                                            <div className="text-white/80 text-sm font-medium">
                                                {dict?.matches?.predictionsReadyForParlay?.replace('{count}', predictions.length.toString()) || `${predictions.length} predictions ready for parlay!`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsParlayMode(!isParlayMode)}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-lg ${isParlayMode
                                            ? 'bg-white shadow-white/50'
                                            : 'bg-white/30 shadow-white/20'
                                            } cursor-pointer hover:scale-105 active:scale-95`}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full transition-all duration-300 ${isParlayMode
                                                ? 'translate-x-7 bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg'
                                                : 'translate-x-1 bg-white shadow-md'
                                                }`}
                                        />
                                    </button>
                                </div>
                                <div className="text-white/90 text-sm font-medium">
                                    {isParlayMode
                                        ? dict?.matches?.parlayBenefits || '💎 Parlay Benefits: Higher rewards, bonus multipliers, and streak boosters!'
                                        : dict?.matches?.combineAllPredictions || 'Combine all predictions for massive rewards with bonus multipliers!'
                                    }
                                </div>
                            </motion.div>
                        )}

                        {/* Encouragement message for single prediction */}
                        {predictions.length === 1 && (
                            <motion.div
                                className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 border border-blue-400/50"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">🎯</span>
                                    <div className="text-white text-sm">
                                        <span className="font-semibold">{dict?.matches?.addOneMorePrediction || 'Add one more prediction'}</span> {dict?.matches?.unlockParlayMode || 'to unlock exciting parlay mode with bonus rewards!'}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Parlay Summary - Only show when in parlay mode */}
                        {isParlayMode && predictions.length >= 2 && (
                            <motion.div
                                className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-4 border border-purple-500"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="text-center mb-3">
                                    <h4 className="text-lg font-bold text-yellow-200 mb-1">
                                        {dict?.matches?.parlayBet?.replace('{count}', predictions.length.toString()) || `🎯 Parlay Bet (${predictions.length} picks)`}
                                    </h4>
                                    <div className="text-2xl font-bold text-green-400">
                                        {formatParlayOdds(parlayCalculation!.finalOdds)}x
                                    </div>
                                    <div className="text-sm text-slate-300">
                                        {dict?.matches?.base || 'Base'}: {formatParlayOdds(parlayCalculation!.baseOdds)}x
                                    </div>
                                    <div className="text-sm text-blue-300 mt-1">
                                        {dict?.matches?.stakeAutoCalculated?.replace('{stake}', parlayStake.toString()) || `Stake: ${parlayStake} 🌕 (auto-calculated)`}
                                    </div>
                                </div>

                                {/* Bonus Descriptions */}
                                {bonusDescriptions.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                        {bonusDescriptions.map((desc: string, index: number) => (
                                            <div key={index} className="text-xs text-yellow-300 flex items-center">
                                                <span className="mr-2">✨</span>
                                                {desc}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Safe Bet Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <ShieldIcon />
                                        <span className="text-sm text-slate-300">{dict?.matches?.safeBet || 'Safe Bet'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-slate-400">
                                            {safeBetTokens} {dict?.matches?.tokens || 'tokens'}
                                        </span>
                                        <button
                                            onClick={handleSafeBetToggle}
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
                        )}

                        {/* Individual Predictions */}
                        <AnimatePresence>
                            {predictions.map((item, index) => (
                                <motion.div
                                    key={item.matchId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="bg-slate-800 border border-slate-700 rounded-xl shadow-md">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-yellow-200">
                                                        {item.match.player1.name} vs {item.match.player2.name}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-1">{item.match.tournament || (dict?.matches?.tournament || 'Tournament')}</div>
                                                </div>
                                                <motion.button
                                                    onClick={() => handleRemovePrediction(item.matchId)}
                                                    className="text-slate-500 hover:text-red-400 ml-2"
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.8 }}
                                                >
                                                    <XIcon />
                                                </motion.button>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.match.status) === 'destructive' ? 'bg-red-600 text-white' : getStatusColor(item.match.status) === 'secondary' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}>
                                                        {item.match.status === 'live' ? 'LIVE' : item.match.status.toUpperCase()}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{item.match.time}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="text-sm">
                                                    <span className="text-slate-300">{dict?.matches?.pick || 'Pick'}: </span>
                                                    <span className="font-semibold text-yellow-200">{formatPrediction(item.prediction)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                {!isParlayMode && (
                                                    <div className="text-sm">
                                                        <span className="text-slate-300">{dict?.matches?.stake || 'Stake'}: </span>
                                                        <span className="font-semibold text-green-400">
                                                            {item.betAmount || 0} 🌕
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Quick Stats */}
                        <motion.div
                            className="bg-slate-800 rounded-lg p-3 border border-dashed border-yellow-400 mt-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="text-xs text-yellow-300 mb-2 font-semibold">
                                {isParlayMode ? (dict?.matches?.parlayStats || 'Parlay Stats') : (dict?.matches?.individualStats || 'Individual Stats')}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-slate-400">{dict?.matches?.picks || 'Picks'}:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{predictions.length}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">{dict?.matches?.live || 'Live'}:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{predictions.filter(p => p.match.status === 'live').length}</span>
                                </div>
                                {isParlayMode ? (
                                    <>
                                        <div>
                                            <span className="text-slate-400">{dict?.matches?.baseOdds || 'Base Odds'}:</span>
                                            <span className="font-bold ml-1 text-yellow-200">{formatParlayOdds(parlayCalculation!.baseOdds)}x</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">{dict?.matches?.finalOdds || 'Final Odds'}:</span>
                                            <span className="font-bold ml-1 text-yellow-200">{formatParlayOdds(parlayCalculation!.finalOdds)}x</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <span className="text-slate-400">{dict?.matches?.totalStake || 'Total Stake'}:</span>
                                            <span className="font-bold ml-1 text-yellow-200">{getTotalIndividualStake()} 🌕</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">{dict?.matches?.potentialWin || 'Potential Win'}:</span>
                                            <span className="font-bold ml-1 text-yellow-200">{formatWinnings(getTotalIndividualWinnings())} 🌕</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Outrights Predictions Section */}
                {outrightsPredictions.length > 0 && (
                    <div className="space-y-4 mt-6">
                        <div className="border-t border-slate-700 pt-4">
                            <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                                <span className="mr-2">🏆</span>
                                {dict?.matches?.outrights || 'Outrights'} ({outrightsPredictions.length})
                            </h4>
                        </div>

                        <AnimatePresence>
                            {outrightsPredictions.map((item, index) => (
                                <motion.div
                                    key={item.matchId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="bg-purple-900/20 border border-purple-700/50 rounded-xl shadow-md">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-purple-200">
                                                        {item.match.tournament}
                                                    </div>
                                                    <div className="text-xs text-purple-400 mt-1">
                                                        {dict?.matches?.outrights || 'Outrights'} - {dict?.matches?.match || 'Match'}
                                                    </div>
                                                </div>
                                                <motion.button
                                                    onClick={() => removeOutrightsPrediction(item.matchId)}
                                                    className="text-purple-500 hover:text-red-400 ml-2"
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.8 }}
                                                >
                                                    <XIcon />
                                                </motion.button>
                                            </div>

                                            <div className="space-y-2 mb-3">
                                                {item.prediction.tournamentWinner && (
                                                    <div className="bg-purple-800/30 rounded-lg p-2">
                                                        <div className="text-xs text-purple-300 font-medium">
                                                            {dict?.matches?.tournamentWinner || 'Tournament Winner'}:
                                                        </div>
                                                        <div className="text-sm text-purple-100 font-semibold">
                                                            {item.prediction.tournamentWinner}
                                                        </div>
                                                    </div>
                                                )}
                                                {item.prediction.finalsPair && (
                                                    <div className="bg-purple-800/30 rounded-lg p-2">
                                                        <div className="text-xs text-purple-300 font-medium">
                                                            {dict?.matches?.finalsPair || 'Finals Pair'}:
                                                        </div>
                                                        <div className="text-sm text-purple-100 font-semibold">
                                                            {item.prediction.finalsPair}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <div>
                                                    <span className="text-purple-400">{dict?.matches?.stake || 'Stake'}:</span>
                                                    <span className="font-bold ml-1 text-purple-200">{item.betAmount || 0} 🌕</span>
                                                </div>
                                                <div>
                                                    <span className="text-purple-400">{dict?.matches?.potentialWin || 'Potential Win'}:</span>
                                                    <span className="font-bold ml-1 text-purple-200">{item.potentialWinnings || 0} 🌕</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Outrights Submit Section */}
                        <motion.div
                            className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-4 border border-purple-500"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm text-purple-300">
                                    <span>{dict?.matches?.totalStake || 'Total Stake'}: </span>
                                    <span className="font-bold text-purple-200 text-lg">
                                        {outrightsPredictions.reduce((total, item) => total + (item.betAmount || 0), 0)} 🌕
                                    </span>
                                </div>
                                <div className="text-sm text-purple-400">
                                    {dict?.matches?.balance || 'Balance'}: {wallet.balance} 🌕
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm text-purple-300">
                                    <span>{dict?.matches?.potentialWin || 'Potential Win'}: </span>
                                    <span className="font-bold text-purple-200 text-lg">
                                        {outrightsPredictions.reduce((total, item) => total + (item.potentialWinnings || 0), 0)} 🌕
                                    </span>
                                </div>
                                <div className="text-sm text-purple-400">
                                    {outrightsPredictions.length} {dict?.matches?.outrights || 'outrights'}
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    // Handle outrights submission separately
                                    console.log('Submitting outrights predictions:', outrightsPredictions);
                                    // TODO: Implement outrights submission logic
                                }}
                                className="w-full font-bold py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                            >
                                {dict?.matches?.placeOutrightsBet || 'Place Outrights Bet'}
                            </Button>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Sticky Submit Section */}
            <AnimatePresence>
                {predictions.length > 0 && (
                    <motion.div
                        className="flex-shrink-0 p-6 border-t border-dashed border-yellow-400 bg-slate-800 shadow-xl"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ delay: 0.2 }}
                    >
                        {isParlayMode ? (
                            // Parlay Mode Submit Section
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-sm text-slate-300">
                                        <span>{dict?.matches?.parlayStake || 'Parlay Stake'}: </span>
                                        <span className="font-bold text-blue-400 text-lg">{parlayStake} 🌕</span>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {dict?.matches?.balance || 'Balance'}: {wallet.balance} 🌕
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-sm text-slate-300">
                                        <span>{dict?.matches?.potentialWin || 'Potential Win'}: </span>
                                        <span className="font-bold text-yellow-300 text-lg">
                                            {formatWinnings(parlayCalculation!.potentialWinnings)} 🌕
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {formatParlayOdds(parlayCalculation!.finalOdds)}x {dict?.matches?.odds || 'odds'}
                                    </div>
                                </div>

                                {!parlayValidation?.isValid && (
                                    <div className="text-red-400 text-sm mb-3 text-center">
                                        {parlayValidation?.error}
                                    </div>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={!parlayValidation?.isValid}
                                    className={`w-full font-bold py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 ${parlayValidation?.isValid
                                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {dict?.matches?.placeParlayBet || 'Place Parlay Bet'}
                                </Button>
                            </>
                        ) : (
                            // Individual Mode Submit Section
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-sm text-slate-300">
                                        <span>{dict?.matches?.totalStake || 'Total Stake'}: </span>
                                        <span className="font-bold text-blue-400 text-lg">{getTotalIndividualStake()} 🌕</span>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {dict?.matches?.balance || 'Balance'}: {wallet.balance} 🌕
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-sm text-slate-300">
                                        <span>{dict?.matches?.potentialWin || 'Potential Win'}: </span>
                                        <span className="font-bold text-yellow-300 text-lg">
                                            {formatWinnings(getTotalIndividualWinnings())} 🌕
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {predictions.length} {predictions.length !== 1 ? (dict?.matches?.matches || 'matches') : (dict?.matches?.match || 'match')}
                                    </div>
                                </div>

                                {!isIndividualModeValid() && (
                                    <div className="text-red-400 text-sm mb-3 text-center">
                                        {getTotalIndividualStake() === 0 ? (dict?.matches?.pleaseSetStakes || 'Please set stakes for your predictions') : (dict?.matches?.insufficientBalance || 'Insufficient balance')}
                                    </div>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={!isIndividualModeValid()}
                                    className={`w-full font-bold py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 ${isIndividualModeValid()
                                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {dict?.matches?.placeIndividualBets || 'Place Individual Bets'}
                                </Button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Floating button component for when slip is collapsed
interface FloatingPredictionButtonProps {
    predictions: any[]; // Changed from PredictionItem[] to any[]
    onClick: () => void;
}

export function FloatingPredictionButton({ predictions, onClick }: FloatingPredictionButtonProps) {
    const { dict, lang } = useDictionary();
    return (
        <motion.button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-full shadow-2xl transform transition-all duration-200 hover:scale-110 active:scale-95 flex items-center space-x-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
        >
            <BettingSlipIcon className="h-5 w-5" />
            <div className="text-sm font-semibold">
                {predictions.length} {predictions.length !== 1 ? (dict?.matches?.picks || 'picks') : (dict?.matches?.pick || 'pick')}
            </div>
        </motion.button>
    );
} 