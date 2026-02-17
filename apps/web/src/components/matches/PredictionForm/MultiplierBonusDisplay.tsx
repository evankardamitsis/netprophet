'use client';

import { useDictionary } from '@/context/DictionaryContext';

interface MultiplierBonusDisplayProps {
    baseOdds: number;
    bonusMultiplier: number;
    currentMultiplier: number;
}

export function MultiplierBonusDisplay({ baseOdds, bonusMultiplier, currentMultiplier }: MultiplierBonusDisplayProps) {
    const { dict } = useDictionary();

    if (bonusMultiplier <= 0) return null;

    return (
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-lg p-2 border border-green-500/30 mb-2 z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs sm:text-sm font-semibold text-green-300">
                        {dict?.matches?.multiplierBonus || 'Multiplier Bonus'}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-400">
                        {dict?.matches?.baseOdds || 'Base'}: {baseOdds.toFixed(2)}x
                    </span>
                    <span className="text-sm sm:text-lg font-bold text-green-300">
                        +{bonusMultiplier.toFixed(2)}x
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-green-200">
                        = {currentMultiplier.toFixed(2)}x
                    </span>
                </div>
            </div>
        </div>
    );
}
