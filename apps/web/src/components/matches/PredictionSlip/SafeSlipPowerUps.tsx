'use client';

import { motion } from 'framer-motion';

interface SafeSlipPowerUpsProps {
    hasSafeParlayPowerUp: boolean;
    hasSafeSinglePowerUp: boolean;
    isUsingSafeParlay: boolean;
    isUsingSafeSingle: boolean;
    onToggleSafeParlay: () => void;
    onToggleSafeSingle: () => void;
    predictionsCount: number;
    isParlayMode: boolean;
    dict: any;
}

export function SafeSlipPowerUps({
    hasSafeParlayPowerUp,
    hasSafeSinglePowerUp,
    isUsingSafeParlay,
    isUsingSafeSingle,
    onToggleSafeParlay,
    onToggleSafeSingle,
    predictionsCount,
    isParlayMode,
    dict
}: SafeSlipPowerUpsProps) {
    // Only show if there's a power-up available for the current mode
    const hasRelevantPowerUp = (isParlayMode && hasSafeParlayPowerUp) || (!isParlayMode && hasSafeSinglePowerUp);
    if (!hasRelevantPowerUp) return null;

    return (
        <motion.div
            className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-3 border-2 border-emerald-400 shadow-lg"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        >
            <div className="space-y-2">
                {/* Safe Single Slip */}
                {hasSafeSinglePowerUp && predictionsCount >= 1 && !isParlayMode && (
                    <div className="flex items-center justify-between bg-emerald-700/30 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold text-sm">{dict.matches.powerUps.safeSingleSlip}</span>
                            <span className="text-emerald-100 text-xs font-medium">{dict.matches.powerUps.surviveOneWrongPick}</span>
                        </div>
                        <button
                            onClick={onToggleSafeSingle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isUsingSafeSingle ? 'bg-emerald-500' : 'bg-emerald-700/50'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isUsingSafeSingle ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                )}

                {/* Safe Parlay Slip */}
                {hasSafeParlayPowerUp && predictionsCount >= 2 && isParlayMode && (
                    <div className="flex items-center justify-between bg-blue-700/30 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold text-sm">{dict.matches.powerUps.safeParlaySlip}</span>
                            <span className="text-blue-100 text-xs font-medium">{dict.matches.powerUps.surviveOneWrongPickParlay}</span>
                        </div>
                        <button
                            onClick={onToggleSafeParlay}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isUsingSafeParlay ? 'bg-blue-500' : 'bg-blue-700/50'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isUsingSafeParlay ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                )}
            </div>

            {(isUsingSafeSingle || isUsingSafeParlay) && (
                <div className="mt-2 text-white text-xs font-medium text-center">
                    {dict.matches.powerUps.powerUpWillBeConsumed}
                </div>
            )}
        </motion.div>
    );
}
