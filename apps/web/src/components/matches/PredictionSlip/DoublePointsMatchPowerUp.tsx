'use client';

import { motion } from 'framer-motion';

interface DoublePointsMatchPowerUpProps {
    hasDoublePointsMatchPowerUp: boolean;
    isUsingDoublePointsMatch: boolean;
    onToggleDoublePointsMatch: () => void;
    predictionsCount: number;
}

export function DoublePointsMatchPowerUp({
    hasDoublePointsMatchPowerUp,
    isUsingDoublePointsMatch,
    onToggleDoublePointsMatch,
    predictionsCount
}: DoublePointsMatchPowerUpProps) {
    if (!hasDoublePointsMatchPowerUp || predictionsCount === 0) return null;

    return (
        <motion.div
            className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-3 border border-purple-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">🎯</span>
                    <div>
                        <div className="text-white font-semibold text-sm">
                            Double Points Match
                        </div>
                        <div className="text-purple-300 text-xs">
                            Double your points for this match
                        </div>
                    </div>
                </div>
                <button
                    onClick={onToggleDoublePointsMatch}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isUsingDoublePointsMatch ? 'bg-purple-500' : 'bg-purple-700/50'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isUsingDoublePointsMatch ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>
        </motion.div>
    );
}
