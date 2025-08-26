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
}

export function SafeSlipPowerUps({
    hasSafeParlayPowerUp,
    hasSafeSinglePowerUp,
    isUsingSafeParlay,
    isUsingSafeSingle,
    onToggleSafeParlay,
    onToggleSafeSingle,
    predictionsCount,
    isParlayMode
}: SafeSlipPowerUpsProps) {
    if (!hasSafeParlayPowerUp && !hasSafeSinglePowerUp) return null;

    return (
        <motion.div
            className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-3 border-2 border-emerald-400 shadow-lg"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-full">
                        <ShieldIcon />
                    </div>
                    <div>
                        <span className="text-white font-bold text-base">🛡️ Safe Slip Power-ups</span>
                        <div className="text-white/80 text-xs font-medium">
                            Protect your predictions from one wrong pick!
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {/* Safe Single Slip */}
                {hasSafeSinglePowerUp && predictionsCount >= 1 && (
                    <div className="flex items-center justify-between bg-emerald-700/30 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-emerald-300 text-sm">🛡️ Safe Single Slip</span>
                            <span className="text-emerald-200 text-xs">Survive 1 wrong pick</span>
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
                            <span className="text-blue-300 text-sm">🛡️ Safe Parlay Slip</span>
                            <span className="text-blue-200 text-xs">Survive 1 wrong pick in parlay</span>
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
                <div className="mt-2 text-emerald-200 text-xs text-center">
                    ⚡ Power-up will be consumed when bet is placed
                </div>
            )}
        </motion.div>
    );
}

function ShieldIcon() {
    return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}
