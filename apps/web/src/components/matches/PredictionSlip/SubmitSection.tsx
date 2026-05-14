'use client';

import { motion } from 'framer-motion';
import { formatWinnings } from '@netprophet/lib';
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

    const isParlay = isParlayMode && parlayCalculation;
    const isValid = isParlay ? (parlayValidation?.isValid && isParlayModeValid) : isIndividualModeValid;
    const stake = isParlay ? parlayStake : totalIndividualStake;
    const winnings = isParlay ? parlayCalculation!.potentialWinnings : totalIndividualWinnings;

    const errorMessage = (() => {
        if (isParlay && (!parlayValidation?.isValid || !isParlayModeValid)) {
            if (!isParlayModeValid) {
                if (predictions.some(p => (p.betAmount || 0) < 10)) return dict?.matches?.pleaseSetStakesMin?.replace('{min}', '10') || 'Ελάχιστα 10 🪙 ανά πρόβλεψη';
                if (parlayStake > walletBalance) return dict?.matches?.insufficientBalance || 'Ανεπαρκές υπόλοιπο';
                return dict?.matches?.pleaseSetStakes || 'Ορίστε νομίσματα για κάθε πρόβλεψη';
            }
            return parlayValidation?.error;
        }
        if (!isParlay && !isIndividualModeValid) {
            if (predictions.some(p => (p.betAmount || 0) < COIN_CONSTANTS.MIN_BET)) return dict?.matches?.pleaseSetStakesMin?.replace('{min}', COIN_CONSTANTS.MIN_BET.toString()) || `Ελάχιστα ${COIN_CONSTANTS.MIN_BET} 🪙 ανά πρόβλεψη`;
            if (totalIndividualStake > walletBalance) return dict?.matches?.insufficientBalance || 'Ανεπαρκές υπόλοιπο';
            return dict?.matches?.pleaseSetStakes || 'Ορίστε νομίσματα για κάθε πρόβλεψη';
        }
        return null;
    })();

    return (
        <motion.div
            className="flex-shrink-0 border-t border-white/[0.08] bg-[#0F1628] px-4 pt-3 pb-[max(32px,env(safe-area-inset-bottom))]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
        >
            {/* Compact stats row */}
            {stake > 0 || winnings > 0 ? (
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#4B5975] font-medium">Νομίσματα</span>
                        <span className="text-xs font-black text-white tabular-nums">{stake} 🪙</span>
                    </div>
                    {winnings > 0 && (
                        <>
                            <svg className="w-3 h-3 text-[#4B5975]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[#4B5975] font-medium">Κέρδος</span>
                                <span className="text-xs font-black text-[#00E676] tabular-nums">{formatWinnings(winnings)} 🪙</span>
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#4B5975] font-medium">Πόντοι</span>
                        <span className="text-xs font-black text-[#FFD60A] tabular-nums">
                            {potentialLeaderboardPoints} 🏆{doublePointsMatchId ? ' ×2' : ''}
                        </span>
                    </div>
                </div>
            ) : null}

            {/* Error */}
            {errorMessage && (
                <p className="text-[11px] text-[#FF4545] text-center mb-2 px-1">{errorMessage}</p>
            )}

            {/* CTA */}
            <motion.button
                onClick={onSubmit}
                disabled={!isValid}
                className={[
                    'w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-150',
                    isValid
                        ? 'bg-[#FFD60A] text-[#080C18] shadow-[0_4px_24px_rgba(255,214,10,0.35)] hover:bg-[#FFE033] active:scale-[0.98]'
                        : 'bg-[#1E2A45] text-[#4B5975] cursor-not-allowed',
                ].join(' ')}
                whileTap={isValid ? { scale: 0.98 } : {}}
            >
                {isParlay
                    ? (dict?.matches?.placeParlayBet || 'Υποβολή Συνδυαστικής')
                    : (dict?.matches?.placeIndividualBets || 'Υποβολή Προβλέψεων')}
            </motion.button>
        </motion.div>
    );
}
