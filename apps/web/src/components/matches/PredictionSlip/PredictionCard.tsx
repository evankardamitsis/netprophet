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
}

export function PredictionCard({
    item,
    index,
    isParlayMode,
    walletBalance,
    onRemovePrediction,
    onUpdateBetAmount,
    formatPredictionDisplay,
    dict
}: PredictionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className="bg-slate-800 border border-slate-700 rounded-xl shadow-md">
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

                    <div className="flex justify-between items-center">
                        {!isParlayMode && (
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
                        )}
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
