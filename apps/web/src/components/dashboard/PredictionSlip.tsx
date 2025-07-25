'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, Button } from '@netprophet/ui';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

// Icon component
function XIcon() {
    return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
}

function TargetIcon({ className = "h-8 w-8 text-green-500" }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
    const getTotalPoints = () => predictions.reduce((total, item) => total + item.points, 0);

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

    const handleSubmit = () => {
        onSubmitPredictions();
        clearPredictions();
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
                <h3 className="text-lg font-bold text-yellow-300 tracking-wider uppercase">Predictions Slip</h3>
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
                        <TargetIcon className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                        <p>No predictions yet</p>
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
                                                    onClick={() => removePrediction(item.matchId)}
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
                                            <div className="flex justify-between items-center">
                                                <div className="text-sm">
                                                    <span className="text-slate-300">Pick: </span>
                                                    <span className="font-semibold text-yellow-200">{formatPrediction(item.prediction)}</span>
                                                </div>
                                                <div className="text-sm font-bold text-green-400">
                                                    +{item.points}
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
                                    <span className="text-slate-400">Avg Points:</span>
                                    <span className="font-bold ml-1 text-yellow-200">{predictions.length > 0 ? Math.round(getTotalPoints() / predictions.length) : 0}</span>
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
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-yellow-300 tracking-wide">Total Points:</span>
                            <span className="text-lg font-extrabold text-green-400">+{getTotalPoints()}</span>
                        </div>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold shadow-md border-2 border-yellow-300"
                                onClick={handleSubmit}
                            >
                                Submit Predictions ({predictions.length})
                            </Button>
                        </motion.div>
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
        <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25
            }}
        >
            <motion.button
                onClick={onClick}
                className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold shadow-lg border-2 border-yellow-300 rounded-full w-16 h-16 p-0 flex items-center justify-center relative cursor-pointer transition-colors duration-200"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                    scale: [1, 1.08, 1],
                    boxShadow: [
                        "0 15px 35px rgba(251, 191, 36, 0.4)",
                        "0 25px 50px rgba(251, 191, 36, 0.7)",
                        "0 15px 35px rgba(251, 191, 36, 0.4)"
                    ]
                }}
                transition={{
                    scale: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    },
                    boxShadow: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }
                }}
            >
                {/* Pulsating ring effect */}
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-yellow-300"
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.8, 0, 0.8]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Second pulsating ring for more prominence */}
                <motion.div
                    className="absolute inset-0 rounded-full border border-yellow-400"
                    animate={{
                        scale: [1, 1.6, 1],
                        opacity: [0.6, 0, 0.6]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.75
                    }}
                />

                <motion.div
                    className="text-center relative z-10"
                    animate={{
                        y: [0, -3, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <motion.div
                        animate={{
                            rotate: [0, 5, 0, -5, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <TargetIcon className="h-6 w-6 mx-auto text-slate-900" />
                    </motion.div>
                    <span className="text-xs font-bold">{predictions.length}</span>
                </motion.div>
            </motion.button>
        </motion.div>
    );
} 