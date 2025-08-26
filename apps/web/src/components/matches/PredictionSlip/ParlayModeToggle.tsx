'use client';

import { motion } from 'framer-motion';

interface ParlayModeToggleProps {
    predictionsCount: number;
    isParlayMode: boolean;
    onToggleParlayMode: () => void;
    dict?: any;
}

export function ParlayModeToggle({
    predictionsCount,
    isParlayMode,
    onToggleParlayMode,
    dict
}: ParlayModeToggleProps) {
    if (predictionsCount < 2) return null;

    return (
        <motion.div
            className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-lg p-3 border-2 border-purple-400 shadow-lg"
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
                        <span className="text-white font-bold text-base">
                            {dict?.matches?.parlayMode || '🎯 Parlay Mode'}
                        </span>
                        <div className="text-white/80 text-xs font-medium">
                            {dict?.matches?.predictionsReadyForParlay?.replace('{count}', predictionsCount.toString()) ||
                                `${predictionsCount} predictions ready for parlay!`}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onToggleParlayMode}
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
            <div className="text-white/90 text-xs font-medium">
                {isParlayMode
                    ? dict?.matches?.parlayBenefits || '💎 Parlay Benefits: Higher rewards, bonus multipliers, and streak boosters!'
                    : dict?.matches?.combineAllPredictions || 'Combine all predictions for massive rewards with bonus multipliers!'
                }
            </div>
        </motion.div>
    );
}

function ParlayIcon() {
    return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    );
}
