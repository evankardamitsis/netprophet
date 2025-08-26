'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@netprophet/ui';
import { formatWinnings } from '@netprophet/lib';
import { COIN_CONSTANTS } from '@/context/WalletContext';

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
    onToggleDoublePointsMatch
}: PredictionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className={`relative overflow-hidden rounded-xl shadow-md ${isUsingDoublePointsMatch
                ? 'bg-gradient-to-br from-orange-900/20 via-red-900/15 to-yellow-900/10 border-2 border-red-500/50'
                : 'bg-slate-800 border border-slate-700'
                }`}>
                {/* Subtle fire gradient background when Double Points Match is active */}
                {isUsingDoublePointsMatch && (
                    <>
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-yellow-500/5 rounded-xl"
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
                            className="absolute top-2 right-2 text-lg"
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
                <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <div className="text-xs font-semibold text-yellow-200">
                                {item.match.player1.name} vs {item.match.player2.name}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {item.match.tournament || (dict?.matches?.tournament || 'Tournament')}
                            </div>
                        </div>
                        <motion.button
                            onClick={() => onRemovePrediction(item.matchId)}
                            className="text-slate-500 hover:text-red-400 ml-2"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                        >
                            <XIcon />
                        </motion.button>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                        <div className="text-xs">
                            <span className="text-slate-300">{dict?.matches?.pick || 'Pick'}: </span>
                            <span className="font-semibold text-yellow-200">
                                {formatPredictionDisplay(item.prediction)}
                            </span>
                        </div>
                    </div>

                    {/* Double Points Match Power-up */}
                    {hasDoublePointsMatchPowerUp && onToggleDoublePointsMatch && (
                        <div className="mb-2">
                            <div className="flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-2 border border-purple-500/30">
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg">🎯</span>
                                    <div>
                                        <div className="text-white font-semibold text-xs">
                                            Double Points Match
                                        </div>
                                        <div className="text-purple-300 text-xs">
                                            {isUsingDoublePointsMatch
                                                ? 'Double points applied to this match'
                                                : 'Double points for this match'
                                            }
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onToggleDoublePointsMatch(item.matchId)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isUsingDoublePointsMatch ? 'bg-purple-500' : 'bg-purple-700/50'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isUsingDoublePointsMatch ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="flex items-center justify-between w-full space-x-2">
                            <div className="flex flex-col space-y-1">
                                <span className="text-xs text-slate-300">{dict?.matches?.stake || 'Stake'}</span>
                                <div className="flex items-center space-x-1">
                                    <input
                                        type="number"
                                        max={walletBalance}
                                        value={item.betAmount || ''}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                                            onUpdateBetAmount(item.matchId, value);
                                        }}
                                        className="w-16 px-1.5 py-0.5 text-xs bg-slate-700 border border-slate-600 rounded text-green-400 font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                    <span className="text-xs text-slate-400">🌕</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    (min {COIN_CONSTANTS.MIN_BET})
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="text-center">
                                    <div className="text-xs text-slate-400">{dict?.matches?.odds || 'Odds'}</div>
                                    <div className="text-xs font-bold text-purple-400">
                                        {(item.multiplier || 1).toFixed(2)}x
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-400">{dict?.matches?.potentialWin || 'Win'}</div>
                                    <div className="text-xs font-bold text-green-400">
                                        {formatWinnings((item.betAmount || 0) * (item.multiplier || 1))} 🌕
                                    </div>
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
