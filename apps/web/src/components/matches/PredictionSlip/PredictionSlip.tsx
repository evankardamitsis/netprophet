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
import { BetSuccessModal } from './BetSuccessModal';
import { useSuccessModal } from '@/context/SuccessModalContext';

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

function BettingSlipIcon({ className = "h-6 w-6 text-white" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
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

    // Success modal state from context
    const { showSuccessModal, setShowSuccessModal } = useSuccessModal();

    // Track which cards are expanded (only the most recent one by default)
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    // Reset parlay mode if less than 2 predictions
    useEffect(() => {
        if (predictions.length < 2 && isParlayMode) {
            setIsParlayMode(false);
        }
    }, [predictions.length, isParlayMode]);

    // Auto-expand the most recent prediction and collapse others
    useEffect(() => {
        if (predictions.length > 0) {
            const mostRecentId = predictions[predictions.length - 1].matchId;
            setExpandedCards(new Set([mostRecentId]));
        }
    }, [predictions]);

    // Reset safe single power-up when switching to parlay mode
    useEffect(() => {
        if (isParlayMode && isUsingSafeSingle) {
            setIsUsingSafeSingle(false);
        }
    }, [isParlayMode, isUsingSafeSingle]);

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
                        toast.success(`${dict?.matches?.powerUps?.safeParlayApplied || 'Safe Parlay Slip power-up applied'}! 🛡️`);
                    } catch (powerUpError) {
                        console.error('Error using safe parlay power-up:', powerUpError);
                        // Don't fail the bet placement if power-up usage fails
                    }
                }

                // Use Double Points Match power-up if enabled for parlay (apply to the selected match)
                if (doublePointsMatchId && user?.id) {
                    try {
                        await applyDoublePointsMatchPowerUp(user.id, doublePointsMatchId);
                        toast.success(`${dict?.matches?.powerUps?.doublePointsMatchApplied || 'Double Points Match power-up applied'}! 🎯`);
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
                                toast.success(`${dict?.matches?.powerUps?.safeSingleApplied || 'Safe Slip power-up applied'}! 🛡️`);
                            } catch (powerUpError) {
                                console.error('Error using safe single power-up:', powerUpError);
                                // Don't fail the bet placement if power-up usage fails
                            }
                        }

                        // Use Double Points Match power-up if enabled for this specific match
                        if (doublePointsMatchId === prediction.matchId && user?.id) {
                            try {
                                await applyDoublePointsMatchPowerUp(user.id, prediction.matchId);
                                toast.success(`${dict?.matches?.powerUps?.doublePointsMatchApplied || 'Double Points Match power-up applied'}! 🎯`);
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

            // Show success modal FIRST
            setShowSuccessModal(true);

            // Reset safe slip power-up states
            setIsUsingSafeParlay(false);
            setIsUsingSafeSingle(false);
            setDoublePointsMatchId(null);

            // Clear the slip after a longer delay to ensure modal is fully shown
            setTimeout(() => {
                clearPredictions();
            }, 500);

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

    const handleToggleExpand = (matchId: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(matchId)) {
                newSet.delete(matchId);
            } else {
                newSet.add(matchId);
            }
            return newSet;
        });
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

        // Winner
        if (prediction.winner) {
            const winnerName = prediction.winner.split(' ').pop(); // Get last name only
            parts.push(`${dict?.matches?.winner || 'Winner'}: ${winnerName}`);
        }

        // Match Result
        if (prediction.matchResult) {
            parts.push(`${dict?.matches?.result || 'Result'}: ${prediction.matchResult}`);
        }

        // Set Winners (only show if not automatically determined by match result)
        if (prediction.set1Winner && !['2-0', '0-2', '3-0', '0-3'].includes(prediction.matchResult)) {
            parts.push(`Set 1: ${prediction.set1Winner.split(' ').pop()}`);
        }
        if (prediction.set2Winner && !['2-0', '0-2', '3-0', '0-3'].includes(prediction.matchResult)) {
            parts.push(`Set 2: ${prediction.set2Winner.split(' ').pop()}`);
        }
        if (prediction.set3Winner) {
            parts.push(`Set 3: ${prediction.set3Winner.split(' ').pop()}`);
        }
        if (prediction.set4Winner) {
            parts.push(`Set 4: ${prediction.set4Winner.split(' ').pop()}`);
        }
        if (prediction.set5Winner) {
            parts.push(`Set 5: ${prediction.set5Winner.split(' ').pop()}`);
        }

        // Set Scores
        if (prediction.set1Score) {
            parts.push(`Set 1 Score: ${prediction.set1Score}`);
        }
        if (prediction.set2Score) {
            parts.push(`Set 2 Score: ${prediction.set2Score}`);
        }
        if (prediction.set3Score) {
            parts.push(`Set 3 Score: ${prediction.set3Score}`);
        }
        if (prediction.set4Score) {
            parts.push(`Set 4 Score: ${prediction.set4Score}`);
        }
        if (prediction.set5Score) {
            parts.push(`Set 5 Score: ${prediction.set5Score}`);
        }

        // Tiebreak Scores
        if (prediction.set1TieBreakScore) {
            parts.push(`Set 1 TB: ${prediction.set1TieBreakScore}`);
        }
        if (prediction.set2TieBreakScore) {
            parts.push(`Set 2 TB: ${prediction.set2TieBreakScore}`);
        }

        // Super Tiebreak
        if (prediction.superTieBreakWinner) {
            const winnerName = prediction.superTieBreakWinner.split(' ').pop();
            parts.push(`Super TB: ${winnerName}`);
        }
        if (prediction.superTieBreakScore) {
            parts.push(`STB Score: ${prediction.superTieBreakScore}`);
        }

        return parts.length > 0 ? parts.join(' • ') : (dict?.matches?.noPrediction || 'No prediction');
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

    // Determine if any safe slip power-up is active for the current mode
    const isSafeSlipActive = (isParlayMode && isUsingSafeParlay) || (!isParlayMode && isUsingSafeSingle);

    // Get the appropriate gradient class based on which power-up is active
    const getSafeSlipGradient = () => {
        if (isParlayMode && isUsingSafeParlay) {
            return 'shadow-emerald-500/30 shadow-lg';
        } else if (!isParlayMode && isUsingSafeSingle) {
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
            className={`h-full flex flex-col shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${getSafeSlipGradient()}`}
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
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.3)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(139, 92, 246, 0.3), 0 0 15px rgba(139, 92, 246, 0.2)',
                backgroundImage: isSafeSlipActive
                    ? 'linear-gradient(to bottom, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))'
                    : undefined
            }}
        >
            {/* Header */}
            <div className="relative flex-shrink-0 p-4 bg-gradient-to-r from-slate-800/90 via-slate-700/90 to-slate-800/90 backdrop-blur-sm border-b border-purple-500/20">
                {/* Animated border gradient */}
                <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                    }}
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 0%'],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />

                <div className="relative flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 rounded-lg blur-md opacity-50" />
                            <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-lg">
                                <BettingSlipIcon className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                                {dict?.matches?.bettingSlip || 'Betting Slip'}
                            </h3>
                            <p className="text-xs text-purple-300">
                                {predictions.length} {predictions.length !== 1 ? (dict?.matches?.picks || 'picks') : (dict?.matches?.pick || 'pick')}
                            </p>
                        </div>
                    </div>

                    {onToggleCollapse && (
                        <motion.button
                            onClick={onToggleCollapse}
                            className="relative p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 hover:border-purple-500/50 transition-all duration-200"
                            title={dict?.matches?.minimizeSlip || 'Minimize slip'}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg className="h-5 w-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </motion.button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {predictions.length === 0 ? (
                    <EmptyState dict={dict} />
                ) : (
                    <>
                        {/* Mode Toggle - Only show when 2+ predictions */}
                        {predictions.length >= 2 && (
                            <ParlayModeToggle
                                predictionsCount={predictions.length}
                                isParlayMode={isParlayMode}
                                onToggleParlayMode={() => setIsParlayMode(!isParlayMode)}
                                dict={dict}
                            />
                        )}

                        {/* Encouragement message for single prediction */}
                        {predictions.length === 1 && (
                            <motion.div
                                className="relative bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 rounded-xl p-3 border border-purple-500/30 backdrop-blur-sm"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center space-x-3">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            rotate: [0, 5, -5, 0],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                    >
                                        <span className="text-2xl">🎯</span>
                                    </motion.div>
                                    <div className="text-white text-xs">
                                        <span className="font-semibold text-purple-200">
                                            {dict?.matches?.addOneMorePrediction || 'Add one more prediction'}
                                        </span>
                                        <p className="text-purple-300/80 mt-0.5">
                                            {dict?.matches?.unlockParlayMode || 'to unlock exciting parlay mode with bonus rewards!'}
                                        </p>
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
                                                {dict?.matches?.powerUps?.doublePointsMatchApplied || 'Double Points Match power-up applied'}
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
                                    isExpanded={expandedCards.has(item.matchId)}
                                    onToggleExpand={handleToggleExpand}
                                />
                            ))}
                        </AnimatePresence>
                    </>
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
                        ? 'bg-gradient-to-r from-red-900/80 via-red-800/80 to-red-900/80 border-red-500/50 shadow-lg backdrop-blur-sm'
                        : isVeryLowBalance
                            ? 'bg-gradient-to-r from-orange-900/80 via-orange-800/80 to-orange-900/80 border-orange-500/50 shadow-lg backdrop-blur-sm'
                            : 'bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-900/80 border-blue-500/50 shadow-lg backdrop-blur-sm'
                        }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                }}
                            >
                                <WarningIcon />
                            </motion.div>
                            <span className={`text-sm font-semibold ${getLowBalanceColor()}`}>
                                {getLowBalanceMessage()}
                            </span>
                        </div>
                        <a
                            href={`/${lang}/rewards`}
                            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 transition-all duration-200 font-medium"
                        >
                            {lang === 'el' ? 'Ανανέωση' : 'Top up'}
                        </a>
                    </div>
                </motion.div>
            )}

        </motion.div>
    );
}
