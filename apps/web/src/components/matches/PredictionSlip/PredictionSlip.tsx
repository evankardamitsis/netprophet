'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useWallet } from '@/context/WalletContext';
import { useDictionary } from '@/context/DictionaryContext';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import {
    calculateParlayOdds,
    calculateSafeBetCost,
    formatParlayOdds,
    formatWinnings,
    getBonusDescription,
    validateParlayBet,
    PARLAY_CONSTANTS,
    hasSafeSlipPowerUp,
    applySafeSlipPowerUp,
    hasDoublePointsMatchPowerUp as checkDoublePointsMatch,
    applyDoublePointsMatchPowerUp
} from '@netprophet/lib';
import { COIN_CONSTANTS } from '@/context/WalletContext';
import { PredictionItem } from '@/types/dashboard';
import { toast } from 'sonner';
// BetsService will be imported dynamically in handleSubmit
import {
    SESSION_KEYS,
    removeFromSessionStorage,
    clearFormPredictionsForMatch
} from '@/lib/sessionStorage';

// Import the smaller components
import { ParlayModeToggle } from './ParlayModeToggle';
import { SafeSlipPowerUps } from './SafeSlipPowerUps';
import { PowerUpSuggestions } from './PowerUpSuggestions';
import { PredictionCard } from './PredictionCard';
import { SubmitSection } from './SubmitSection';
import { EmptyState } from './EmptyState';

// Icon components
function ChevronUpIcon() {
    return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
    );
}

interface PredictionSlipProps {
    onRemovePrediction: (matchId: string) => void;
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
    const { predictions, outrightsPredictions, clearPredictions, clearOutrightsPredictions, removePrediction, removeOutrightsPrediction, updatePredictionBetAmount, updateOutrightsBetAmount } = usePredictionSlip();
    const { wallet, placeBet } = useWallet();
    const { dict, lang } = useDictionary();
    const { user } = useAuth();

    // Parlay state
    const [isParlayMode, setIsParlayMode] = useState<boolean>(false);
    const [userStreak, setUserStreak] = useState<number>(5); // Mock user streak - in real app this would come from user stats

    // Safe slip power-up state
    const [hasSafeParlayPowerUp, setHasSafeParlayPowerUp] = useState<boolean>(false);
    const [hasSafeSinglePowerUp, setHasSafeSinglePowerUp] = useState<boolean>(false);
    const [isUsingSafeParlay, setIsUsingSafeParlay] = useState<boolean>(false);
    const [isUsingSafeSingle, setIsUsingSafeSingle] = useState<boolean>(false);

    // Double Points Match power-up state
    const [hasDoublePointsMatchPowerUp, setHasDoublePointsMatchPowerUp] = useState<boolean>(false);
    const [doublePointsMatchId, setDoublePointsMatchId] = useState<string | null>(null);
    const [showDoublePointsStatus, setShowDoublePointsStatus] = useState<boolean>(false);

    // Reset parlay mode if less than 2 predictions
    useEffect(() => {
        if (predictions.length < 2 && isParlayMode) {
            setIsParlayMode(false);
        }
    }, [predictions.length, isParlayMode]);

    // Check for power-ups
    useEffect(() => {
        const checkPowerUps = async () => {
            try {
                const userId = user?.id;
                if (!userId) return;

                const [hasParlay, hasSingle, hasDoublePoints] = await Promise.all([
                    hasSafeSlipPowerUp(userId, 'safeParlay'),
                    hasSafeSlipPowerUp(userId, 'safeSingle'),
                    checkDoublePointsMatch(userId)
                ]);

                setHasSafeParlayPowerUp(hasParlay);
                setHasSafeSinglePowerUp(hasSingle);
                setHasDoublePointsMatchPowerUp(hasDoublePoints);
            } catch (error) {
                console.error('Error checking power-ups:', error);
            }
        };

        checkPowerUps();

        // Listen for power-up refresh events
        const handlePowerUpRefresh = () => {
            checkPowerUps();
        };

        window.addEventListener('refreshPowerUps', handlePowerUpRefresh);

        return () => {
            window.removeEventListener('refreshPowerUps', handlePowerUpRefresh);
        };
    }, [user?.id]);

    // Handle power-up purchase from suggestions
    const handlePowerUpPurchased = (powerUpId: string) => {
        // Update power-up states based on what was purchased
        if (powerUpId === 'safeParlay') {
            setHasSafeParlayPowerUp(true);
        } else if (powerUpId === 'safeSingle') {
            setHasSafeSinglePowerUp(true);
        } else if (powerUpId === 'doubleXP') {
            setHasDoublePointsMatchPowerUp(true);
            setShowDoublePointsStatus(true);

            // Hide the status after 3 seconds
            setTimeout(() => {
                setShowDoublePointsStatus(false);
            }, 3000);
        }
    };

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
            return total + (prediction.potentialWinnings || (prediction.betAmount || 0) * (prediction.multiplier || 1));
        }, 0);
    };

    // Use total individual stake as parlay stake
    const parlayStake = getTotalIndividualStake();

    // Calculate parlay odds and winnings (only when in parlay mode)
    const parlayCalculation = isParlayMode ? calculateParlayOdds(predictionItems, parlayStake, userStreak) : null;
    const bonusDescriptions = isParlayMode ? getBonusDescription(predictionItems, userStreak) : [];
    const parlayValidation = isParlayMode ? validateParlayBet(predictionItems, parlayStake, wallet.balance) : null;

    const handleSubmit = async () => {
        try {
            // Dynamic import to work around module resolution issue
            const { BetsService: BetsServiceModule } = await import('@netprophet/lib');

            if (isParlayMode) {
                // Parlay mode - place single parlay bet
                if (!parlayValidation?.isValid) {
                    alert(parlayValidation?.error || dict?.matches?.invalidParlayBet || 'Invalid parlay bet');
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

                const parlayBetResult = await BetsServiceModule.createParlayBet({
                    predictions: parlayPredictions,
                    totalStake: parlayStake,
                    baseOdds: parlayCalculation!.baseOdds,
                    finalOdds: parlayCalculation!.finalOdds,
                    bonusMultiplier: parlayCalculation!.bonusMultiplier,
                    streakBooster: parlayCalculation!.streakBooster,
                    isSafeBet: false,
                    safeBetCost: 0
                });

                // Use safe parlay power-up if enabled
                if (isUsingSafeParlay && user?.id && parlayBetResult && parlayBetResult.length > 0) {
                    try {
                        await applySafeSlipPowerUp(user.id, 'safeParlay', parlayBetResult[0].id);
                        toast.success('Safe Parlay Slip power-up applied! 🛡️');
                    } catch (powerUpError) {
                        console.error('Error using safe parlay power-up:', powerUpError);
                        // Don't fail the bet placement if power-up usage fails
                    }
                }

                // Use Double Points Match power-up if enabled for parlay (apply to the selected match)
                if (doublePointsMatchId && user?.id) {
                    try {
                        await applyDoublePointsMatchPowerUp(user.id, doublePointsMatchId);
                        toast.success('Double Points Match power-up applied! 🎯');
                    } catch (powerUpError) {
                        console.error('Error using Double Points Match power-up:', powerUpError);
                        // Don't fail the bet placement if power-up usage fails
                    }
                }

                // Update wallet balance
                await placeBet(
                    parlayStake,
                    1, // Using a simple number for matchId
                    `${dict?.matches?.parlayBetDescription?.replace('{count}', predictionItems.length.toString()).replace('{odds}', formatParlayOdds(parlayCalculation!.finalOdds)) || `Parlay bet - ${predictionItems.length} predictions - ${formatParlayOdds(parlayCalculation!.finalOdds)}x odds`}`
                );


            } else {
                // Individual mode - place separate bets for each prediction using existing betAmount
                for (const prediction of predictions) {
                    const betAmount = prediction.betAmount || 0;
                    if (betAmount > 0) {
                        const multiplier = prediction.multiplier || 1;
                        const potentialWinnings = prediction.potentialWinnings || 0;

                        const bet = await BetsServiceModule.createBet({
                            matchId: prediction.matchId,
                            betAmount: betAmount,
                            multiplier: multiplier,
                            potentialWinnings: potentialWinnings,
                            prediction: formatPrediction(prediction.prediction),
                            description: `${prediction.match.player1.name} vs ${prediction.match.player2.name} - ${multiplier.toFixed(2)}x multiplier`
                        });

                        // Use safe single power-up if enabled (only for the first bet if multiple)
                        if (isUsingSafeSingle && user?.id && predictions.indexOf(prediction) === 0) {
                            try {
                                await applySafeSlipPowerUp(user.id, 'safeSingle', bet.id);
                                toast.success('Safe Slip power-up applied! 🛡️');
                            } catch (powerUpError) {
                                console.error('Error using safe single power-up:', powerUpError);
                                // Don't fail the bet placement if power-up usage fails
                            }
                        }

                        // Use Double Points Match power-up if enabled for this specific match
                        if (doublePointsMatchId === prediction.matchId && user?.id) {
                            try {
                                await applyDoublePointsMatchPowerUp(user.id, prediction.matchId);
                                toast.success('Double Points Match power-up applied! 🎯');
                            } catch (powerUpError) {
                                console.error('Error using Double Points Match power-up:', powerUpError);
                                // Don't fail the bet placement if power-up usage fails
                            }
                        }

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

            // Reset safe slip power-up states
            setIsUsingSafeParlay(false);
            setIsUsingSafeSingle(false);
            setDoublePointsMatchId(null);

        } catch (error) {
            // Handle insufficient balance or other errors
            if (error instanceof Error) {
                alert(dict?.matches?.errorPlacingBet?.replace('{type}', isParlayMode ? 'parlay' : 'individual').replace('{error}', error.message) || `Error placing ${isParlayMode ? 'parlay' : 'individual'} bet(s): ${error.message}`);
            } else {
                alert(dict?.matches?.errorPlacingBetCheckBalance?.replace('{type}', isParlayMode ? 'parlay' : 'individual') || `Error placing ${isParlayMode ? 'parlay' : 'individual'} bet(s). Please check your balance and try again.`);
            }
        }
    };

    const handleRemovePrediction = (matchId: string) => {
        removePrediction(matchId);
        // Clear form predictions for this match from session storage
        clearFormPredictionsForMatch(matchId);
    };

    function formatPrediction(prediction: any) {
        // Handle case where prediction might be undefined or null
        if (!prediction) {
            console.warn('formatPrediction called with null/undefined prediction');
            return { type: 'winner' };
        }

        // Create a structured JSON object for bet resolution
        const formattedPrediction: any = {
            type: 'winner', // Default type
            winner: prediction.winner || null,
            matchResult: prediction.matchResult || null,
            set1Score: prediction.set1Score || null,
            set2Score: prediction.set2Score || null,
            set3Score: prediction.set3Score || null,
            set4Score: prediction.set4Score || null,
            set5Score: prediction.set5Score || null,
            set1Winner: prediction.set1Winner || null,
            set2Winner: prediction.set2Winner || null,
            set3Winner: prediction.set3Winner || null,
            set4Winner: prediction.set4Winner || null,
            set5Winner: prediction.set5Winner || null,
            set1TieBreak: prediction.set1TieBreak || null,
            set2TieBreak: prediction.set2TieBreak || null,
            set1TieBreakScore: prediction.set1TieBreakScore || null,
            set2TieBreakScore: prediction.set2TieBreakScore || null,
            superTieBreak: prediction.superTieBreak || null,
            superTieBreakScore: prediction.superTieBreakScore || null,
            superTieBreakWinner: prediction.superTieBreakWinner || null,
            tieBreak: prediction.tieBreak || null
        };

        // Determine the prediction type based on what's selected
        if (prediction.matchResult && prediction.set1Score) {
            formattedPrediction.type = 'set_score';
        } else if (prediction.matchResult && prediction.set1Winner) {
            formattedPrediction.type = 'set_winner';
        } else if (prediction.matchResult) {
            formattedPrediction.type = 'match_result';
        } else if (prediction.winner) {
            formattedPrediction.type = 'winner';
        }

        return formattedPrediction;
    }

    function formatPredictionDisplay(prediction: any) {
        // Handle case where prediction might be undefined or null
        if (!prediction) {
            return dict?.matches?.noPrediction || 'No prediction';
        }

        const parts = [];
        if (prediction.winner) parts.push(`Winner: ${prediction.winner}`);
        if (prediction.matchResult) parts.push(`Result: ${prediction.matchResult}`);
        if (prediction.set1Score) parts.push(`Set 1: ${prediction.set1Score}`);
        if (prediction.set2Score) parts.push(`Set 2: ${prediction.set2Score}`);
        if (prediction.set3Score) parts.push(`Set 3: ${prediction.set3Score}`);
        if (prediction.set1TieBreakScore) parts.push(`TB1: ${prediction.set1TieBreakScore}`);
        if (prediction.set2TieBreakScore) parts.push(`TB2: ${prediction.set2TieBreakScore}`);
        if (prediction.superTieBreakScore) parts.push(`STB: ${prediction.superTieBreakScore}`);

        return parts.length > 0 ? parts.join(' | ') : (dict?.matches?.noPrediction || 'No prediction');
    }



    const isIndividualModeValid = () => {
        const totalStake = getTotalIndividualStake();
        // Check that all predictions have stakes >= MIN_BET
        const allPredictionsHaveStakes = predictions.every(prediction => (prediction.betAmount || 0) >= COIN_CONSTANTS.MIN_BET);
        return allPredictionsHaveStakes && totalStake > 0 && totalStake <= wallet.balance;
    };

    const isParlayModeValid = () => {
        const totalStake = getTotalIndividualStake();
        // Check that all predictions have stakes >= MIN_BET
        const allPredictionsHaveStakes = predictions.every(prediction => (prediction.betAmount || 0) >= COIN_CONSTANTS.MIN_BET);
        return allPredictionsHaveStakes && totalStake > 0 && totalStake <= wallet.balance;
    };

    // Determine if any safe slip power-up is active
    const isSafeSlipActive = isUsingSafeSingle || isUsingSafeParlay;

    // Get the appropriate gradient class based on which power-up is active
    const getSafeSlipGradient = () => {
        if (isUsingSafeSingle) {
            return 'shadow-emerald-500/30 shadow-lg';
        } else if (isUsingSafeParlay) {
            return 'shadow-emerald-500/30 shadow-lg';
        }
        return 'border-l border-border';
    };

    // Low balance alert logic
    const isLowBalance = wallet.balance <= 200;
    const isVeryLowBalance = wallet.balance < 100;
    const isCriticalBalance = wallet.balance < 50;

    const getLowBalanceMessage = () => {
        if (isCriticalBalance) {
            return lang === 'el' ? 'Πολύ χαμηλό υπόλοιπο!' : 'Critical low balance!';
        } else if (isVeryLowBalance) {
            return lang === 'el' ? 'Πολύ χαμηλό υπόλοιπο' : 'Very low balance';
        } else if (isLowBalance) {
            return lang === 'el' ? 'Χαμηλό υπόλοιπο' : 'Low balance';
        }
        return null;
    };

    const getLowBalanceColor = () => {
        if (isCriticalBalance) {
            return 'text-red-400';
        } else if (isVeryLowBalance) {
            return 'text-orange-400';
        } else if (isLowBalance) {
            return 'text-blue-400';
        }
        return '';
    };

    return (
        <motion.div
            className={`h-full flex flex-col shadow-2xl relative overflow-hidden border-l-2 border-blue-500/30 bg-gradient-to-b from-slate-900 via-blue-950 to-purple-950 ${getSafeSlipGradient()}`}
            initial={false}
            animate={{
                opacity: isCollapsed ? 0 : 1,
                y: isCollapsed ? 32 : 0,
                scale: isCollapsed ? 0.95 : 1,
            }}
            transition={{
                type: "tween",
                duration: 0.3,
                ease: "easeInOut"
            }}
            style={{
                transformOrigin: "bottom right",
                boxShadow: isSafeSlipActive
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(16, 185, 129, 0.4), 0 0 15px rgba(16, 185, 129, 0.2)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 130, 246, 0.3)',
                backgroundImage: isSafeSlipActive
                    ? 'linear-gradient(to bottom, rgba(16, 185, 129, 0.25), rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
                    : undefined
            }}
        >
            <div className="flex-shrink-0 p-4 border-b border-dashed border-slate-700 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-yellow-300 tracking-wider uppercase">
                    {dict?.matches?.bettingSlip || 'Betting Slip'}
                </h3>
                {onToggleCollapse && (
                    <motion.button
                        onClick={onToggleCollapse}
                        className="text-yellow-300 bg-gradient-to-r from-slate-600 to-slate-700 transition-all duration-200 p-2 rounded-lg hover:from-slate-500 hover:to-slate-600 hover:shadow-lg"
                        title={dict?.matches?.minimizeSlip || 'Minimize slip'}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ChevronUpIcon />
                    </motion.button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {predictions.length === 0 ? (
                    <EmptyState dict={dict} />
                ) : (
                    <div className="space-y-3">
                        {/* Mode Toggle - Only show when 2+ predictions */}
                        <ParlayModeToggle
                            predictionsCount={predictions.length}
                            isParlayMode={isParlayMode}
                            onToggleParlayMode={() => setIsParlayMode(!isParlayMode)}
                            dict={dict}
                        />

                        {/* Encouragement message for single prediction */}
                        {predictions.length === 1 && (
                            <motion.div
                                className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 border border-blue-400/50"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">🎯</span>
                                    <div className="text-white text-xs">
                                        <span className="font-semibold">
                                            {dict?.matches?.addOneMorePrediction || 'Add one more prediction'}
                                        </span> {dict?.matches?.unlockParlayMode || 'to unlock exciting parlay mode with bonus rewards!'}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Safe Slip Power-ups Section */}
                        <SafeSlipPowerUps
                            hasSafeParlayPowerUp={hasSafeParlayPowerUp}
                            hasSafeSinglePowerUp={hasSafeSinglePowerUp}
                            isUsingSafeParlay={isUsingSafeParlay}
                            isUsingSafeSingle={isUsingSafeSingle}
                            onToggleSafeParlay={() => setIsUsingSafeParlay(!isUsingSafeParlay)}
                            onToggleSafeSingle={() => setIsUsingSafeSingle(!isUsingSafeSingle)}
                            predictionsCount={predictions.length}
                            isParlayMode={isParlayMode}
                            dict={dict}
                        />

                        {/* Power-up Suggestions */}
                        <PowerUpSuggestions
                            predictionsCount={predictions.length}
                            totalStake={getTotalIndividualStake()}
                            isParlayMode={isParlayMode}
                            parlayOdds={parlayCalculation?.finalOdds}
                            dict={dict}
                            lang={lang}
                            onPowerUpPurchased={handlePowerUpPurchased}
                            hasSafeParlayPowerUp={hasSafeParlayPowerUp}
                            hasSafeSinglePowerUp={hasSafeSinglePowerUp}
                            hasDoublePointsMatchPowerUp={hasDoublePointsMatchPowerUp}
                        />

                        {/* Double Points Match Power-up Status */}
                        <AnimatePresence>
                            {showDoublePointsStatus && (
                                <motion.div
                                    className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-2 border border-purple-500/30"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">🎯</span>
                                        <div className="text-white text-xs">
                                            <span className="font-semibold">
                                                Double Points Match power-up applied
                                            </span> - Single use per slip
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>




                        {/* Individual Predictions */}
                        <AnimatePresence>
                            {predictions.map((item, index) => (
                                <PredictionCard
                                    key={item.matchId}
                                    item={item}
                                    index={index}
                                    isParlayMode={isParlayMode}
                                    walletBalance={wallet.balance}
                                    onRemovePrediction={handleRemovePrediction}
                                    onUpdateBetAmount={updatePredictionBetAmount}
                                    formatPredictionDisplay={formatPredictionDisplay}
                                    dict={dict}
                                    hasDoublePointsMatchPowerUp={hasDoublePointsMatchPowerUp && (doublePointsMatchId === null || doublePointsMatchId === item.matchId)}
                                    isUsingDoublePointsMatch={doublePointsMatchId === item.matchId}
                                    onToggleDoublePointsMatch={(matchId) => {
                                        if (doublePointsMatchId === matchId) {
                                            setDoublePointsMatchId(null);
                                        } else {
                                            setDoublePointsMatchId(matchId);
                                        }
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Sticky Submit Section */}
            <AnimatePresence>
                <SubmitSection
                    predictions={predictions}
                    isParlayMode={isParlayMode}
                    parlayCalculation={parlayCalculation}
                    parlayStake={parlayStake}
                    parlayValidation={parlayValidation}
                    totalIndividualStake={getTotalIndividualStake()}
                    totalIndividualWinnings={getTotalIndividualWinnings()}
                    walletBalance={wallet.balance}
                    isIndividualModeValid={isIndividualModeValid()}
                    isParlayModeValid={isParlayModeValid()}
                    onSubmit={handleSubmit}
                    dict={dict}
                    doublePointsMatchId={doublePointsMatchId}
                />
            </AnimatePresence>

            {/* Low Balance Alert - Footer */}
            {isLowBalance && (
                <motion.div
                    className={`px-4 py-3 border-t ${isCriticalBalance
                        ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700 border-red-400 shadow-lg'
                        : isVeryLowBalance
                            ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 border-orange-400 shadow-lg'
                            : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 border-blue-400 shadow-lg'
                        }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <WarningIcon />
                            <span className="text-sm font-semibold text-white">
                                {getLowBalanceMessage()}
                            </span>
                        </div>
                        <a
                            href={`/${lang}/matches/rewards`}
                            className="text-sm text-white hover:text-yellow-200 underline transition-colors font-medium"
                        >
                            {lang === 'el' ? 'Ανανέωση' : 'Top up'}
                        </a>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
