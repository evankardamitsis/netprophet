'use client';

import { motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { displayName } from './utils';
import { getIndividualBonus, getMaxSetScoresBonus } from './utils';
import type { MatchDetails, PredictionOptions } from './types';

interface SetScoresSectionProps {
    formPredictions: PredictionOptions;
    details: MatchDetails;
    isBestOf5: boolean;
    isAmateurFormat: boolean;
    isDoubles: boolean;
    locked?: boolean;
    showPulse: boolean;
    setsCount: number;
    getSetScore: (setNumber: number) => string;
    getSetWinner: (setNumber: number) => string;
    renderSetScoreDropdown: (setNumber: number, value: string, onChange: (value: string) => void, onFocus?: () => void) => JSX.Element;
    setSetScore: (setNumber: number, value: string) => void;
    onInteraction: () => void;
}

export function SetScoresSection({
    formPredictions,
    details,
    isBestOf5,
    isAmateurFormat,
    isDoubles,
    locked,
    showPulse,
    setsCount,
    getSetScore,
    getSetWinner,
    renderSetScoreDropdown,
    setSetScore,
    onInteraction
}: SetScoresSectionProps) {
    const { dict } = useDictionary();
    const formatLabel = isBestOf5 ? dict?.matches?.bestOf5 || 'Best of 5' : isAmateurFormat ? dict?.matches?.bestOf3SuperTB || 'Best of 3 (Super TB)' : dict?.matches?.bestOf3 || 'Best of 3';

    const setScoresCount = Array.from({ length: setsCount }, (_, i) => getSetScore(i + 1)).filter(s => s).length;
    const maxBonus = setsCount === 2 ? 0.4 : getMaxSetScoresBonus(formPredictions);
    const currentBonus = getIndividualBonus(setScoresCount);
    const displayBonus = setScoresCount > 0 ? currentBonus : maxBonus;

    const predictExactLabel = formPredictions.matchResult
        ? (dict?.matches?.predictExactScore?.replace('{player}', displayName(formPredictions.winner, isDoubles)) || `Predict the exact score for each set. ${displayName(formPredictions.winner, false)} wins all sets.`)
        : '';

    return (
        <motion.div
            ref={undefined}
            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border ${showPulse ? 'border-yellow-400 border-2' : 'border-slate-700/50'}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{dict?.matches?.setScores || 'Set Scores'}</h3>
                    <div className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center space-x-1 transition-all duration-300 ${setScoresCount > 0 ? 'bg-green-600/20 text-green-300 border-green-500/30' : 'bg-slate-700/20 text-slate-400 border-slate-600/30'}`}>
                        <span>+{displayBonus.toFixed(1)}x</span>
                    </div>
                </div>
                <div className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                    {formatLabel}
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
                {setsCount === 2
                    ? (dict?.matches?.predictExactScoreForEachSet || 'Predict the exact score for each set.') + ' (+0.2x each)'
                    : predictExactLabel}
            </p>
            {Array.from({ length: setsCount }, (_, i) => {
                const setWinner = getSetWinner(i + 1);
                return (
                    <div key={i} className="space-y-1.5 mb-2">
                        <h4 className="font-semibold text-white text-xs">
                            Set {i + 1} Score - {displayName(setWinner || formPredictions.winner, false)} {dict?.matches?.wins || 'wins'}
                        </h4>
                        {renderSetScoreDropdown(i + 1, getSetScore(i + 1), (value) => {
                            onInteraction();
                            setSetScore(i + 1, value);
                        }, onInteraction)}
                    </div>
                );
            })}
        </motion.div>
    );
}
