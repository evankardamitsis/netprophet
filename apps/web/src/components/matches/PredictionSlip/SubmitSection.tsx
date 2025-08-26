'use client';

import { motion } from 'framer-motion';
import { Button } from '@netprophet/ui';
import { formatWinnings, formatParlayOdds } from '@netprophet/lib';
import { COIN_CONSTANTS } from '@/context/WalletContext';

// Function to calculate potential leaderboard points
function calculatePotentialLeaderboardPoints(predictions: any[], isParlayMode: boolean, parlayCalculation: any, doublePointsMatchId?: string | null): number {
    if (isParlayMode && parlayCalculation) {
        // For parlay mode, calculate points for the entire parlay
        let basePoints = 10; // Base points for winning

        // Add high odds bonus if parlay odds >= 2.0
        if (parlayCalculation.finalOdds >= 2.0) {
            basePoints += Math.floor(parlayCalculation.finalOdds * 5);
        }

        // Add parlay bonus
        if (parlayCalculation.finalOdds > 1.0) {
            basePoints += Math.floor(parlayCalculation.finalOdds * 10);
        }

        // Apply Double Points Match power-up if active (for parlay, it applies to the entire parlay)
        if (doublePointsMatchId) {
            basePoints = Math.floor(basePoints * 2);
        }

        return basePoints;
    } else {
        // For individual mode, calculate points for each prediction
        let totalPoints = 0;

        for (const prediction of predictions) {
            const multiplier = prediction.multiplier || 1;
            let predictionPoints = 10; // Base points for winning

            // Add high odds bonus if multiplier >= 2.0
            if (multiplier >= 2.0) {
                predictionPoints += Math.floor(multiplier * 5);
            }

            // Apply Double Points Match power-up if this specific match has it
            if (doublePointsMatchId === prediction.matchId) {
                predictionPoints = Math.floor(predictionPoints * 2);
            }

            totalPoints += predictionPoints;
        }

        return totalPoints;
    }
}

interface SubmitSectionProps {
    predictions: any[];
    isParlayMode: boolean;
    parlayCalculation: any;
    parlayStake: number;
    parlayValidation: any;
    totalIndividualStake: number;
    totalIndividualWinnings: number;
    walletBalance: number;
    isIndividualModeValid: boolean;
    isParlayModeValid: boolean;
    onSubmit: () => void;
    dict?: any;
    doublePointsMatchId?: string | null;
}

export function SubmitSection({
    predictions,
    isParlayMode,
    parlayCalculation,
    parlayStake,
    parlayValidation,
    totalIndividualStake,
    totalIndividualWinnings,
    walletBalance,
    isIndividualModeValid,
    isParlayModeValid,
    onSubmit,
    dict,
    doublePointsMatchId
}: SubmitSectionProps) {
    if (predictions.length === 0) return null;

    // Calculate potential leaderboard points
    const potentialLeaderboardPoints = calculatePotentialLeaderboardPoints(predictions, isParlayMode, parlayCalculation, doublePointsMatchId);

    return (
        <motion.div
            className="flex-shrink-0 p-4 border-t border-dashed border-yellow-400 bg-slate-800 shadow-xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ delay: 0.2 }}
        >
            {isParlayMode ? (
                // Parlay Mode Submit Section
                <>
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-slate-300">
                            <span>{dict?.matches?.parlayStake || 'Parlay Stake'}: </span>
                            <span className="font-bold text-blue-400 text-base">{parlayStake} 🌕</span>
                        </div>
                        <div className="text-xs text-slate-300">
                            <span>{dict?.leaderboard?.points || 'Points'}: </span>
                            <span className="font-bold text-green-400">
                                {potentialLeaderboardPoints} 🏆
                                {doublePointsMatchId && <span className="text-purple-400 ml-1">(2x)</span>}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-slate-300">
                            <span>{dict?.matches?.potentialWin || 'Potential Win'}: </span>
                            <span className="font-bold text-yellow-300 text-base">
                                {formatWinnings(parlayCalculation!.potentialWinnings)} 🌕
                            </span>
                        </div>
                        <div className="text-xs text-slate-400">
                            {formatParlayOdds(parlayCalculation!.finalOdds)}x {dict?.matches?.odds || 'odds'}
                        </div>
                    </div>

                    {(!parlayValidation?.isValid || !isParlayModeValid) && (
                        <div className="text-red-400 text-xs mb-2 text-center">
                            {!isParlayModeValid
                                ? (predictions.some(prediction => (prediction.betAmount || 0) < 10)
                                    ? (dict?.matches?.pleaseSetStakesMin?.replace('{min}', '10') || `Please set stakes of at least 10 for all predictions`)
                                    : parlayStake > walletBalance
                                        ? (dict?.matches?.insufficientBalance || 'Insufficient balance')
                                        : (dict?.matches?.pleaseSetStakes || 'Please set stakes for your predictions')
                                )
                                : parlayValidation?.error
                            }
                        </div>
                    )}

                    <Button
                        onClick={onSubmit}
                        disabled={!parlayValidation?.isValid || !isParlayModeValid}
                        className={`w-full font-bold py-2 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 text-sm ${(parlayValidation?.isValid && isParlayModeValid)
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
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-slate-300">
                            <span>{dict?.matches?.totalStake || 'Total Stake'}: </span>
                            <span className="font-bold text-blue-400 text-base">{totalIndividualStake} 🌕</span>
                        </div>
                        <div className="text-xs text-slate-300">
                            <span>{dict?.leaderboard?.points || 'Points'}: </span>
                            <span className="font-bold text-green-400">
                                {potentialLeaderboardPoints} 🏆
                                {doublePointsMatchId && <span className="text-purple-400 ml-1">(2x)</span>}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-slate-300">
                            <span>{dict?.matches?.potentialWin || 'Potential Win'}: </span>
                            <span className="font-bold text-yellow-300 text-base">
                                {formatWinnings(totalIndividualWinnings)} 🌕
                            </span>
                        </div>
                        <div className="text-xs text-slate-400">
                            {predictions.length} {predictions.length !== 1 ? (dict?.matches?.matches || 'matches') : (dict?.matches?.match || 'match')}
                        </div>
                    </div>

                    {!isIndividualModeValid && (
                        <div className="text-red-400 text-xs mb-2 text-center">
                            {predictions.some(prediction => (prediction.betAmount || 0) < COIN_CONSTANTS.MIN_BET)
                                ? (dict?.matches?.pleaseSetStakesMin?.replace('{min}', COIN_CONSTANTS.MIN_BET.toString()) || `Please set stakes of at least ${COIN_CONSTANTS.MIN_BET} for all predictions`)
                                : totalIndividualStake > walletBalance
                                    ? (dict?.matches?.insufficientBalance || 'Insufficient balance')
                                    : (dict?.matches?.pleaseSetStakes || 'Please set stakes for your predictions')
                            }
                        </div>
                    )}

                    <Button
                        onClick={onSubmit}
                        disabled={!isIndividualModeValid}
                        className={`w-full font-bold py-2 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 text-sm ${isIndividualModeValid
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {dict?.matches?.placeIndividualBets || 'Place Individual Bets'}
                    </Button>
                </>
            )}
        </motion.div>
    );
}
