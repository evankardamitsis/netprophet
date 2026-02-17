'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { displayName, validateSuperTiebreakScore } from './utils';
import type { MatchDetails, PredictionOptions } from './types';

interface SuperTiebreakSectionProps {
    formPredictions: PredictionOptions;
    details: MatchDetails;
    isDoubles: boolean;
    locked?: boolean;
    showPulse: boolean;
    hasBlurredSuperTiebreak: boolean;
    onPredictionChange: (type: keyof PredictionOptions, value: string) => void;
    onInputInteraction: () => void;
    onBlurSuperTiebreak: () => void;
}

export function SuperTiebreakSection({
    formPredictions,
    details,
    isDoubles,
    locked,
    showPulse,
    hasBlurredSuperTiebreak,
    onPredictionChange,
    onInputInteraction,
    onBlurSuperTiebreak
}: SuperTiebreakSectionProps) {
    const { dict } = useDictionary();
    const superTiebreakScoreCount = formPredictions.superTieBreakScore ? 1 : 0;
    const displayBonus = superTiebreakScoreCount > 0 ? superTiebreakScoreCount * 0.2 : 0.2;
    const isValidScore = !formPredictions.superTieBreakScore || validateSuperTiebreakScore(formPredictions.superTieBreakScore, formPredictions.winner === details.player1.name);

    return (
        <motion.div
            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border ${showPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{dict?.matches?.superTiebreak || 'Super Tiebreak'}</h3>
                    <div className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${superTiebreakScoreCount > 0 ? 'bg-green-600/20 text-green-300 border-green-500/30' : 'bg-slate-700/20 text-slate-400 border-slate-600/30'}`}>
                        <span>+{displayBonus.toFixed(1)}x</span>
                    </div>
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
                {dict?.matches?.superTiebreakDescription || 'Since this is a 2-1 match in amateur format, there will be a 10-point super tiebreak instead of a 3rd set.'}
            </p>

            <div className="space-y-2 mb-3">
                <h4 className="font-semibold text-white text-xs">{dict?.matches?.superTiebreakWinner || 'Super Tiebreak Winner'}</h4>
                <p className="text-xs text-gray-400 mb-2">
                    {dict?.matches?.superTiebreakWinnerDescription?.replace('{player}', displayName(formPredictions.winner, isDoubles)) || `The super tiebreak winner must be ${displayName(formPredictions.winner, isDoubles)} to match your overall prediction.`}
                </p>
                <div className="grid grid-cols-1 gap-2">
                    <div className="p-2 rounded-lg border bg-purple-600/20 border-purple-500/30 text-purple-300">
                        <div className="text-sm font-semibold">{displayName(formPredictions.winner, isDoubles)}</div>
                        <div className="text-xs text-purple-400">{dict?.matches?.winsSuperTiebreak || 'Wins super tiebreak (pre-selected)'}</div>
                    </div>
                </div>
            </div>

            {formPredictions.superTieBreakWinner && (
                <div className="space-y-1.5">
                    <h4 className="font-semibold text-white text-xs">
                        {dict?.matches?.superTiebreakScore?.replace('{player}', displayName(formPredictions.winner, isDoubles)) || `Super Tiebreak Score - ${displayName(formPredictions.winner, isDoubles)} ${dict?.matches?.wins || 'wins'}`}
                    </h4>
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">
                            {dict?.matches?.superTiebreakScoreLabel || 'Super Tiebreak Score'}
                            <span className="block text-xs text-gray-500 mt-1">
                                {dict?.matches?.superTiebreakScoreHelper || 'Format: 10-8, 17-15, etc. (Winner must win by 2 points, minimum 10 points to win)'}
                            </span>
                        </label>
                        <input
                            type="text"
                            value={formPredictions.superTieBreakScore || ''}
                            onFocus={onInputInteraction}
                            onChange={(e) => {
                                const value = e.target.value;
                                const invalidPattern = /[^0-9-]/;
                                if (value === '' || (!invalidPattern.test(value) && value.split('-').length <= 2)) {
                                    onPredictionChange('superTieBreakScore', value);
                                }
                            }}
                            onBlur={onBlurSuperTiebreak}
                            placeholder={dict?.matches?.superTiebreakScorePlaceholder || 'e.g., 10-8, 17-15'}
                            disabled={locked}
                            className={`w-full p-3 sm:p-2.5 border rounded-lg text-base sm:text-sm ${locked ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-slate-700/50 border-slate-600/50 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'}`}
                        />
                        {hasBlurredSuperTiebreak && formPredictions.superTieBreakScore && !isValidScore && (
                            <p className="text-xs text-red-500 mt-1">
                                {dict?.matches?.superTiebreakScoreError || 'Invalid score. Winner must have at least 10 points and win by 2 points (e.g., 10-8, 17-15).'}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
