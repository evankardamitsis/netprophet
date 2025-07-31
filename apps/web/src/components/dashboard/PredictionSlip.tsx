'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, Button } from '@netprophet/ui';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useWallet } from '@/context/WalletContext';
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
    const { predictions, clearPredictions, removePrediction } = usePredictionSlip();
    const { wallet, placeBet } = useWallet();

    const getTotalBetAmount = () => predictions.reduce((total, item) => total + (item.betAmount || 0), 0);
    const getTotalPotentialWinnings = () => predictions.reduce((total, item) => total + (item.potentialWinnings || 0), 0);

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

            // Place all bets in the slip using BetsService
            for (const prediction of predictions) {
                if (prediction.betAmount && prediction.betAmount > 0) {
                    // Create bet in Supabase
                    // For now, use a placeholder match ID since we don't have real matches in the database
                    const placeholderMatchId = '00000000-0000-0000-0000-000000000001';

                    await BetsServiceModule.createBet({
                        matchId: placeholderMatchId,
                        betAmount: prediction.betAmount,
                        multiplier: prediction.multiplier || 1,
                        potentialWinnings: prediction.potentialWinnings || 0,
                        prediction: prediction.prediction,
                        description: `${prediction.match.player1.name} vs ${prediction.match.player2.name} - ${prediction.multiplier?.toFixed(2)}x multiplier`
                    });

                    // Update wallet balance
                    await placeBet(
                        prediction.betAmount,
                        prediction.matchId,
                        `${prediction.match.player1.name} vs ${prediction.match.player2.name} - ${prediction.multiplier?.toFixed(2)}x multiplier`
                    );
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
                alert(`Error placing bets: ${error.message}`);
            } else {
                alert('Error placing bets. Please check your balance and try again.');
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
                <h3 className="text-lg font-bold text-yellow-300 tracking-wider uppercase">Betting Slip</h3>
                {onToggleCollapse && (
                    <motion.button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-yellow-300 transition-colors duration-200 p-1 rounded-full hover:bg-slate-700"
                        title="Minimize slip"
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
                        <p>No bets yet</p>
                        <p className="text-sm">Select matches to add to your slip</p>
                    </div>
                ) : (
                    <div className="space-y-4">
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
                                                    <div className="text-xs text-slate-400 mt-1">{item.match.tournament || 'Tournament'}</div>
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
                                                    <Badge variant={getStatusColor(item.match.status)} className="text-xs bg-slate-700 text-yellow-300 border border-yellow-400">
                                                        {item.match.status === 'live' ? 'LIVE' : item.match.status.toUpperCase()}
                                                    </Badge>
                                                    <span className="text-xs text-slate-400">{item.match.time}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="text-sm">
                                                    <span className="text-slate-300">Pick: </span>
                                                    <span className="font-semibold text-yellow-200">{formatPrediction(item.prediction)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-sm">
                                                    <span className="text-slate-300">Bet: </span>
                                                    <span className="font-semibold text-blue-400">{item.betAmount || 0} 🌕</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-slate-300">Multiplier: </span>
                                                    <span className="font-semibold text-green-400">{item.multiplier ? item.multiplier.toFixed(2) : '1.00'}x</span>
                                                </div>
                                                <div className="text-sm font-bold text-yellow-400">
                                                    Win: {item.potentialWinnings || 0} 🌕
                                                </div>
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
                            <div className="text-xs text-yellow-300 mb-2 font-semibold">Quick Stats</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-slate-400">Matches:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{predictions.length}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Live:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{predictions.filter(p => p.match.status === 'live').length}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Total Bet:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{getTotalBetAmount()} 🌕</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Tournaments:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{new Set(predictions.map(p => p.match.tournament)).size}</span>
                                </div>
                            </div>
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
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-slate-300">
                                <span>Total Bet: </span>
                                <span className="font-bold text-blue-400 text-lg">{getTotalBetAmount()} 🌕</span>
                            </div>
                            <div className="text-sm text-slate-400">
                                {predictions.length} match{predictions.length !== 1 ? 'es' : ''}
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-slate-300">
                                <span>Potential Win: </span>
                                <span className="font-bold text-yellow-300 text-lg">{getTotalPotentialWinnings()} 🌕</span>
                            </div>
                            <div className="text-sm text-slate-400">
                                Balance: {wallet.balance} 🌕
                            </div>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
                            size="lg"
                        >
                            Place All Bets
                        </Button>
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
            <div className="text-sm font-semibold">{predictions.length} match{predictions.length !== 1 ? 'es' : ''}</div>
        </motion.button>
    );
} 