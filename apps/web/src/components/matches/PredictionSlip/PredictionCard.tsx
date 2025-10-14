'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@netprophet/ui';
import { formatWinnings } from '@netprophet/lib';
import { COIN_CONSTANTS } from '@/context/WalletContext';
import CoinIcon from '@/components/CoinIcon';

interface PredictionCardProps {
    item: any;
    index: number;
    isParlayMode: boolean;
    walletBalance: number;
    onRemovePrediction: (matchId: string) => void;
    onUpdateBetAmount: (matchId: string, amount: number) => void;
    formatPredictionDisplay: (prediction: any) => string;
    dict?: any;
    hasDoublePointsMatchPowerUp?: boolean;
    isUsingDoublePointsMatch?: boolean;
    onToggleDoublePointsMatch?: (matchId: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: (matchId: string) => void;
}

export function PredictionCard({
    item,
    index,
    isParlayMode,
    walletBalance,
    onRemovePrediction,
    onUpdateBetAmount,
    formatPredictionDisplay,
    dict,
    hasDoublePointsMatchPowerUp = false,
    isUsingDoublePointsMatch = false,
    onToggleDoublePointsMatch,
    isExpanded = true,
    onToggleExpand
}: PredictionCardProps) {
    // If collapsed, show minimal info
    if (!isExpanded) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.1 }}
            >
                <Card className="relative overflow-hidden rounded-xl shadow-lg backdrop-blur-sm bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 hover:border-purple-500/50 transition-colors cursor-pointer"
                    onClick={() => onToggleExpand?.(item.matchId)}
                >
                    <CardContent className="p-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 flex items-center space-x-2">
                                <div className="w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-white truncate">
                                        {item.match.player1.name.split(' ').pop()} vs {item.match.player2.name.split(' ').pop()}
                                    </h4>
                                    <p className="text-xs text-slate-400 truncate">
                                        {formatPredictionDisplay(item.prediction)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-2">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-purple-400">
                                        {(item.multiplier || 1).toFixed(2)}x
                                    </div>
                                    <div className="text-xs font-bold text-green-400 flex items-center justify-end gap-0.5">
                                        {formatWinnings((item.betAmount || 0) * (item.multiplier || 1))} <CoinIcon size={10} />
                                    </div>
                                </div>
                                <svg className="h-4 w-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    // Expanded view
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className={`relative overflow-hidden rounded-xl shadow-lg backdrop-blur-sm ${isUsingDoublePointsMatch
                ? 'bg-gradient-to-br from-orange-900/30 via-red-900/20 to-yellow-900/15 border-2 border-orange-500/50'
                : 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50'
                }`}>
                {/* Subtle fire gradient background when Double Points Match is active */}
                {isUsingDoublePointsMatch && (
                    <>
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-yellow-500/10 rounded-xl"
                            animate={{
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                        {/* Animated fire particle */}
                        <motion.div
                            className="absolute top-2 right-2 text-lg z-10"
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            🔥
                        </motion.div>
                    </>
                )}
                <CardContent className="p-3 space-y-2.5">
                    {/* Match Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 mb-0.5">
                                <div className="w-1 h-1 bg-purple-400 rounded-full" />
                                <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider truncate">
                                    {item.match.tournament || (dict?.matches?.tournament || 'Tournament')}
                                </div>
                            </div>
                            <h4 className="text-sm font-bold text-white leading-tight">
                                {item.match.player1.name.split(' ').pop()} vs {item.match.player2.name.split(' ').pop()}
                            </h4>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                            {onToggleExpand && (
                                <motion.button
                                    onClick={() => onToggleExpand(item.matchId)}
                                    className="flex-shrink-0 p-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-purple-300 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title={dict?.matches?.minimize || 'Minimize'}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </motion.button>
                            )}
                            <motion.button
                                onClick={() => onRemovePrediction(item.matchId)}
                                className="flex-shrink-0 p-1 rounded-lg bg-slate-700/50 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={dict?.matches?.remove || 'Remove'}
                            >
                                <XIcon />
                            </motion.button>
                        </div>
                    </div>

                    {/* Prediction Display */}
                    <div className="bg-slate-900/50 rounded-lg px-2 py-1.5 border border-slate-700/50">
                        <div className="flex items-start space-x-1.5">
                            <span className="text-xs text-slate-400 font-medium mt-0.5">{dict?.matches?.pick || 'Pick'}:</span>
                            <span className="text-xs font-semibold text-purple-200 leading-relaxed">
                                {formatPredictionDisplay(item.prediction)}
                            </span>
                        </div>
                    </div>

                    {/* Double Points Match Power-up */}
                    {hasDoublePointsMatchPowerUp && onToggleDoublePointsMatch && (
                        <motion.div
                            className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-yellow-600/20 rounded-lg px-2.5 py-1.5 border border-orange-500/30"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                        }}
                                    >
                                        <span className="text-base">🎯</span>
                                    </motion.div>
                                    <div>
                                        <div className="text-white font-bold text-xs">
                                            {dict?.matches?.powerUps?.doublePointsMatch || 'Double Points Match'}
                                        </div>
                                        <div className="text-orange-300 text-xs">
                                            {isUsingDoublePointsMatch ? '2x Active' : 'Activate 2x'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onToggleDoublePointsMatch(item.matchId)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${isUsingDoublePointsMatch ? 'bg-orange-500 shadow-lg shadow-orange-500/50' : 'bg-slate-700/50'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${isUsingDoublePointsMatch ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Betting Controls */}
                    <div className="bg-slate-900/30 rounded-lg p-2.5 border border-slate-700/50 space-y-2">
                        {/* Stake Input */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {dict?.matches?.stake || 'Stake'}
                                </label>
                                <span className="text-xs text-slate-500">
                                    Min: {COIN_CONSTANTS.MIN_BET}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <motion.input
                                    type="number"
                                    max={walletBalance}
                                    value={item.betAmount || ''}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                                        onUpdateBetAmount(item.matchId, value);
                                    }}
                                    className={`flex-1 px-2.5 py-1.5 text-sm bg-slate-800/50 border rounded-lg text-green-400 font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${!item.betAmount || item.betAmount === 0 ? 'border-yellow-400/60 border-2' : 'border-slate-600'}`}
                                    placeholder="0"
                                    animate={(!item.betAmount || item.betAmount === 0) ? {
                                        boxShadow: ['0 0 0 0 rgba(250, 204, 21, 0.4)', '0 0 10px rgba(250, 204, 21, 0.3)', '0 0 0 0 rgba(250, 204, 21, 0.4)']
                                    } : {}}
                                    transition={{
                                        boxShadow: (!item.betAmount || item.betAmount === 0) ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined
                                    }}
                                />
                                <div className="flex-shrink-0">
                                    <CoinIcon size={16} className="text-yellow-400" />
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-700/50">
                            <div className="text-center p-1.5 bg-slate-800/50 rounded">
                                <div className="text-xs text-slate-400 mb-0.5">{dict?.matches?.odds || 'Odds'}</div>
                                <div className="text-sm font-bold text-purple-400">
                                    {(item.multiplier || 1).toFixed(2)}x
                                </div>
                            </div>
                            <div className="text-center p-1.5 bg-slate-800/50 rounded">
                                <div className="text-xs text-slate-400 mb-0.5">{dict?.matches?.potentialWin || 'Win'}</div>
                                <div className="text-sm font-bold text-green-400 flex items-center justify-center gap-0.5">
                                    {formatWinnings((item.betAmount || 0) * (item.multiplier || 1))} <CoinIcon size={10} />
                                </div>
                            </div>
                            <div className="text-center p-1.5 bg-slate-800/50 rounded">
                                <div className="text-xs text-slate-400 mb-0.5">Points</div>
                                <div className="text-sm font-bold text-blue-400">
                                    +{(() => {
                                        const multiplier = item.multiplier || 1;
                                        let points = 10; // Base points for winning

                                        // Add high odds bonus if multiplier >= 2.0
                                        if (multiplier >= 2.0) {
                                            points += Math.floor(multiplier * 5);
                                        }

                                        return points;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function XIcon() {
    return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
